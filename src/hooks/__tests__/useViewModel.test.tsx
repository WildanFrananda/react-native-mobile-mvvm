import { describe, it, expect } from '@jest/globals';
import { StrictMode } from 'react';
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

  it('supports a named (non-arrow) factory function', () => {
    class GreetVM extends ViewModel {
      constructor(public readonly name: string) {
        super();
      }
    }
    function makeGreetVM(): GreetVM {
      return new GreetVM('Grace');
    }

    const { result } = renderHook(() => useViewModel(makeGreetVM));

    // A named function must NOT be misclassified as a class and `new`-ed.
    expect(result.current).toBeInstanceOf(GreetVM);
    expect(result.current.name).toBe('Grace');
  });

  it('returns a live (non-cleared) ViewModel under StrictMode double-invoke', () => {
    class TrackedVM extends ViewModel {
      get aborted(): boolean {
        return this.abortController.signal.aborted;
      }
    }

    const { result } = renderHook(() => useViewModel(TrackedVM), {
      wrapper: StrictMode,
    });

    // The StrictMode mount runs setup -> cleanup -> setup; the hook must rebind
    // to a fresh, live instance rather than the cleared one.
    expect(result.current).toBeInstanceOf(TrackedVM);
    expect(result.current.aborted).toBe(false);
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
