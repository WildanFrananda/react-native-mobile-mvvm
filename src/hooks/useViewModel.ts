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
 * 2. **DI resolution** — If a class constructor is passed, it attempts DI resolution.
 * 3. **Manual support** — If a factory function is passed, it uses that for instantiation.
 * 4. **Automatic cleanup** — `viewModel.clear()` is called exactly when the component
 *    unmounts, which aborts in-flight fetch requests and completes `destroy$`.
 *
 * ## Basic Example (Class Constructor)
 *
 * ```tsx
 * const vm = useViewModel(CounterViewModel);
 * ```
 *
 * ## Manual Injection (Factory Function)
 * Use this to pass arguments to the ViewModel or if you don't want to use decorators.
 *
 * ```tsx
 * const vm = useViewModel(() => new UserViewModel(props.userId, repository));
 * ```
 *
 * @param factoryOrClass - The ViewModel class to instantiate or a factory function.
 * @returns A ViewModel instance bound to the component lifecycle
 */
export function useViewModel<T extends ViewModel>(
  factoryOrClass: Constructor<T> | (() => T),
): T {
  // useRef ensures the instance is created ONCE — it does not change across re-renders.
  const viewModelRef = useRef<T | null>(null);

  if (viewModelRef.current === null) {
    // Determine if we have a class constructor or a factory function.
    // In JS, classes are functions with a prototype.
    const isClass =
      typeof factoryOrClass === 'function' &&
      factoryOrClass.prototype &&
      factoryOrClass.prototype.constructor === factoryOrClass;

    if (isClass) {
      viewModelRef.current = createViewModelInstance(
        factoryOrClass as Constructor<T>,
      );
    } else {
      viewModelRef.current = (factoryOrClass as () => T)();
    }
  }

  // Exposes the ViewModel name in React DevTools.
  const label =
    typeof factoryOrClass === 'function' && 'name' in factoryOrClass
      ? factoryOrClass.name
      : 'CustomViewModel';
  useDebugValue(label);

  useEffect(() => {
    return () => {
      viewModelRef.current?.clear();
      viewModelRef.current = null;
    };
  }, []);

  return viewModelRef.current;
}
