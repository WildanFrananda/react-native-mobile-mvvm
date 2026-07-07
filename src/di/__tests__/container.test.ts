import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { container, injectable, inject } from 'tsyringe';
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

// Undecorated class with an OPTIONAL constructor param — it never opted into DI,
// so it must fall back to `new` (constructor arity alone must not force a throw).
class NeedsArgs {
  constructor(public dep?: string) {}
}

// Decorated class whose injected dependency token is never registered — a real
// DI misconfiguration that must surface, not be masked by a `new` fallback.
@injectable()
class NeedsMissingDep {
  constructor(@inject('MissingToken') public dep: unknown) {}
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

    it('falls back to `new` for an undecorated class with an optional param', () => {
      // NeedsArgs declares an optional constructor param but never opted into DI
      // (no decorator). It must NOT throw just because it has a parameter — it
      // falls back to `new`, leaving the optional dependency undefined.
      const instance = createViewModelInstance(NeedsArgs);

      expect(instance).toBeInstanceOf(NeedsArgs);
      expect(instance.dep).toBeUndefined();
    });

    it('rethrows when a DI-decorated class has an unresolvable dependency', () => {
      // NeedsMissingDep is @injectable with an @inject token that is not
      // registered. This is a real DI misconfiguration and must surface rather
      // than silently construct with `undefined` dependencies.
      expect(() => createViewModelInstance(NeedsMissingDep)).toThrow();
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
