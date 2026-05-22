import { describe, it, expect } from '@jest/globals';
import { UiState } from '../UiState';

interface User {
  id: string;
  name: string;
}

describe('UiState', () => {
  it('creates an idle state', () => {
    expect(UiState.idle()).toEqual({ status: 'idle' });
  });

  it('creates a loading state', () => {
    expect(UiState.loading()).toEqual({ status: 'loading' });
  });

  it('creates a success state carrying data', () => {
    const user: User = { id: '1', name: 'Ada' };
    const state = UiState.success(user);

    expect(state).toEqual({ status: 'success', data: user });
  });

  it('creates an error state carrying a message', () => {
    expect(UiState.error('boom')).toEqual({ status: 'error', message: 'boom' });
  });

  it('produces mutually-exclusive, narrowable states', () => {
    const states = [
      UiState.idle<User>(),
      UiState.loading<User>(),
      UiState.success<User>({ id: '1', name: 'Ada' }),
      UiState.error<User>('nope'),
    ];

    const summarise = (state: UiState<User>): string => {
      // Exhaustive narrowing on the discriminant.
      switch (state.status) {
        case 'idle':
          return 'idle';
        case 'loading':
          return 'loading';
        case 'success':
          return state.data.name; // `data` only exists here
        case 'error':
          return state.message; // `message` only exists here
      }
    };

    expect(states.map(summarise)).toEqual(['idle', 'loading', 'Ada', 'nope']);
  });
});
