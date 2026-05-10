import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

/**
 * useStream<T> — Subscribe to an RxJS Observable and sync it to React state.
 *
 * Direct analogies:
 * - `collectAsState()` in Jetpack Compose
 * - `StreamBuilder` in Flutter
 * - `.sink` + `@Published` in SwiftUI
 *
 * This hook only triggers a re-render when a **new value** is emitted by the
 * Observable, preventing unnecessary renders.
 *
 * ## Usage
 *
 * ```tsx
 * import { useStream } from 'react-native-mobile-mvvm';
 *
 * const CounterScreen = () => {
 *   const viewModel = useViewModel(CounterViewModel);
 *
 *   // Auto-subscribes and auto-unsubscribes — no manual useEffect needed
 *   const count = useStream(viewModel.count$, 0);
 *   const isLoading = useStream(viewModel.isLoading$, false);
 *
 *   return <Text>{count}</Text>;
 * };
 * ```
 *
 * @param observable$ - The RxJS Observable to subscribe to
 * @param defaultValue - Initial value returned before the Observable emits for the first time
 * @returns The latest value emitted by the Observable, or `defaultValue` if not yet emitted
 */
export function useStream<T>(observable$: Observable<T>, defaultValue: T): T {
  const [state, setState] = useState<T>(() => {
    // Eagerly read the current value on init to avoid a flicker render with defaultValue.
    // BehaviorSubject (StateFlow) emits synchronously on subscribe, so this captures
    // the current value before the first paint. Plain Observables fall back to defaultValue.
    let current = defaultValue;
    const sub = observable$.subscribe((v) => {
      current = v;
    });
    sub.unsubscribe();
    return current;
  });

  useEffect(() => {
    const subscription = observable$.subscribe({
      next: (value) => setState(value),
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable$]);

  return state;
}
