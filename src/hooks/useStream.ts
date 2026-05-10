import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Observable, Subscription } from 'rxjs';
import type { ReadOnlyStateFlow } from '../core/StateFlow';

/**
 * useStream<T> — Subscribe to an RxJS Observable or ReadOnlyStateFlow and sync it to React state.
 *
 * Direct analogies:
 * - `collectAsState()` in Jetpack Compose
 * - `StreamBuilder` in Flutter
 * - `.sink` + `@Published` in SwiftUI
 *
 * This hook only triggers a re-render when a **new value** is emitted, preventing unnecessary renders.
 *
 * ## Usage
 *
 * ```tsx
 * import { useStream } from 'react-native-mobile-mvvm';
 *
 * const CounterScreen = () => {
 *   const viewModel = useViewModel(CounterViewModel);
 *
 *   // ✅ Direct pass — no need for .asObservable()
 *   const count = useStream(viewModel.count$, 0);
 *   const isLoading = useStream(viewModel.isLoading$, false);
 *
 *   return <Text>{count}</Text>;
 * };
 * ```
 *
 * @param source - The RxJS Observable or ReadOnlyStateFlow to subscribe to
 * @param defaultValue - Initial value returned before the source emits for the first time
 * @returns The latest value emitted by the source, or `defaultValue` if not yet emitted
 */
export function useStream<T>(
  source: Observable<T> | ReadOnlyStateFlow<T>,
  defaultValue: T,
): T {
  const observable$ = 'asObservable' in source ? source.asObservable() : source;

  const [state, setState] = useState<T>(() => {
    // Eagerly read the current value on init to avoid a flicker render with defaultValue.
    // If it's a ReadOnlyStateFlow, we can read the .value property directly.
    if ('value' in source) {
      return source.value;
    }

    // Otherwise, check if it's a BehaviorSubject (or similar) that emits synchronously.
    let current = defaultValue;
    const sub = observable$.subscribe((v) => {
      current = v;
    });
    sub.unsubscribe();
    return current;
  });

  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    const subscribe = () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = observable$.subscribe({
        next: (value) => setState(value),
      });
    };

    subscribe();

    // Analog to collectAsStateWithLifecycle() in Compose — pause subscription
    // when app goes to background, resume on foreground. Prevents unnecessary
    // state updates while UI is not visible and saves battery.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        subscribe(); // resubscribe — replays latest value immediately if it's a BehaviorSubject
      } else {
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = null;
      }
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
      appStateSub.remove();
    };
  }, [observable$]);

  return state;
}
