import { describe, it, expect, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useLifecycle } from '../useLifecycle';

describe('useLifecycle', () => {
  it('calls onMount once and not again on re-render', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();

    const { rerender } = renderHook(() => useLifecycle(onMount, onUnmount));
    rerender();

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();
  });

  it('calls onUnmount on unmount', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();

    const { unmount } = renderHook(() => useLifecycle(onMount, onUnmount));
    unmount();

    expect(onUnmount).toHaveBeenCalledTimes(1);
  });
});
