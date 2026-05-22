import { describe, it, expect, beforeEach } from '@jest/globals';
import { container, type DependencyContainer } from 'tsyringe';
import {
  Injectable,
  Inject,
  Singleton,
  AutoInjectable,
  Scoped,
  Registry,
} from '../decorators';

// ── Fixtures exercising the decorator aliases ───────────────────────────────

@Injectable()
class Logger {
  log(): string {
    return 'logged';
  }
}

@Injectable()
class Service {
  // Auto constructor injection relies on emitDecoratorMetadata (design:paramtypes).
  constructor(public logger: Logger) {}
}

interface Api {
  ping(): string;
}

@Injectable()
class Consumer {
  constructor(@Inject('Api') public api: Api) {}
}

@Singleton()
class SessionStore {
  readonly id = Math.random();
}

describe('DI decorators', () => {
  let scope: DependencyContainer;

  beforeEach(() => {
    // Child container per test for isolation; decorator metadata still applies.
    scope = container.createChildContainer();
  });

  it('re-exports the tsyringe decorator aliases as functions', () => {
    for (const decorator of [
      Injectable,
      Inject,
      Singleton,
      AutoInjectable,
      Scoped,
      Registry,
    ]) {
      expect(typeof decorator).toBe('function');
    }
  });

  it('@Injectable enables automatic constructor injection by type', () => {
    const service = scope.resolve(Service);

    expect(service.logger).toBeInstanceOf(Logger);
    expect(service.logger.log()).toBe('logged');
  });

  it('@Inject resolves a dependency by string token', () => {
    scope.register<Api>('Api', { useValue: { ping: () => 'pong' } });

    const consumer = scope.resolve(Consumer);

    expect(consumer.api.ping()).toBe('pong');
  });

  it('@Singleton returns the same instance across resolves', () => {
    const first = scope.resolve(SessionStore);
    const second = scope.resolve(SessionStore);

    expect(first).toBe(second);
  });
});
