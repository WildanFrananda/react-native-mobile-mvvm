import { Observable } from 'rxjs';
import type { UiState } from '../core/UiState';
import { useStream } from './useStream';
import type { ReadOnlyStateFlow } from '../core/StateFlow';

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
 * useUiState<T> — Subscribes to a UiState source and returns a destructurable result.
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
 *
 *   // ✅ Direct pass — no need for .asObservable()
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
 * @param source - A ReadOnlyStateFlow or Observable that emits UiState<T> values
 * @param initialState - Initial state before the first emission (default: idle)
 * @returns Destructurable UiStateResult<T>
 */
export function useUiState<T>(
  source: ReadOnlyStateFlow<UiState<T>> | Observable<UiState<T>>,
  initialState: UiState<T> = { status: 'idle' },
): UiStateResult<T> {
  const state = useStream(source, initialState);

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
