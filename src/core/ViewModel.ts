import { EMPTY, from, Observable, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { StateFlow } from './StateFlow';
import type { ReadOnlyStateFlow } from './StateFlow';
import { EventFlow } from './EventFlow';

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
   * Guards against clear() running its teardown more than once. Without this,
   * a double clear() (manual call, or a re-used instance) would re-invoke the
   * user's `onCleared()` hook a second time.
   */
  private _cleared = false;

  /**
   * @internal
   * Called automatically by the framework when the ViewModel is no longer needed.
   * This handles the core cleanup logic and calls the user-provided `onCleared()`.
   *
   * Idempotent — calling it more than once is a no-op after the first call.
   */
  clear(): void {
    if (this._cleared) {
      return;
    }
    this._cleared = true;

    // 1. Cancel all in-flight fetch requests.
    if (!this.abortController.signal.aborted) {
      this.abortController.abort();
    }

    // 2. Emit the destroy signal so every `takeUntil(this.destroy$)` pipeline
    //    (including reactTo) completes.
    if (!this._destroy$.closed) {
      this._destroy$.next();
      this._destroy$.complete();
    }

    // 3. Complete the StateFlow/EventFlow instances this ViewModel owns so that
    //    direct subscribers receive completion. Discovered by inspecting the
    //    instance's OWN enumerable fields — flows held indirectly (in an array,
    //    Map, Set, nested object, or exposed only via a getter) are not found
    //    and must be completed manually in `onCleared()`.
    for (const value of Object.values(this)) {
      if (value instanceof StateFlow || value instanceof EventFlow) {
        value.complete();
      }
    }

    // 4. Run the user cleanup hook LAST, after framework-managed subscriptions
    //    and fetches have already been torn down. Guard it so a throwing
    //    onCleared() cannot abort framework teardown — critical inside
    //    ViewModelScope, where one throwing hook would otherwise leave every
    //    sibling ViewModel in the scope uncleared.
    try {
      this.onCleared();
    } catch (error) {
      console.error(error);
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
   *
   * `AbortError`s (from cancellation) are silently ignored. Any other error is
   * routed to `onError` instead of being re-thrown, because `launch()` is
   * fire-and-forget (callers do not `await` it) and a re-thrown error would
   * become an unhandled promise rejection. By default it is logged; pass an
   * `onError` handler to surface it in UiState, a snackbar, crash reporting, etc.
   *
   * @param task     - The async task. Receives the ViewModel's `AbortSignal`.
   * @param onError  - Called with any non-Abort error thrown by `task`.
   *                   Defaults to `console.error`.
   */
  protected async launch(
    task: (signal: AbortSignal) => Promise<void>,
    onError: (error: unknown) => void = (error) => console.error(error),
  ): Promise<void> {
    try {
      await task(this.abortController.signal);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        onError(e);
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
   * If a single handler invocation throws or rejects, the error is routed to
   * `onError` (default: `console.error`) and the reactor stays alive — a later
   * value will still be handled. Without this, one rejected `fetch()` would
   * terminate the whole subscription and produce an unhandled rejection.
   *
   * @param source      - The `ReadOnlyStateFlow<T>` or `Observable<T>` to observe
   * @param debounceMs  - Milliseconds to wait after the last change. Use `0` to skip debouncing.
   * @param handler     - Called with the latest value. Previous call is cancelled if a new
   *                      value arrives before it finishes.
   * @param onError     - Called with any error thrown/rejected by `handler`.
   *                      Defaults to `console.error`. The reactor is NOT torn down.
   */
  protected reactTo<T>(
    source: ReadOnlyStateFlow<T> | Observable<T>,
    debounceMs: number,
    handler: (value: T) => void | Promise<void>,
    onError: (error: unknown) => void = (error) => console.error(error),
  ): void {
    const observable$ =
      'asObservable' in source ? source.asObservable() : source;

    observable$
      .pipe(
        debounceTime(debounceMs),
        distinctUntilChanged(),
        switchMap((value: T) => {
          // Invoke the handler synchronously (preserving its timing), but catch
          // both synchronous throws and async rejections HERE — inside the
          // switchMap projection — so a failure cancels only this invocation
          // and never tears down the outer source subscription.
          let result: void | Promise<void>;
          try {
            result = handler(value);
          } catch (error) {
            onError(error);
            return EMPTY;
          }
          if (!(result instanceof Promise)) {
            return EMPTY;
          }
          return from(result).pipe(
            catchError((error) => {
              onError(error);
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
