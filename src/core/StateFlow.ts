import { BehaviorSubject, Observable } from 'rxjs';

/**
 * StateFlow<T> — Reactive state wrapper built on top of RxJS BehaviorSubject.
 *
 * Direct analogies:
 * - `MutableStateFlow<T>` in Kotlin/Compose
 * - `BehaviorSubject<T>` in RxDart/Flutter
 * - `@State` / `@Published` in SwiftUI
 *
 * Usage pattern inside a ViewModel:
 * ```ts
 * class CounterViewModel extends ViewModel {
 *   private _count = new StateFlow<number>(0);
 *
 *   // Expose a read-only stream to the UI
 *   public readonly count$ = this._count.asObservable();
 *
 *   increment() {
 *     this._count.value += 1; // Safe mutation — UI re-renders automatically
 *   }
 * }
 * ```
 */
export class StateFlow<T> {
  private readonly _subject: BehaviorSubject<T>;

  constructor(initialValue: T) {
    this._subject = new BehaviorSubject<T>(initialValue);
  }

  /**
   * Reads the current state value synchronously.
   * Analogous to `.value` on `StateFlow` in Kotlin.
   */
  get value(): T {
    return this._subject.getValue();
  }

  /**
   * Mutates the state. All subscribers (including `useStream`) will
   * automatically receive the new value and trigger a re-render.
   */
  set value(newValue: T) {
    this._subject.next(newValue);
  }

  /**
   * Exposes a **read-only** stream to the UI layer.
   * The UI cannot call `.next()` directly — all mutations must go through the ViewModel.
   *
   * Analogous to `.asStateFlow()` in Kotlin or the `stream` getter in Flutter.
   */
  asObservable(): Observable<T> {
    return this._subject.asObservable();
  }

  /**
   * Direct access to the underlying BehaviorSubject for internal ViewModel use
   * (e.g. `takeUntil`, `combineLatest`). Not intended for UI consumers.
   *
   * @internal
   */
  get subject(): BehaviorSubject<T> {
    return this._subject;
  }

  /**
   * Completes the Subject — called by ViewModel.onCleared()
   * to prevent memory leaks.
   *
   * @internal
   */
  complete(): void {
    if (!this._subject.closed) {
      this._subject.complete();
    }
  }
}
