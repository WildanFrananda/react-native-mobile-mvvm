import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { ViewModel } from '../../core/ViewModel';
import { ViewModelScope, useScopedViewModel } from '../ViewModelScope';

class SharedVM extends ViewModel {
  cleared = false;
  protected onCleared(): void {
    this.cleared = true;
  }
}

describe('ViewModelScope', () => {
  it('shares a single instance across components in the same scope', () => {
    const seen: SharedVM[] = [];
    const Child = (): null => {
      seen.push(useScopedViewModel(SharedVM));
      return null;
    };

    render(
      <ViewModelScope>
        <Child />
        <Child />
      </ViewModelScope>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });

  it('clears scoped ViewModels when the scope unmounts (not per component)', () => {
    let vm: SharedVM | undefined;
    const Child = (): null => {
      vm = useScopedViewModel(SharedVM);
      return null;
    };

    const { unmount } = render(
      <ViewModelScope>
        <Child />
      </ViewModelScope>,
    );
    expect(vm?.cleared).toBe(false);

    unmount();
    expect(vm?.cleared).toBe(true);
  });

  it('clears sibling ViewModels even if one onCleared() throws', () => {
    class BoomVM extends ViewModel {
      protected onCleared(): void {
        throw new Error('boom');
      }
    }
    class OkVM extends ViewModel {
      get aborted(): boolean {
        return this.abortController.signal.aborted;
      }
    }
    let ok: OkVM | undefined;
    const Child = (): null => {
      // BoomVM resolves first (inserted first in the scope store), so its
      // throwing teardown must not prevent OkVM from being cleared.
      useScopedViewModel(BoomVM);
      ok = useScopedViewModel(OkVM);
      return null;
    };

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <ViewModelScope>
        <Child />
      </ViewModelScope>,
    );

    unmount();
    expect(ok?.aborted).toBe(true);
    spy.mockRestore();
  });

  it('supports a manual factory and uses it once', () => {
    let vm: SharedVM | undefined;
    const factory = jest.fn(() => new SharedVM());
    const Child = (): null => {
      vm = useScopedViewModel(SharedVM, factory);
      return null;
    };

    render(
      <ViewModelScope>
        <Child />
        <Child />
      </ViewModelScope>,
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(vm).toBeInstanceOf(SharedVM);
  });

  it('throws when used outside of a <ViewModelScope>', () => {
    const Standalone = (): null => {
      useScopedViewModel(SharedVM);
      return null;
    };

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Standalone />)).toThrow(
      /outside of a <ViewModelScope>/,
    );
    spy.mockRestore();
  });
});
