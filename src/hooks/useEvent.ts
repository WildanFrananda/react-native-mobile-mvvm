import { useEffect } from 'react';
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
 * IMPORTANT: Wrap `handler` in `useCallback` to avoid re-subscribing on every render.
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
 *   useEvent(
 *     vm.navigateTo$,
 *     useCallback((route) => navigate(route), [navigate]),
 *   );
 *
 *   useEvent(
 *     vm.showSnackbar$,
 *     useCallback((msg) => Snackbar.show({ text: msg }), []),
 *   );
 *
 *   return <View>...</View>;
 * };
 * ```
 *
 * @param observable$ - The EventFlow observable (do NOT pass a StateFlow here)
 * @param handler - Side-effect callback — wrap in `useCallback` to keep it stable
 */
export function useEvent<T>(
  observable$: Observable<T>,
  handler: (value: T) => void,
): void {
  useEffect(() => {
    const subscription = observable$.subscribe({ next: handler });
    return () => subscription.unsubscribe();
  }, [observable$, handler]);
}
