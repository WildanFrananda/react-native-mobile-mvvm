import { useDebugValue, useEffect, useRef, useState } from 'react';
import type { ViewModel } from '../core/ViewModel';
import { createViewModelInstance } from '../di/container';
import type { Constructor } from '../types';

/**
 * Reliably distinguishes a class constructor from a factory function.
 *
 * The previous `fn.prototype.constructor === fn` heuristic was true for EVERY
 * ordinary (non-arrow) function, so a named factory like
 * `function makeVm() { return new Vm(); }` was misclassified as a class and
 * routed through the DI container + `new`. Checking the source string only
 * matches real `class` declarations, so both arrow and named factories are
 * correctly treated as factories.
 */
function isClassConstructor(fn: unknown): boolean {
  return (
    typeof fn === 'function' &&
    /^class[\s{]/.test(Function.prototype.toString.call(fn))
  );
}

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
  // Keep the latest factory/class without re-creating the instance on re-render.
  const factoryRef = useRef(factoryOrClass);
  factoryRef.current = factoryOrClass;

  const create = (): T => {
    const f = factoryRef.current;
    return isClassConstructor(f)
      ? createViewModelInstance(f as Constructor<T>)
      : (f as () => T)();
  };

  // Created once via the lazy initializer; the instance survives re-renders.
  const [viewModel, setViewModel] = useState<T>(create);

  // Always points at the live instance so the unmount cleanup clears whichever
  // instance is current (important under the StrictMode re-create path below).
  const viewModelRef = useRef(viewModel);
  viewModelRef.current = viewModel;

  // Tracks whether the cleanup below has already cleared the current instance.
  const clearedRef = useRef(false);

  // Exposes the ViewModel name in React DevTools.
  const label =
    typeof factoryOrClass === 'function' && 'name' in factoryOrClass
      ? factoryOrClass.name
      : 'CustomViewModel';
  useDebugValue(label);

  useEffect(() => {
    // Under React 18/19 StrictMode the effect runs setup -> cleanup -> setup
    // WITHOUT re-running render. The first cleanup calls clear() (which is
    // irreversible: destroy$ completes, the AbortController aborts). If we did
    // nothing here, the component would stay bound to that torn-down instance.
    // So when re-entering setup after a clear, build a fresh instance and push
    // it into state to re-render with a live ViewModel.
    if (clearedRef.current) {
      clearedRef.current = false;
      const fresh = create();
      viewModelRef.current = fresh;
      setViewModel(fresh);
    }

    return () => {
      clearedRef.current = true;
      viewModelRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return viewModel;
}
