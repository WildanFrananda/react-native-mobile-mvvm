import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { StateFlow } from './StateFlow';

/**
 * Infers the value type tuple from an array of StateFlow instances.
 * StateFlow<string>[] -> [string, ...]
 */
type InferValues<T extends StateFlow<unknown>[]> = {
  [K in keyof T]: T[K] extends StateFlow<infer V> ? V : never;
};

/**
 * ComputedStateFlow — Derive a new Observable from one or more StateFlows.
 *
 * Direct analogies:
 * - `derivedStateOf {}` in Jetpack Compose
 * - `combine()` / `combineLatest()` in Swift/Combine
 * - `BehaviorSubject.combineLatest()` in RxDart/Flutter
 *
 * Sugar over `combineLatest + map`. Accepts StateFlow instances directly —
 * no need to call `.asObservable()` on each source or import `combineLatest`.
 *
 * Returns a plain `Observable<R>` — pipe `takeUntil(this.destroy$)` when
 * declaring inside a ViewModel to prevent memory leaks.
 *
 * ## Usage
 *
 * ```ts
 * export class ProductListViewModel extends ViewModel {
 *   private _items = new StateFlow<Product[]>([]);
 *   private _query = new StateFlow<string>('');
 *   private _showInStock = new StateFlow<boolean>(false);
 *
 *   // Derived — updates automatically when _items, _query, or _showInStock changes
 *   public readonly filteredItems$ = ComputedStateFlow.from(
 *     [this._items, this._query, this._showInStock],
 *     ([items, query, inStockOnly]) =>
 *       items
 *         .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
 *         .filter((i) => (inStockOnly ? i.inStock : true)),
 *   );
 * }
 * ```
 *
 * ## Single source
 *
 * ```ts
 * public readonly upperName$ = ComputedStateFlow.from(
 *   [this._name],
 *   ([name]) => name.toUpperCase(),
 * );
 * ```
 */
export class ComputedStateFlow {
  /**
   * Creates a derived Observable that recomputes whenever any source StateFlow changes.
   *
   * Emits immediately with the current values of all sources (because StateFlow
   * is backed by BehaviorSubject, which replays the last value on subscribe).
   *
   * @param sources - One or more StateFlow instances to observe
   * @param compute - Pure function that derives the new value from current source values
   * @returns Observable<R> — pipe takeUntil(this.destroy$) inside a ViewModel
   */
  static from<T extends StateFlow<unknown>[], R>(
    sources: [...T],
    compute: (values: InferValues<T>) => R,
  ): Observable<R> {
    return combineLatest(sources.map((s) => s.asObservable())).pipe(
      map((values) => compute(values as InferValues<T>)),
    );
  }
}
