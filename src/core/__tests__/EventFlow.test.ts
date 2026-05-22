import { describe, it, expect, jest } from '@jest/globals';
import { EventFlow } from '../EventFlow';

describe('EventFlow', () => {
  it('delivers an emitted value to a current subscriber', () => {
    const events = new EventFlow<string>();
    const handler = jest.fn();
    events.asObservable().subscribe(handler);

    events.emit('go');
    expect(handler).toHaveBeenCalledWith('go');
  });

  it('does NOT replay past events to a late subscriber (fire-and-forget)', () => {
    const events = new EventFlow<string>();
    events.emit('missed'); // no subscribers yet

    const handler = jest.fn();
    events.asObservable().subscribe(handler);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not re-deliver a previous event when a new subscriber joins mid-stream', () => {
    const events = new EventFlow<number>();
    const first = jest.fn();
    events.asObservable().subscribe(first);

    events.emit(1);

    const second = jest.fn();
    events.asObservable().subscribe(second);

    events.emit(2);

    expect(first.mock.calls).toEqual([[1], [2]]);
    expect(second.mock.calls).toEqual([[2]]); // never saw `1`
  });

  it('fans an event out to all current subscribers', () => {
    const events = new EventFlow<string>();
    const a = jest.fn();
    const b = jest.fn();
    events.asObservable().subscribe(a);
    events.asObservable().subscribe(b);

    events.emit('broadcast');

    expect(a).toHaveBeenCalledWith('broadcast');
    expect(b).toHaveBeenCalledWith('broadcast');
  });

  it('stops delivering after an unsubscribe', () => {
    const events = new EventFlow<string>();
    const handler = jest.fn();
    const sub = events.asObservable().subscribe(handler);

    sub.unsubscribe();
    events.emit('ignored');

    expect(handler).not.toHaveBeenCalled();
  });

  describe('complete', () => {
    it('completes subscribers and ignores subsequent emits', () => {
      const events = new EventFlow<string>();
      const next = jest.fn();
      const complete = jest.fn();
      events.asObservable().subscribe({ next, complete });

      events.complete();
      events.emit('after-complete');

      expect(complete).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });

    it('is safe to call twice', () => {
      const events = new EventFlow<string>();
      expect(() => {
        events.complete();
        events.complete();
      }).not.toThrow();
    });
  });
});
