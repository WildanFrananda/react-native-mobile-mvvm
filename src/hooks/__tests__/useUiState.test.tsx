import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { StateFlow } from '../../core/StateFlow';
import { UiState } from '../../core/UiState';
import { useUiState } from '../useUiState';

interface User {
  id: string;
  name: string;
}

describe('useUiState', () => {
  it('reports idle with no data or error by default', () => {
    const flow = new StateFlow<UiState<User>>(UiState.idle());
    const { result } = renderHook(() => useUiState(flow));

    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reports loading', () => {
    const flow = new StateFlow<UiState<User>>(UiState.loading());
    const { result } = renderHook(() => useUiState(flow));

    expect(result.current.isLoading).toBe(true);
  });

  it('reports success and exposes the data', () => {
    const flow = new StateFlow<UiState<User>>(
      UiState.success({ id: '1', name: 'Ada' }),
    );
    const { result } = renderHook(() => useUiState(flow));

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ id: '1', name: 'Ada' });
    expect(result.current.error).toBeNull();
  });

  it('reports error and exposes the message', () => {
    const flow = new StateFlow<UiState<User>>(UiState.error('nope'));
    const { result } = renderHook(() => useUiState(flow));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe('nope');
    expect(result.current.data).toBeNull();
  });

  it('transitions across states as the source emits', () => {
    const flow = new StateFlow<UiState<User>>(UiState.idle());
    const { result } = renderHook(() => useUiState(flow));

    act(() => {
      flow.value = UiState.loading();
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      flow.value = UiState.success({ id: '1', name: 'Ada' });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.name).toBe('Ada');
  });
});
