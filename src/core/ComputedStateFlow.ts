import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
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
    private readonly isEqual: (a: R, b: R) => boolean = Object.is,
  ) {}

  get value(): R {
    return this.compute(this.sources.map((s) => s.value));
  }

  asObservable(): Observable<R> {
    // `distinctUntilChanged` gives `derivedStateOf`-style semantics: the derived
    // stream only re-emits when the COMPUTED value actually changes, not on every
    // upstream tick. Without it, a source the compute function ignores could still
    // force a re-render. Pass a custom `isEqual` for object/array results.
    //
    // NOTE: this dedupes consecutive-equal values; it does NOT make the derived
    // stream glitch-free for reconverging (diamond/chained) graphs. When two
    // sources share an upstream StateFlow, `combineLatest` can emit a transient
    // inconsistent tuple (one branch updated, the other stale) before settling.
    // `.value` is glitch-free (it recomputes synchronously top-down); prefer it
    // for one-shot reads, and avoid subscribing to derived-of-derived flows in
    // side-effecting code that must never observe an intermediate value.
    return combineLatest(this.sources.map((s) => s.asObservable())).pipe(
      map((values) => this.compute(values)),
      distinctUntilChanged(this.isEqual),
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
   * @param isEqual - Optional equality check used to de-duplicate the derived
   *   stream's emissions (defaults to `Object.is`). Pass a structural comparator
   *   when `compute` returns objects/arrays so an equal-but-new reference does
   *   not trigger a re-render.
   * @returns ReadOnlyStateFlow<R>
   */
  static from<T extends ReadOnlyStateFlow<any>[], R>(
    sources: [...T],
    compute: (values: InferValues<T>) => R,
    isEqual?: (a: R, b: R) => boolean,
  ): ReadOnlyStateFlow<R> {
    return new DerivedStateFlow(
      sources,
      compute as (values: any[]) => R,
      isEqual,
    );
  }
}
