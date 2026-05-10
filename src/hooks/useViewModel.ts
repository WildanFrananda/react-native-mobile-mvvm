import { useDebugValue, useEffect, useRef } from 'react';
import type { ViewModel } from '../core/ViewModel';
import { createViewModelInstance } from '../di/container';
import type { Constructor } from '../types';

/**
 * useViewModel<T> — Create and bind a ViewModel instance to the React component lifecycle.
 *
 * Direct analogies:
 * - `hiltViewModel()` in Jetpack Compose
 * - `context.watch<T>()` / `Provider.of<T>()` in Flutter
 * - `@StateObject` in SwiftUI
 *
 * ## What this hook does automatically:
 * 1. **Single instantiation** — The ViewModel is created only once when the component
 *    first mounts and is never recreated on re-renders (backed by `useRef`).
 * 2. **DI resolution** — If the ViewModel class is decorated with `@Injectable()` and
 *    `configureDI()` has been called, dependencies are injected automatically.
 * 3. **Automatic cleanup** — `viewModel.onCleared()` is called exactly when the component
 *    unmounts, which aborts in-flight fetch requests and completes `destroy$`.
 *
 * ## Basic Example (without DI)
 *
 * ```tsx
 * import { useViewModel, useStream } from 'react-native-mobile-mvvm';
 *
 * const CounterScreen = () => {
 *   const vm = useViewModel(CounterViewModel);
 *   const count = useStream(vm.count$, 0);
 *
 *   return (
 *     <View>
 *       <Text>{count}</Text>
 *       <Button onPress={() => vm.increment()} title="Add" />
 *     </View>
 *   );
 * };
 * ```
 *
 * ## Example with DI (tsyringe)
 *
 * ```tsx
 * // In App.tsx (entry point) — call ONCE
 * import 'reflect-metadata';
 * import { configureDI } from 'react-native-mobile-mvvm/di';
 * configureDI(() => {
 *   container.register('AuthRepo', { useClass: AuthRepoImpl });
 * });
 *
 * // In a screen component
 * const LoginScreen = () => {
 *   const vm = useViewModel(LoginViewModel); // AuthRepo is injected automatically!
 *   // ...
 * };
 * ```
 *
 * @param ViewModelClass - The ViewModel class to instantiate (not an instance)
 * @returns A ViewModel instance bound to the component lifecycle
 */
export function useViewModel<T extends ViewModel>(
  ViewModelClass: Constructor<T>,
): T {
  // useRef ensures the instance is created ONCE — it does not change across re-renders.
  // Analogous to `remember { ViewModel() }` in Compose or `late final` in Dart.
  const viewModelRef = useRef<T | null>(null);

  if (viewModelRef.current === null) {
    // Lazy initialization: create the instance on the first hook invocation.
    // Attempts DI container resolution first, falls back to new ClassName().
    viewModelRef.current = createViewModelInstance(ViewModelClass);
  }

  // Exposes the ViewModel class name in React DevTools.
  // Instead of a generic "useViewModel", DevTools will show e.g. "useViewModel: LoginViewModel".
  // This is a dev-only hint — zero cost in production builds.
  useDebugValue(ViewModelClass.name);

  useEffect(() => {
    // No setup is needed on mount.
    // The ViewModel is already ready to use.

    return () => {
      // Cleanup on component unmount — analogous to onDestroy() in Android
      // or dispose() in Flutter.
      //
      // This will:
      // 1. Call AbortController.abort()   → cancel in-flight fetch requests
      // 2. Emit destroy$                  → cancel all takeUntil(this.destroy$) subscriptions
      viewModelRef.current?.onCleared();
      viewModelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array — this effect runs only on mount and unmount

  // viewModelRef.current is guaranteed non-null here due to the lazy init above
  return viewModelRef.current;
}
