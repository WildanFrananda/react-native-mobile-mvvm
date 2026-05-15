import { describe, it, expect } from '@jest/globals';
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

describe('StateFlow and Variance Fix', () => {
  it('should allow StateFlow<Specific> to be treated as ReadOnlyStateFlow<General> (Covariance)', () => {
    // This is the scenario that was failing:
    const productState = new StateFlow<UiState<Product[]>>({ 
      data: [{ id: '1', name: 'Coffee' }], 
      loading: false 
    });

    // Before the fix, this would fail to compile or throw a TS error in ComputedStateFlow.from
    const derived = ComputedStateFlow.from(
      [productState],
      ([state]) => state.data.length
    );

    expect(derived.value).toBe(1);
  });

  it('should update ComputedStateFlow when source StateFlow changes', () => {
    const count = new StateFlow(1);
    const doubled = ComputedStateFlow.from([count], ([c]) => c * 2);

    expect(doubled.value).toBe(2);

    count.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('should handle multiple sources in ComputedStateFlow', () => {
    const firstName = new StateFlow('John');
    const lastName = new StateFlow('Doe');

    const fullName = ComputedStateFlow.from(
      [firstName, lastName],
      ([f, l]) => `${f} ${l}`
    );

    expect(fullName.value).toBe('John Doe');

    firstName.value = 'Jane';
    expect(fullName.value).toBe('Jane Doe');
  });

  it('should only emit when value actually changes (equality check)', () => {
    const count = new StateFlow(1);
    let emits = 0;
    
    count.asObservable().subscribe(() => {
      emits++;
    });

    expect(emits).toBe(1); // Initial value

    count.value = 1; // Same value
    expect(emits).toBe(1); // Should not emit

    count.value = 2; // Different value
    expect(emits).toBe(2);
  });
});
