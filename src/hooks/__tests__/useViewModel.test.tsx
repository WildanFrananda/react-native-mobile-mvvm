import { describe, it, expect } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useViewModel } from '../useViewModel';
import { ViewModel } from '../../core/ViewModel';

describe('useViewModel', () => {
  it('instantiates once and returns the same instance across re-renders', () => {
    let constructs = 0;
    class CounterVM extends ViewModel {
      constructor() {
        super();
        constructs += 1;
      }
    }

    const { result, rerender } = renderHook(() => useViewModel(CounterVM));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(constructs).toBe(1);
  });

  it('supports a factory function for manual injection', () => {
    class GreetVM extends ViewModel {
      constructor(public readonly name: string) {
        super();
      }
    }

    const { result } = renderHook(() => useViewModel(() => new GreetVM('Ada')));

    expect(result.current).toBeInstanceOf(GreetVM);
    expect(result.current.name).toBe('Ada');
  });

  it('clears the ViewModel on unmount', () => {
    let cleared = false;
    class DisposableVM extends ViewModel {
      protected onCleared(): void {
        cleared = true;
      }
    }

    const { unmount } = renderHook(() => useViewModel(DisposableVM));
    expect(cleared).toBe(false);

    unmount();
    expect(cleared).toBe(true);
  });
});
