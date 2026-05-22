/**
 * Manual mock for `react-native`, wired via `moduleNameMapper` in jest.config.js.
 *
 * The library only consumes `AppState.addEventListener('change', ...)` (inside
 * `useStream`). This stub provides a controllable AppState so hooks can be
 * tested in jsdom without pulling in the full React Native jest preset.
 *
 * Because `moduleNameMapper` redirects every `import ... from 'react-native'`
 * to this exact file, the `AppState` the hook subscribes to and the helpers a
 * test imports here resolve to the same module instance — so `emitAppState`
 * drives the listeners the hook actually registered.
 */
export type AppStateStatus = 'active' | 'background' | 'inactive' | (string & {});

type ChangeHandler = (status: AppStateStatus) => void;

let listeners: ChangeHandler[] = [];
let current: AppStateStatus = 'active';

export const AppState = {
  get currentState(): AppStateStatus {
    return current;
  },

  addEventListener(_type: 'change', handler: ChangeHandler) {
    listeners.push(handler);
    return {
      remove(): void {
        listeners = listeners.filter((l) => l !== handler);
      },
    };
  },
};

/** Test helper — drive an AppState transition and notify all listeners. */
export function emitAppState(status: AppStateStatus): void {
  current = status;
  listeners.forEach((handler) => handler(status));
}

/** Test helper — number of currently-registered listeners (asserts cleanup). */
export function appStateListenerCount(): number {
  return listeners.length;
}

/** Test helper — reset listeners and state between tests. */
export function resetAppStateMock(): void {
  listeners = [];
  current = 'active';
}
