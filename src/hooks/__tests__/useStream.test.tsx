import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Observable } from 'rxjs';
import { useStream } from '../useStream';
import { StateFlow } from '../../core/StateFlow';
import {
  emitAppState,
  appStateListenerCount,
} from '../../test-utils/react-native.mock';

describe('useStream', () => {
  describe('eager initial value (no flicker)', () => {
    it('returns the current value of a StateFlow instead of the default', () => {
      const flow = new StateFlow(42);
      const { result } = renderHook(() => useStream(flow, 0));
      expect(result.current).toBe(42);
    });

    it('reads the current value of a synchronous BehaviorSubject observable', () => {
      const subject = new BehaviorSubject(7);
      const { result } = renderHook(() => useStream(subject.asObservable(), 0));
      expect(result.current).toBe(7);
    });

    it('falls back to the default for a cold observable that never emits', () => {
      const cold = new Observable<number>(() => {});
      const { result } = renderHook(() => useStream(cold, -1));
      expect(result.current).toBe(-1);
    });
  });

  it('re-renders with each new emitted value', () => {
    const flow = new StateFlow(0);
    const { result } = renderHook(() => useStream(flow, 0));

    act(() => {
      flow.value = 1;
    });
    expect(result.current).toBe(1);

    act(() => {
      flow.value = 2;
    });
    expect(result.current).toBe(2);
  });

  it('pauses while backgrounded and resumes on foreground (AppState-aware)', () => {
    const flow = new StateFlow('a');
    const { result } = renderHook(() => useStream(flow, ''));
    expect(result.current).toBe('a');

    act(() => {
      emitAppState('background');
    });
    act(() => {
      flow.value = 'b'; // updated while paused
    });
    expect(result.current).toBe('a'); // not applied while backgrounded

    act(() => {
      emitAppState('active');
    });
    expect(result.current).toBe('b'); // replays latest on resume
  });

  it('does not re-subscribe to a stable source on re-render', () => {
    const flow = new StateFlow(0);
    const asObservableSpy = jest.spyOn(flow, 'asObservable');

    const { rerender } = renderHook(() => useStream(flow, 0));
    const callsAfterMount = asObservableSpy.mock.calls.length;

    rerender();
    rerender();

    // Memoised: the Observable is derived once, not on every render.
    expect(asObservableSpy.mock.calls.length).toBe(callsAfterMount);
  });

  it('unsubscribes from the source and AppState on unmount', () => {
    const flow = new StateFlow(0);
    const { unmount } = renderHook(() => useStream(flow, 0));
    expect(appStateListenerCount()).toBeGreaterThan(0);

    unmount();
    expect(appStateListenerCount()).toBe(0);
  });
});
