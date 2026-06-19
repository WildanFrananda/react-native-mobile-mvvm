import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { Observable, Subject } from 'rxjs';
import { ViewModel } from '../ViewModel';
import { StateFlow } from '../StateFlow';
import { EventFlow } from '../EventFlow';
import type { ReadOnlyStateFlow } from '../StateFlow';

/**
 * Test double exposing the protected surface of ViewModel so the framework
 * contract (lifecycle, launch, reactTo) can be exercised directly.
 */
class TestViewModel extends ViewModel {
  onClearedCalls = 0;

  protected onCleared(): void {
    this.onClearedCalls += 1;
  }

  get destroy$$(): Observable<void> {
    return this.destroy$;
  }

  get controller(): AbortController {
    return this.abortController;
  }

  runLaunch(
    task: (signal: AbortSignal) => Promise<void>,
    onError?: (error: unknown) => void,
  ): Promise<void> {
    return this.launch(task, onError);
  }

  runReactTo<T>(
    source: ReadOnlyStateFlow<T> | Observable<T>,
    debounceMs: number,
    handler: (value: T) => void | Promise<void>,
    onError?: (error: unknown) => void,
  ): void {
    this.reactTo(source, debounceMs, handler, onError);
  }
}

describe('ViewModel', () => {
  describe('clear() lifecycle', () => {
    it('emits and completes destroy$ on clear', () => {
      const vm = new TestViewModel();
      const next = jest.fn();
      const complete = jest.fn();
      vm.destroy$$.subscribe({ next, complete });

      vm.clear();

      expect(next).toHaveBeenCalledTimes(1);
      expect(complete).toHaveBeenCalledTimes(1);
    });

    it('aborts the AbortController on clear', () => {
      const vm = new TestViewModel();
      expect(vm.controller.signal.aborted).toBe(false);

      vm.clear();
      expect(vm.controller.signal.aborted).toBe(true);
    });

    it('invokes the onCleared() hook', () => {
      const vm = new TestViewModel();
      vm.clear();
      expect(vm.onClearedCalls).toBe(1);
    });

    it('is idempotent — clear() runs its teardown only once', () => {
      const vm = new TestViewModel();
      expect(() => {
        vm.clear();
        vm.clear();
      }).not.toThrow();
      // onCleared() must not run a second time on a repeated clear().
      expect(vm.onClearedCalls).toBe(1);
    });

    it('defaults onCleared() to a no-op when not overridden', () => {
      class Bare extends ViewModel {}
      const vm = new Bare();
      expect(() => vm.clear()).not.toThrow();
    });

    it('completes the StateFlow/EventFlow instances it owns', () => {
      class FlowVM extends ViewModel {
        readonly count = new StateFlow(0);
        readonly events = new EventFlow<string>();
      }
      const vm = new FlowVM();
      const stateComplete = jest.fn();
      const eventComplete = jest.fn();
      vm.count.asObservable().subscribe({ complete: stateComplete });
      vm.events.asObservable().subscribe({ complete: eventComplete });

      vm.clear();

      expect(stateComplete).toHaveBeenCalledTimes(1);
      expect(eventComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('launch()', () => {
    it('runs the task with the ViewModel AbortSignal', async () => {
      const vm = new TestViewModel();
      let received: AbortSignal | undefined;

      await vm.runLaunch(async (signal) => {
        received = signal;
      });

      expect(received).toBe(vm.controller.signal);
    });

    it('swallows AbortError so cancellation is silent', async () => {
      const vm = new TestViewModel();

      await expect(
        vm.runLaunch(async () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          throw err;
        }),
      ).resolves.toBeUndefined();
    });

    it('routes non-abort errors to onError instead of rejecting', async () => {
      const vm = new TestViewModel();
      const onError = jest.fn();

      // Fire-and-forget usage: must NOT reject (which would be an unhandled
      // rejection), and must report the error via the handler.
      await expect(
        vm.runLaunch(async () => {
          throw new Error('boom');
        }, onError),
      ).resolves.toBeUndefined();

      expect(onError).toHaveBeenCalledTimes(1);
      expect((onError.mock.calls[0]![0] as Error).message).toBe('boom');
    });

    it('logs non-abort errors via console.error when no onError is given', async () => {
      const vm = new TestViewModel();
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await expect(
        vm.runLaunch(async () => {
          throw new Error('boom');
        }),
      ).resolves.toBeUndefined();

      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('reactTo()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debounces and delivers only the latest value', () => {
      const vm = new TestViewModel();
      const source = new StateFlow(0);
      const handler = jest.fn<(value: number) => void>();

      vm.runReactTo(source, 100, handler);

      source.value = 1;
      source.value = 2;
      source.value = 3;
      expect(handler).not.toHaveBeenCalled(); // still within debounce window

      jest.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(3);
    });

    it('suppresses consecutive duplicate values (distinctUntilChanged)', () => {
      const vm = new TestViewModel();
      const source = new Subject<string>();
      const handler = jest.fn<(value: string) => void>();

      vm.runReactTo(source, 50, handler);

      source.next('a');
      jest.advanceTimersByTime(50);
      source.next('a'); // duplicate
      jest.advanceTimersByTime(50);
      source.next('b');
      jest.advanceTimersByTime(50);

      expect(handler.mock.calls).toEqual([['a'], ['b']]);
    });

    it('stops handling after the ViewModel is cleared (takeUntil destroy$)', () => {
      const vm = new TestViewModel();
      const source = new Subject<number>();
      const handler = jest.fn<(value: number) => void>();

      vm.runReactTo(source, 10, handler);

      source.next(1);
      jest.advanceTimersByTime(10);
      expect(handler).toHaveBeenCalledTimes(1);

      vm.clear();
      source.next(2);
      jest.advanceTimersByTime(10);
      expect(handler).toHaveBeenCalledTimes(1); // pipe completed, no further calls
    });

    it('accepts a plain Observable source (no asObservable)', () => {
      const vm = new TestViewModel();
      const source = new Observable<number>((subscriber) => {
        subscriber.next(7);
      });
      const handler = jest.fn<(value: number) => void>();

      vm.runReactTo(source, 10, handler);
      jest.advanceTimersByTime(10);

      expect(handler).toHaveBeenCalledWith(7);
    });

    it('supports async handlers', () => {
      const vm = new TestViewModel();
      const source = new Subject<number>();
      const seen: number[] = [];
      const handler = jest.fn<(value: number) => Promise<void>>(async (v) => {
        seen.push(v);
      });

      vm.runReactTo(source, 10, handler);
      source.next(5);
      jest.advanceTimersByTime(10);

      expect(handler).toHaveBeenCalledWith(5);
      expect(seen).toEqual([5]);
    });

    it('keeps reacting after a handler throws (routes the error to onError)', () => {
      const vm = new TestViewModel();
      const source = new Subject<number>();
      const onError = jest.fn<(error: unknown) => void>();
      const seen: number[] = [];
      const handler = jest.fn<(value: number) => void>((v) => {
        if (v === 1) {
          throw new Error('handler boom');
        }
        seen.push(v);
      });

      vm.runReactTo(source, 10, handler, onError);

      source.next(1);
      jest.advanceTimersByTime(10);
      source.next(2);
      jest.advanceTimersByTime(10);

      expect(onError).toHaveBeenCalledTimes(1);
      expect((onError.mock.calls[0]![0] as Error).message).toBe('handler boom');
      expect(seen).toEqual([2]); // the reactor survived the first handler error
    });

    it('keeps reacting after an async handler rejects (routes to onError)', async () => {
      // Real timers so the rejected-promise microtask actually settles.
      jest.useRealTimers();
      const vm = new TestViewModel();
      const source = new Subject<number>();
      const onError = jest.fn<(error: unknown) => void>();
      const seen: number[] = [];
      const handler = async (v: number): Promise<void> => {
        if (v === 1) {
          throw new Error('async boom');
        }
        seen.push(v);
      };

      vm.runReactTo(source, 0, handler, onError);

      source.next(1);
      await new Promise((resolve) => setTimeout(resolve, 5));
      source.next(2);
      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(onError).toHaveBeenCalledTimes(1);
      expect((onError.mock.calls[0]![0] as Error).message).toBe('async boom');
      expect(seen).toEqual([2]); // outer subscription survived the rejection
    });

    it('logs handler errors via console.error when no onError is given', () => {
      const vm = new TestViewModel();
      const source = new Subject<number>();
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      vm.runReactTo(source, 10, () => {
        throw new Error('handler boom');
      });

      source.next(1);
      jest.advanceTimersByTime(10);

      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });
});
