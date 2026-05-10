import { useEffect } from 'react';

/**
 * useLifecycle — Run a callback on mount and a cleanup callback on unmount.
 *
 * Covers the lifecycle pattern where you need to **start** a resource when
 * the component appears and **stop** it when it disappears.
 *
 * ## When to use `useInit` vs `useLifecycle`
 *
 * | Hook | Use when… |
 * |---|---|
 * | `useInit(fn)` | Trigger a one-shot action on mount. No cleanup needed (e.g. `vm.fetchUser()`) |
 * | `useLifecycle(onMount, onUnmount)` | Start a resource on mount **and** stop it on unmount |
 *
 * ## Examples
 *
 * ### Location tracking
 *
 * ```tsx
 * const MapScreen = () => {
 *   const vm = useViewModel(MapViewModel);
 *
 *   useLifecycle(
 *     () => vm.startLocationTracking(),
 *     () => vm.stopLocationTracking(),
 *   );
 *
 *   const location = useStream(vm.location$, null);
 *   // ...
 * };
 * ```
 *
 * ### WebSocket connection
 *
 * ```tsx
 * const ChatScreen = () => {
 *   const vm = useViewModel(ChatViewModel);
 *
 *   useLifecycle(
 *     () => vm.connectWebSocket(),
 *     () => vm.disconnectWebSocket(),
 *   );
 *
 *   const messages = useStream(vm.messages$, []);
 *   // ...
 * };
 * ```
 *
 * ### Sensor / hardware listener
 *
 * ```tsx
 * const StepCounterScreen = () => {
 *   const vm = useViewModel(StepCounterViewModel);
 *
 *   useLifecycle(
 *     () => vm.startPedometerUpdates(),
 *     () => vm.stopPedometerUpdates(),
 *   );
 * };
 * ```
 *
 * ### Analytics session
 *
 * ```tsx
 * useLifecycle(
 *   () => vm.trackScreenEnter('HomeScreen'),
 *   () => vm.trackScreenExit('HomeScreen'),
 * );
 * ```
 *
 * Common use cases:
 * - GPS / location tracking
 * - WebSocket connections
 * - Bluetooth / sensor listeners
 * - Analytics session tracking
 * - Background timers that need explicit cancellation
 *
 * @param onMount   - Called once when the component mounts
 * @param onUnmount - Called once when the component unmounts (guaranteed)
 */
export function useLifecycle(onMount: () => void, onUnmount: () => void): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onMount();
    return onUnmount;
  }, []);
}
