import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import type { ReadOnlyStateFlow } from './StateFlow';

/**
 * ViewModel — Abstract base class for all ViewModels in the application.
 *
 * Direct analogies:
 * - `ViewModel` + `viewModelScope` in Android/Compose
 * - `ChangeNotifier` + `dispose()` in Flutter
 * - `ObservableObject` in SwiftUI
 *
 * ## Core Features
 *
 * ### 1. `destroy$` — Lifecycle Signal
 * An Observable that emits `void` exactly when the React component unmounts.
 * Use `takeUntil(this.destroy$)` to auto-cancel all RxJS subscriptions:
 *
 * ```ts
 * someObservable$
 *   .pipe(takeUntil(this.destroy$))
 *   .subscribe(...);
 * ```
 *
 * ### 2. `abortController` — Automatic Fetch Cancellation
 * Provides a signal to `fetch()` so that in-flight network requests are
 * automatically cancelled when the ViewModel is cleared.
 *
 * ### 3. `launch()` — Scoped Async Tasks
 * Helper for running async tasks that are automatically cancelled on unmount.
 *
 * ```ts
 * this.launch(async (signal) => {
 *   const res = await fetch('/api', { signal });
 *   // ...
 * });
 * ```
 */
export abstract class ViewModel {
  /**
   * Internal Subject — not exposed directly to subclasses.
   * Subclasses should only use the read-only `destroy$` Observable.
   */
  private readonly _destroy$ = new Subject<void>();

  /**
   * Stream that emits `void` exactly when the ViewModel is cleared.
   * Use `takeUntil(this.destroy$)` to auto-cancel subscriptions.
   *
   * Analogous to `viewModelScope` in Android — all coroutines launched
   * within the scope are automatically cancelled when the ViewModel clears.
   */
  protected readonly destroy$: Observable<void> =
    this._destroy$.asObservable();

  /**
   * AbortController for automatically cancelling `fetch()` requests
   * when the component unmounts.
   *
   * Solves the "stale API call" problem that commonly occurs in React Native.
   */
  protected readonly abortController: AbortController = new AbortController();

  /**
   * @internal
   * Called automatically by the framework when the ViewModel is no longer needed.
   * This handles the core cleanup logic and calls the user-provided `onCleared()`.
   */
  clear(): void {
    // 1. Call user-provided cleanup hook
    this.onCleared();

    // 2. Cancel all in-flight fetch requests
    if (!this.abortController.signal.aborted) {
      this.abortController.abort();
    }

    // 3. Emit the destroy signal to all RxJS streams using takeUntil(this.destroy$)
    if (!this._destroy$.closed) {
      this._destroy$.next();
      this._destroy$.complete();
    }
  }

  /**
   * Override this method to perform custom cleanup when the ViewModel is cleared.
   *
   * Unlike standard React cleanup, you don't need to call `super.onCleared()`
   * here because the framework handles the core cleanup (aborting requests,
   * completing streams) in the internal `clear()` method.
   *
   * Analogous to `onCleared()` in Android ViewModel or `dispose()` in Flutter.
   */
  protected onCleared(): void {
    // Default implementation is empty.
  }

  /**
   * launch — Helper for running asynchronous tasks with automatic cancellation.
   *
   * Analogous to `viewModelScope.launch` in Android.
   * Receives an `AbortSignal` that is triggered when the ViewModel is cleared.
   */
  protected async launch(
    task: (signal: AbortSignal) => Promise<void>,
  ): Promise<void> {
    try {
      await task(this.abortController.signal);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        throw e;
      }
    }
  }

  /**
   * reactTo — React to state changes with debounce and automatic cancellation.
   *
   * Sugar for the search/debounce pattern. Internally composes the
   * canonical RxJS pipeline so you don't have to.
   *
   * `switchMap` cancels the previous handler if a new value arrives before it
   * resolves — preventing stale results (equivalent to `collectLatest`).
   *
   * @param source      - The `ReadOnlyStateFlow<T>` or `Observable<T>` to observe
   * @param debounceMs  - Milliseconds to wait after the last change. Use `0` to skip debouncing.
   * @param handler     - Called with the latest value. Previous call is cancelled if a new
   *                      value arrives before it finishes.
   */
  protected reactTo<T>(
    source: ReadOnlyStateFlow<T> | Observable<T>,
    debounceMs: number,
    handler: (value: T) => void | Promise<void>,
  ): void {
    const observable$ =
      'asObservable' in source ? source.asObservable() : source;

    observable$
      .pipe(
        debounceTime(debounceMs),
        distinctUntilChanged(),
        switchMap((value: T) => {
          const result = handler(value);
          return result instanceof Promise ? result : Promise.resolve(result);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
