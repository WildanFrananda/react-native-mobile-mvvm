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
    it('falls back to `new` when the class cannot be resolved from the container', () => {
      // NeedsArgs has a constructor arg and is not registered/decorated, so
      // tsyringe resolution throws and the fallback `new NeedsArgs()` is used.
      const instance = createViewModelInstance(NeedsArgs);

      expect(instance).toBeInstanceOf(NeedsArgs);
      expect(instance.dep).toBeUndefined();
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
