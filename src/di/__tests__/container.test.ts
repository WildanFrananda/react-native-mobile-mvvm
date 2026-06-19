import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { container } from 'tsyringe';
import {
  createViewModelInstance,
  configureDI,
  getContainer,
} from '../container';

class Plain {
  hello(): string {
    return 'hi';
  }
}

class NeedsArgs {
  constructor(public dep?: string) {}
}

describe('DI container', () => {
  beforeEach(() => {
    container.reset();
  });

  describe('createViewModelInstance', () => {
    it('falls back to `new` for a dependency-free class that is not registered', () => {
      // Plain has no constructor args — the "simple ViewModel without DI" path.
      const instance = createViewModelInstance(Plain);

      expect(instance).toBeInstanceOf(Plain);
    });

    it('rethrows when a class that declares dependencies cannot be resolved', () => {
      // NeedsArgs declares a constructor parameter but is not registered, so
      // resolution fails. Rather than silently `new NeedsArgs()` (producing an
      // instance with `undefined` dependencies), the original error surfaces.
      expect(() => createViewModelInstance(NeedsArgs)).toThrow();
    });

    it('returns the container-resolved instance when the class is registered', () => {
      const sentinel = new Plain();
      container.register(Plain, { useValue: sentinel });

      const instance = createViewModelInstance(Plain);

      expect(instance).toBe(sentinel); // came from the container, not `new`
    });
  });

  describe('configureDI', () => {
    it('invokes the setup callback exactly once', () => {
      const setup = jest.fn();
      configureDI(setup);
      expect(setup).toHaveBeenCalledTimes(1);
    });
  });

  describe('getContainer', () => {
    it('is the tsyringe container and can register/resolve tokens', () => {
      expect(getContainer).toBe(container);

      getContainer.register('ApiBaseUrl', { useValue: 'https://api.test' });
      expect(getContainer.resolve('ApiBaseUrl')).toBe('https://api.test');
    });
  });
});
