import { describe, it, expect, jest } from '@jest/globals';
import { StateFlow } from '../StateFlow';
import type { ReadOnlyStateFlow } from '../StateFlow';

describe('StateFlow', () => {
  describe('value', () => {
    it('exposes the initial value synchronously', () => {
      const flow = new StateFlow(42);
      expect(flow.value).toBe(42);
    });

    it('updates the value via the setter', () => {
      const flow = new StateFlow(0);
      flow.value = 10;
      expect(flow.value).toBe(10);
    });

    it('replays the current value to new subscribers (BehaviorSubject semantics)', () => {
      const flow = new StateFlow('initial');
      flow.value = 'updated';

      const received: string[] = [];
      flow.asObservable().subscribe((v) => received.push(v));

      expect(received).toEqual(['updated']);
    });
  });

  describe('equality gating', () => {
    it('does not emit when the new value is reference-equal (default Object.is)', () => {
      const flow = new StateFlow(1);
      const next = jest.fn();
      flow.asObservable().subscribe(next);

      expect(next).toHaveBeenCalledTimes(1); // initial replay

      flow.value = 1; // identical primitive
      expect(next).toHaveBeenCalledTimes(1); // suppressed
    });

    it('emits when the value actually changes', () => {
      const flow = new StateFlow(1);
      const next = jest.fn();
      flow.asObservable().subscribe(next);

      flow.value = 2;
      flow.value = 3;
      expect(next).toHaveBeenCalledTimes(3); // initial + two changes
    });

    it('emits for a new object reference even if structurally equal under default equality', () => {
      const flow = new StateFlow<{ n: number }>({ n: 1 });
      const next = jest.fn();
      flow.asObservable().subscribe(next);

      flow.value = { n: 1 }; // new reference
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('respects a custom isEqual to suppress structurally-equal emissions', () => {
      const isEqual = (a: { n: number }, b: { n: number }) => a.n === b.n;
      const flow = new StateFlow({ n: 1 }, isEqual);
      const next = jest.fn();
      flow.asObservable().subscribe(next);

      flow.value = { n: 1 }; // structurally equal -> suppressed
      expect(next).toHaveBeenCalledTimes(1);

      flow.value = { n: 2 }; // different -> emits
      expect(next).toHaveBeenCalledTimes(2);
      expect(flow.value).toEqual({ n: 2 });
    });
  });

  describe('read-only projections', () => {
    it('asReadOnly returns a value/asObservable view backed by the same state', () => {
      const flow = new StateFlow(5);
      const readOnly: ReadOnlyStateFlow<number> = flow.asReadOnly();

      expect(readOnly.value).toBe(5);
      flow.value = 9;
      expect(readOnly.value).toBe(9);
    });

    it('asObservable does not expose a way to push values', () => {
      const flow = new StateFlow(0);
      const observable = flow.asObservable();
      // The returned Observable has no `.next` — mutations must go through the StateFlow.
      expect((observable as unknown as { next?: unknown }).next).toBeUndefined();
    });

    it('does not leak the underlying mutable subject to consumers', () => {
      const flow = new StateFlow(7);
      // The raw BehaviorSubject is private — there must be no public `subject`
      // handle that would let the UI call .next()/.complete()/.error() and
      // bypass the read-only contract. Current value is read via `.value`.
      expect((flow as unknown as { subject?: unknown }).subject).toBeUndefined();
      expect(flow.value).toBe(7);
    });
  });

  describe('complete', () => {
    it('completes the underlying subject', () => {
      const flow = new StateFlow(1);
      const onComplete = jest.fn();
      flow.asObservable().subscribe({ complete: onComplete });

      flow.complete();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('is safe to call twice', () => {
      const flow = new StateFlow(1);
      expect(() => {
        flow.complete();
        flow.complete();
      }).not.toThrow();
    });
  });
});
