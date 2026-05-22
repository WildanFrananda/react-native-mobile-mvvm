import { describe, it, expect, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useInit } from '../useInit';

describe('useInit', () => {
  it('runs the callback exactly once on mount', () => {
    const fn = jest.fn<() => void>();

    const { rerender } = renderHook(() => useInit(fn));
    rerender();
    rerender();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs once for an async callback without throwing', () => {
    const fn = jest.fn(async () => {});

    expect(() => renderHook(() => useInit(fn))).not.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
