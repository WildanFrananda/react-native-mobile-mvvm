import { BehaviorSubject, Observable } from 'rxjs';

/**
 * ReadOnlyStateFlow<T> — A read-only version of StateFlow.
 * Allows synchronous access to the current value and observing changes via an Observable.
 */
export interface ReadOnlyStateFlow<T> {
  /**
   * Reads the current state value synchronously.
   */
  readonly value: T;

  /**
   * Exposes a read-only stream to the UI layer.
   */
  asObservable(): Observable<T>;
}

/**
 * StateFlow<T> — Reactive state wrapper built on top of RxJS BehaviorSubject.
 *
 * Direct analogies:
 * - `MutableStateFlow<T>` in Kotlin/Compose
 * - `BehaviorSubject<T>` in RxDart/Flutter
 * - `@State` / `@Published` in SwiftUI
 *
 * Like Kotlin's `StateFlow`, this only emits when the value actually changes.
 * By default uses `Object.is` (reference equality). Pass a custom `isEqual`
 * function for structural/deep equality on objects.
 *
 * Usage pattern inside a ViewModel:
 * ```ts
 * class CounterViewModel extends ViewModel {
 *   private _count = new StateFlow<number>(0);
 *
 *   // Expose a read-only stream to the UI
 *   public readonly count$: ReadOnlyStateFlow<number> = this._count;
 *
 *   increment() {
 *     this._count.value += 1; // Safe mutation — UI re-renders automatically
 *   }
 * }
 * ```
 */
export class StateFlow<T> implements ReadOnlyStateFlow<T> {
  private readonly _subject: BehaviorSubject<T>;
  private readonly _isEqual: (a: T, b: T) => boolean;

  constructor(
    initialValue: T,
    isEqual: (a: T, b: T) => boolean = Object.is,
  ) {
    this._subject = new BehaviorSubject<T>(initialValue);
    this._isEqual = isEqual;
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
    if (!this._isEqual(this._subject.getValue(), newValue)) {
      this._subject.next(newValue);
    }
  }

  /**
   * Exposes the StateFlow as a read-only version.
   * Analogous to `.asStateFlow()` in Kotlin.
   */
  asReadOnly(): ReadOnlyStateFlow<T> {
    return this;
  }

  /**
   * Exposes a **read-only** stream to the UI layer.
   * The UI cannot call `.next()` directly — all mutations must go through the ViewModel.
   *
   * Analogous to the `stream` getter in Flutter.
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
