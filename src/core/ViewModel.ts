import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import type { StateFlow } from './StateFlow';

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
 * automatically cancelled when `onCleared()` is called (e.g. the component
 * unmounts before the response arrives):
 *
 * ```ts
 * const data = await fetch('/api', { signal: this.abortController.signal });
 * ```
 *
 * ### 3. `onCleared()` — Automatic Cleanup
 * Called automatically by `useViewModel` when the component unmounts.
 * Can be overridden to perform custom resource cleanup:
 *
 * ```ts
 * override onCleared() {
 *   super.onCleared(); // MUST be called
 *   this.database.close();
 * }
 * ```
 *
 * ## Full Usage Example
 *
 * ```ts
 * import { ViewModel, StateFlow } from 'react-native-mobile-mvvm';
 * import { takeUntil } from 'rxjs/operators';
 *
 * export class LoginViewModel extends ViewModel {
 *   private _isLoading = new StateFlow<boolean>(false);
 *   private _error = new StateFlow<string | null>(null);
 *
 *   public readonly isLoading$ = this._isLoading.asObservable();
 *   public readonly error$ = this._error.asObservable();
 *
 *   async performLogin(email: string, password: string) {
 *     this._isLoading.value = true;
 *     this._error.value = null;
 *     try {
 *       // abortController.signal automatically cancels if the UI unmounts
 *       // before the response arrives — no more stale API calls!
 *       const res = await fetch('/api/login', {
 *         method: 'POST',
 *         signal: this.abortController.signal,
 *         body: JSON.stringify({ email, password }),
 *       });
 *       const data = await res.json();
 *       // handle success...
 *     } catch (e) {
 *       if ((e as Error).name !== 'AbortError') {
 *         this._error.value = (e as Error).message;
 *       }
 *     } finally {
 *       this._isLoading.value = false;
 *     }
 *   }
 *
 *   override onCleared() {
 *     super.onCleared();
 *     console.log('LoginViewModel disposed — just like dispose() in Flutter!');
 *   }
 * }
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
   * Solves the "stale API call" problem that commonly occurs in React Native
   * when using `useEffect` without a proper cleanup function.
   */
  protected readonly abortController: AbortController = new AbortController();

  /**
   * Called automatically by `useViewModel` when the React component unmounts.
   *
   * Subclasses MAY override this method for custom cleanup,
   * but **MUST** call `super.onCleared()` to ensure the
   * `destroy$` signal and `abortController` are properly finalized.
   *
   * Analogous to `onCleared()` in Android ViewModel or `dispose()` in Flutter.
   */
  onCleared(): void {
    // 1. Cancel all in-flight fetch requests
    if (!this.abortController.signal.aborted) {
      this.abortController.abort();
    }

    // 2. Emit the destroy signal to all RxJS streams using takeUntil(this.destroy$)
    if (!this._destroy$.closed) {
      this._destroy$.next();
      this._destroy$.complete();
    }
  }

  /**
   * reactTo — React to state changes with debounce and automatic cancellation.
   *
   * Sugar for the search/debounce pattern. Internally composes the
   * canonical RxJS pipeline so you don't have to:
   *
   * ```ts
   * stateFlow.subject
   *   .pipe(
   *     debounceTime(debounceMs),
   *     distinctUntilChanged(),
   *     switchMap((value) => Promise.resolve(handler(value))),
   *     takeUntil(this.destroy$),
   *   )
   *   .subscribe();
   * ```
   *
   * `switchMap` cancels the previous handler if a new value arrives before it
   * resolves — preventing stale results from slow async operations.
   *
   * ## Usage
   *
   * ### Search with debounce (most common pattern)
   *
   * ```ts
   * export class SearchViewModel extends ViewModel {
   *   private _query   = new StateFlow<string>('');
   *   private _results = new StateFlow<Product[]>([]);
   *
   *   public readonly query$   = this._query.asObservable();
   *   public readonly results$ = this._results.asObservable();
   *
   *   constructor() {
   *     super();
   *     // ✅ One call — debounce + dedup + cancel + cleanup all handled
   *     this.reactTo(this._query, 300, async (q) => {
   *       this._results.value = await productApi.search(q);
   *     });
   *   }
   *
   *   onQueryChanged(q: string) { this._query.value = q; }
   * }
   * ```
   *
   * ### Immediate reaction — no debounce, but still cancels stale calls
   *
   * ```ts
   * this.reactTo(this._selectedTab, 0, (tab) => this.loadTabContent(tab));
   * ```
   *
   * @param stateFlow   - The `StateFlow<T>` to observe
   * @param debounceMs  - Milliseconds to wait after the last change. Use `0` to skip debouncing.
   * @param handler     - Called with the latest value. Previous call is cancelled if a new
   *                      value arrives before it finishes (equivalent to `collectLatest`).
   */
  protected reactTo<T>(
    stateFlow: StateFlow<T>,
    debounceMs: number,
    handler: (value: T) => void | Promise<void>,
  ): void {
    stateFlow.subject
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
