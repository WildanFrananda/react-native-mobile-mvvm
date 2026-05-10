import { useEffect, useRef } from 'react';
import { Observable } from 'rxjs';

/**
 * useEvent<T> — Subscribe to a one-shot EventFlow and handle it without re-rendering.
 *
 * Direct analogies:
 * - `BlocListener` in Flutter BLoC
 * - `LaunchedEffect` + `collectLatest` on a `SharedFlow` in Compose
 * - `.sink` storing in `AnyCancellable` in SwiftUI/Combine
 *
 * Unlike `useStream`, this hook does NOT store the value in React state.
 * It is side-effect only — navigation, showing a snackbar, playing a sound, etc.
 *
 * This hook is optimized with a "latest ref" pattern, meaning it will NOT
 * re-subscribe even if the `handler` function reference changes between renders.
 * This makes it safe to use inline arrow functions without `useCallback`.
 *
 * ## Usage
 *
 * ```tsx
 * import { useEvent } from 'react-native-mobile-mvvm';
 *
 * const CheckoutScreen = () => {
 *   const vm = useViewModel(CheckoutViewModel);
 *   const { navigate } = useNavigation();
 *
 *   // Safe to use inline functions — no re-subscription on re-render!
 *   useEvent(vm.navigateTo$, (route) => {
 *     navigate(route);
 *   });
 *
 *   return <View>...</View>;
 * };
 * ```
 *
 * @param observable$ - The EventFlow observable (do NOT pass a StateFlow here)
 * @param handler - Side-effect callback.
 */
export function useEvent<T>(
  observable$: Observable<T>,
  handler: (value: T) => void,
): void {
  // Use a ref to store the latest handler. This ensures that the subscription
  // always calls the most recent version of the handler without needing
  // to re-subscribe (which could cause missed events).
  const handlerRef = useRef(handler);

  // Update the ref on every render to the latest handler version.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const subscription = observable$.subscribe({
      next: (value) => {
        handlerRef.current(value);
      },
    });

    return () => subscription.unsubscribe();
  }, [observable$]);
}
