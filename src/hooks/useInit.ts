import { useEffect } from 'react';

/**
 * useInit — Run a callback exactly once when the component mounts.
 *
 * Direct analogies:
 * - `LaunchedEffect(Unit) { }` in Jetpack Compose
 * - `initState()` / `didChangeDependencies()` in Flutter
 * - `.task { }` modifier in SwiftUI
 * - `ngOnInit()` in Angular
 *
 * Handles both synchronous and async callbacks. Errors from async
 * callbacks should be handled inside the ViewModel (via UiState.error),
 * not in the hook itself.
 *
 * ## Usage
 *
 * ```tsx
 * const UserScreen = () => {
 *   const vm = useViewModel(UserViewModel);
 *
 *   // Triggers vm.fetchUser() once on mount — no useEffect, no [] to remember
 *   useInit(() => vm.fetchUser('123'));
 *
 *   const { data, isLoading, isError, error } = useUiState(vm.userState$);
 *   // ...
 * };
 * ```
 *
 * ## Async example
 *
 * ```tsx
 * useInit(async () => {
 *   await vm.loadDashboard(); // ViewModel handles loading/error state internally
 * });
 * ```
 *
 * @param fn - Callback to run on mount. May be sync or async.
 */
export function useInit(fn: () => void | PromiseLike<void>): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void Promise.resolve(fn()); }, []);
}
