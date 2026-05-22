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

  runLaunch(task: (signal: AbortSignal) => Promise<void>): Promise<void> {
    return this.launch(task);
  }

  runReactTo<T>(
    source: ReadOnlyStateFlow<T> | Observable<T>,
    debounceMs: number,
    handler: (value: T) => void | Promise<void>,
  ): void {
    this.reactTo(source, debounceMs, handler);
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

    it('is safe to call clear() more than once', () => {
      const vm = new TestViewModel();
      expect(() => {
        vm.clear();
        vm.clear();
      }).not.toThrow();
    });

    it('defaults onCleared() to a no-op when not overridden', () => {
      class Bare extends ViewModel {}
      const vm = new Bare();
      expect(() => vm.clear()).not.toThrow();
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

    it('rethrows non-abort errors', async () => {
      const vm = new TestViewModel();

      await expect(
        vm.runLaunch(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
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
  });
});
