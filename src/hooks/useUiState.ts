import { Observable } from 'rxjs';
import type { UiState } from '../core/UiState';
import { useStream } from './useStream';

/**
 * Return shape of useUiState — destructurable, analogous to:
 * - `when (state) { is Loading -> ... }` in Kotlin
 * - `AsyncSnapshot` fields in Flutter (`hasData`, `hasError`, etc.)
 * - `switch state { case .loading: ... }` in SwiftUI
 */
export interface UiStateResult<T> {
  /** The raw UiState — use for exhaustive pattern matching if needed. */
  state: UiState<T>;
  /** Data when status is 'success', null otherwise. */
  data: T | null;
  /** True when status is 'idle'. */
  isIdle: boolean;
  /** True when status is 'loading'. */
  isLoading: boolean;
  /** True when status is 'success'. */
  isSuccess: boolean;
  /** True when status is 'error'. */
  isError: boolean;
  /** Error message when status is 'error', null otherwise. */
  error: string | null;
}

/**
 * useUiState<T> — Subscribes to a UiState Observable and returns a destructurable result.
 *
 * Direct analogies:
 * - `when (uiState) { is Loading -> ... is Success -> ... }` in Compose
 * - `AsyncSnapshot` fields (`hasData`, `hasError`, `connectionState`) in Flutter
 * - SwiftUI `.task {}` + enum-driven state
 *
 * ## Usage
 *
 * ```tsx
 * import { useViewModel, useUiState } from 'react-native-mobile-mvvm';
 *
 * const UserScreen = () => {
 *   const vm = useViewModel(UserViewModel);
 *   const { data, isLoading, isError, error } = useUiState(vm.userState$);
 *
 *   if (isLoading) return <ActivityIndicator />;
 *   if (isError) return <Text style={{ color: 'red' }}>{error}</Text>;
 *   if (!data) return null;
 *
 *   return <Text>{data.name}</Text>;
 * };
 * ```
 *
 * ## Pattern matching on raw state
 *
 * ```tsx
 * const { state } = useUiState(vm.userState$);
 *
 * // Exhaustive switch — TypeScript narrows the type per branch
 * switch (state.status) {
 *   case 'idle':    return <Text>Tap to load</Text>;
 *   case 'loading': return <ActivityIndicator />;
 *   case 'success': return <Text>{state.data.name}</Text>; // state.data is typed T here
 *   case 'error':   return <Text>{state.message}</Text>;
 * }
 * ```
 *
 * @param observable$ - A StateFlow observable that emits UiState<T> values
 * @param initialState - Initial state before the first emission (default: idle)
 * @returns Destructurable UiStateResult<T>
 */
export function useUiState<T>(
  observable$: Observable<UiState<T>>,
  initialState: UiState<T> = { status: 'idle' },
): UiStateResult<T> {
  const state = useStream(observable$, initialState);

  return {
    state,
    data: state.status === 'success' ? state.data : null,
    isIdle: state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    error: state.status === 'error' ? state.message : null,
  };
}
