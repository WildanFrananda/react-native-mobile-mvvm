/**
 * UiState<T> — Sealed state pattern for async operations.
 *
 * Direct analogies:
 * - `sealed class UiState` in Kotlin/Compose
 * - `AsyncSnapshot` states in Flutter (ConnectionState)
 * - Enum-driven state in SwiftUI
 *
 * Replaces the common anti-pattern of three separate StateFlows:
 * ```ts
 * // ❌ Anti-pattern — fragmented, error-prone, inconsistent
 * private _isLoading = new StateFlow<boolean>(false);
 * private _data = new StateFlow<User | null>(null);
 * private _error = new StateFlow<string | null>(null);
 *
 * // ✅ Unified — one source of truth, mutually exclusive states
 * private _state = new StateFlow<UiState<User>>(UiState.idle());
 * ```
 *
 * Usage in a ViewModel:
 * ```ts
 * export class UserViewModel extends ViewModel {
 *   private _userState = new StateFlow<UiState<User>>(UiState.idle());
 *   public readonly userState$ = this._userState.asObservable();
 *
 *   async fetchUser(id: string) {
 *     this._userState.value = UiState.loading();
 *     try {
 *       const user = await fetchUser(id, { signal: this.abortController.signal });
 *       this._userState.value = UiState.success(user);
 *     } catch (e) {
 *       if ((e as Error).name !== 'AbortError') {
 *         this._userState.value = UiState.error((e as Error).message);
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type UiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

/**
 * Factory helpers — analogous to a Kotlin companion object or sealed class constructors.
 *
 * ```ts
 * UiState.idle()            // { status: 'idle' }
 * UiState.loading()         // { status: 'loading' }
 * UiState.success(user)     // { status: 'success', data: user }
 * UiState.error('msg')      // { status: 'error', message: 'msg' }
 * ```
 */
export const UiState = {
  idle: <T = never>(): UiState<T> => ({ status: 'idle' }),
  loading: <T = never>(): UiState<T> => ({ status: 'loading' }),
  success: <T>(data: T): UiState<T> => ({ status: 'success', data }),
  error: <T = never>(message: string): UiState<T> => ({ status: 'error', message }),
} as const;
