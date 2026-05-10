import { Observable, Subject } from 'rxjs';

/**
 * EventFlow<T> — Fire-and-forget event stream. Does NOT replay to new subscribers.
 *
 * Direct analogies:
 * - `SharedFlow(replay=0)` / `Channel` in Kotlin/Compose
 * - `StreamController` (one-shot) in Flutter
 * - `PassthroughSubject` in SwiftUI/Combine
 *
 * Use this for one-time events that should NOT be re-delivered on subscription:
 * navigation, snackbars, dialogs, toasts.
 *
 * Use `StateFlow` instead if the UI needs the last value on subscribe (isLoading, formData, etc).
 *
 * Usage pattern inside a ViewModel:
 * ```ts
 * class CheckoutViewModel extends ViewModel {
 *   private _navigateTo = new EventFlow<string>();
 *   public readonly navigateTo$ = this._navigateTo.asObservable();
 *
 *   async placeOrder() {
 *     // ...
 *     this._navigateTo.emit('SuccessScreen'); // fire once, done
 *   }
 * }
 * ```
 *
 * In the UI — use `useEvent`, NOT `useStream`:
 * ```tsx
 * useEvent(vm.navigateTo$, useCallback((route) => {
 *   navigation.navigate(route);
 * }, [navigation]));
 * ```
 */
export class EventFlow<T> {
  private readonly _subject = new Subject<T>();

  /**
   * Emits a one-shot event to all current subscribers.
   * New subscribers after this call will NOT receive it.
   *
   * Analogous to `emit()` on a Kotlin `Channel` or `add()` on a Dart `StreamController`.
   */
  emit(value: T): void {
    this._subject.next(value);
  }

  /**
   * Exposes a read-only stream to the UI layer.
   * Analogous to `.asSharedFlow()` in Kotlin or the `stream` getter in Flutter.
   */
  asObservable(): Observable<T> {
    return this._subject.asObservable();
  }

  /**
   * Completes the Subject — called by ViewModel.onCleared() to prevent memory leaks.
   * @internal
   */
  complete(): void {
    if (!this._subject.closed) {
      this._subject.complete();
    }
  }
}
