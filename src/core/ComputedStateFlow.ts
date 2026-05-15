import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ReadOnlyStateFlow, StateFlow } from './StateFlow';

/**
 * Infers the value type tuple from an array of StateFlow instances.
 * StateFlow<string>[] -> [string, ...]
 */
type InferValues<T extends ReadOnlyStateFlow<any>[]> = {
  [K in keyof T]: T[K] extends ReadOnlyStateFlow<infer V> ? V : never;
};

/**
 * DerivedStateFlow — Internal implementation of a read-only state derived from other StateFlows.
 */
class DerivedStateFlow<R> implements ReadOnlyStateFlow<R> {
  constructor(
    private readonly sources: ReadOnlyStateFlow<any>[],
    private readonly compute: (values: any[]) => R,
  ) {}

  get value(): R {
    return this.compute(this.sources.map((s) => s.value));
  }

  asObservable(): Observable<R> {
    return combineLatest(this.sources.map((s) => s.asObservable())).pipe(
      map((values) => this.compute(values)),
    );
  }
}

/**
 * ComputedStateFlow — Derive a new ReadOnlyStateFlow from one or more StateFlows.
 *
 * Direct analogies:
 * - `derivedStateOf {}` in Jetpack Compose
 * - `combine()` / `combineLatest()` in Swift/Combine
 * - `BehaviorSubject.combineLatest()` in RxDart/Flutter
 *
 * Sugar over `combineLatest + map`. Accepts StateFlow instances directly —
 * no need to call `.asObservable()` on each source or import `combineLatest`.
 *
 * Returns a `ReadOnlyStateFlow<R>` which provides both the current derived
 * value and an Observable for updates.
 *
 * ## Usage
 *
 * ```ts
 * export class ProductListViewModel extends ViewModel {
 *   private _items = new StateFlow<Product[]>([]);
 *   private _query = new StateFlow<string>('');
 *
 *   // Derived — updates automatically and has a .value property
 *   public readonly filteredItems$: ReadOnlyStateFlow<Product[]> = ComputedStateFlow.from(
 *     [this._items, this._query],
 *     ([items, query]) => items.filter((i) => i.name.includes(query)),
 *   );
 *
 *   get count() {
 *     return this.filteredItems$.value; // Synchronous access!
 *   }
 * }
 * ```
 */
export class ComputedStateFlow {
  /**
   * Creates a derived ReadOnlyStateFlow that recomputes whenever any source StateFlow changes.
   *
   * @param sources - One or more StateFlow instances to observe
   * @param compute - Pure function that derives the new value from current source values
   * @returns ReadOnlyStateFlow<R>
   */
  static from<T extends ReadOnlyStateFlow<any>[], R>(
    sources: [...T],
    compute: (values: InferValues<T>) => R,
  ): ReadOnlyStateFlow<R> {
    return new DerivedStateFlow(
      sources,
      compute as (values: any[]) => R,
    );
  }
}
