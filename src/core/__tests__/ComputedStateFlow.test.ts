import { describe, it, expect, jest } from '@jest/globals';
import { StateFlow } from '../StateFlow';
import { ComputedStateFlow } from '../ComputedStateFlow';

interface Product {
  id: string;
  name: string;
}

interface UiState<T> {
  data: T;
  loading: boolean;
}

describe('ComputedStateFlow', () => {
  describe('synchronous value', () => {
    it('derives from a single source', () => {
      const count = new StateFlow(1);
      const doubled = ComputedStateFlow.from([count], ([c]) => c * 2);

      expect(doubled.value).toBe(2);
    });

    it('recomputes the value synchronously when a source changes', () => {
      const count = new StateFlow(1);
      const doubled = ComputedStateFlow.from([count], ([c]) => c * 2);

      count.value = 5;
      expect(doubled.value).toBe(10);
    });

    it('combines multiple sources', () => {
      const firstName = new StateFlow('John');
      const lastName = new StateFlow('Doe');
      const fullName = ComputedStateFlow.from(
        [firstName, lastName],
        ([f, l]) => `${f} ${l}`,
      );

      expect(fullName.value).toBe('John Doe');

      firstName.value = 'Jane';
      expect(fullName.value).toBe('Jane Doe');
    });
  });

  describe('observable updates', () => {
    it('emits the initial derived value on subscribe', () => {
      const a = new StateFlow(2);
      const b = new StateFlow(3);
      const sum = ComputedStateFlow.from([a, b], ([x, y]) => x + y);

      const next = jest.fn();
      sum.asObservable().subscribe(next);

      expect(next).toHaveBeenLastCalledWith(5);
    });

    it('re-emits when any source changes', () => {
      const a = new StateFlow(2);
      const b = new StateFlow(3);
      const sum = ComputedStateFlow.from([a, b], ([x, y]) => x + y);

      const received: number[] = [];
      sum.asObservable().subscribe((v) => received.push(v));

      a.value = 10; // -> 13
      b.value = 0; // -> 10

      expect(received).toEqual([5, 13, 10]);
    });

    it('does not re-emit when the derived value is unchanged', () => {
      const a = new StateFlow(2);
      const b = new StateFlow(0);
      // Derived depends only on `a`; changes to `b` must not re-emit.
      const derived = ComputedStateFlow.from([a, b], ([x]) => x * 2);

      const received: number[] = [];
      derived.asObservable().subscribe((v) => received.push(v));

      b.value = 1; // unrelated -> still 4 -> deduped
      b.value = 2; // unrelated -> still 4 -> deduped
      a.value = 3; // -> 6

      expect(received).toEqual([4, 6]);
    });

    it('accepts a custom isEqual to de-duplicate object results', () => {
      const a = new StateFlow(1);
      const derived = ComputedStateFlow.from(
        [a],
        ([x]) => ({ even: x % 2 === 0 }),
        (p, q) => p.even === q.even,
      );

      const received: Array<{ even: boolean }> = [];
      derived.asObservable().subscribe((v) => received.push(v));

      a.value = 3; // odd -> still { even: false } -> deduped
      a.value = 5; // odd -> deduped
      a.value = 2; // even -> emits

      expect(received.map((r) => r.even)).toEqual([false, true]);
    });
  });

  describe('typing / variance', () => {
    it('treats StateFlow<Specific> as ReadOnlyStateFlow<General> (covariance)', () => {
      const productState = new StateFlow<UiState<Product[]>>({
        data: [{ id: '1', name: 'Coffee' }],
        loading: false,
      });

      const derived = ComputedStateFlow.from(
        [productState],
        ([state]) => state.data.length,
      );

      expect(derived.value).toBe(1);
    });
  });
});
