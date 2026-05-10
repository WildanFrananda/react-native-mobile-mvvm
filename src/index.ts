/**
 * react-native-mobile-mvvm
 *
 * MVVM Architecture Standard for React Native with a Developer Experience
 * equivalent to Jetpack Compose, Flutter BLoC/Provider, and SwiftUI.
 *
 * ## Core imports
 * ```ts
 * import { ViewModel, StateFlow, useViewModel, useStream } from 'react-native-mobile-mvvm';
 * ```
 *
 * ## DI imports (optional)
 * ```ts
 * import { Injectable, Inject, configureDI } from 'react-native-mobile-mvvm/di';
 * ```
 *
 * ## Quick Start
 *
 * ### 1. Define a ViewModel
 * ```ts
 * export class CounterViewModel extends ViewModel {
 *   private _count = new StateFlow<number>(0);
 *   public readonly count$ = this._count.asObservable();
 *
 *   increment() { this._count.value += 1; }
 *   decrement() { this._count.value -= 1; }
 * }
 * ```
 *
 * ### 2. Use it in a Screen
 * ```tsx
 * const CounterScreen = () => {
 *   const vm = useViewModel(CounterViewModel);
 *   const count = useStream(vm.count$, 0);
 *
 *   return (
 *     <View>
 *       <Text>{count}</Text>
 *       <Button onPress={() => vm.increment()} title="+" />
 *     </View>
 *   );
 * };
 * ```
 */

// Core — ViewModel, StateFlow, EventFlow, ComputedStateFlow & UiState
export { ViewModel } from './core/ViewModel';
export { StateFlow } from './core/StateFlow';
export { EventFlow } from './core/EventFlow';
export { ComputedStateFlow } from './core/ComputedStateFlow';
export { UiState } from './core/UiState';
export type { UiState as UiStateType } from './core/UiState';

// Hooks — React UI Bindings
export { useViewModel } from './hooks/useViewModel';
export { useStream } from './hooks/useStream';
export { useEvent } from './hooks/useEvent';
export { useInit } from './hooks/useInit';
export { useLifecycle } from './hooks/useLifecycle';
export { useUiState } from './hooks/useUiState';
export type { UiStateResult } from './hooks/useUiState';

// Scoping — Shared ViewModels across components
export { ViewModelScope, useScopedViewModel } from './scope/ViewModelScope';

// Types
export type { Constructor, InjectionToken } from './types';
