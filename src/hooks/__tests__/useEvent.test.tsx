import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { useEvent } from '../useEvent';

describe('useEvent', () => {
  it('invokes the handler when the observable emits', () => {
    const events = new Subject<string>();
    const handler = jest.fn();

    renderHook(() => useEvent(events.asObservable(), handler));
    act(() => {
      events.next('go');
    });

    expect(handler).toHaveBeenCalledWith('go');
  });

  it('does not re-render the host component on emit (side-effect only)', () => {
    const events = new Subject<number>();
    let renders = 0;

    renderHook(() => {
      renders += 1;
      useEvent(events.asObservable(), () => {});
    });
    const baseline = renders;

    act(() => {
      events.next(1);
    });

    expect(renders).toBe(baseline);
  });

  it('always calls the latest handler without missing events (latest-ref)', () => {
    const events = new Subject<string>();
    const calls: string[] = [];

    const { rerender } = renderHook(
      ({ tag }) =>
        useEvent(events.asObservable(), (v) => calls.push(`${tag}:${v}`)),
      { initialProps: { tag: 'first' } },
    );

    act(() => {
      events.next('a');
    });

    rerender({ tag: 'second' });

    act(() => {
      events.next('b');
    });

    expect(calls).toEqual(['first:a', 'second:b']);
  });

  it('unsubscribes on unmount', () => {
    const events = new Subject<string>();
    const handler = jest.fn();

    const { unmount } = renderHook(() => useEvent(events.asObservable(), handler));
    unmount();

    act(() => {
      events.next('after-unmount');
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
