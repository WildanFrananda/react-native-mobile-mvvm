import React, { createContext, useContext, useEffect, useRef, useDebugValue } from 'react';
import type { ViewModel } from '../core/ViewModel';
import { createViewModelInstance } from '../di/container';
import type { Constructor } from '../types';

type ViewModelStore = Map<Constructor<ViewModel>, ViewModel>;

const ViewModelScopeContext = createContext<ViewModelStore | null>(null);

/**
 * ViewModelScope — Provides a shared ViewModel store to all descendants.
 *
 * Direct analogies:
 * - `hiltViewModel(navBackStackEntry)` scoped to a nav graph in Compose
 * - `MultiProvider` / `InheritedWidget` scope in Flutter
 * - `@EnvironmentObject` scope in SwiftUI
 *
 * All components inside a `<ViewModelScope>` that call `useScopedViewModel(SameClass)`
 * receive the **same instance**. The instance is created on first access and cleared
 * when the scope unmounts — not when any individual component unmounts.
 *
 * ## Usage — wrap a navigator or screen group
 *
 * ```tsx
 * // AppNavigator.tsx
 * import { ViewModelScope } from 'react-native-mobile-mvvm';
 *
 * export const CheckoutNavigator = () => (
 *   <ViewModelScope>
 *     <Stack.Navigator>
 *       <Stack.Screen name="Cart" component={CartScreen} />
 *       <Stack.Screen name="Checkout" component={CheckoutScreen} />
 *       <Stack.Screen name="Payment" component={PaymentScreen} />
 *     </Stack.Navigator>
 *   </ViewModelScope>
 * );
 * ```
 *
 * All three screens share the same `CheckoutViewModel` instance:
 *
 * ```tsx
 * // CartScreen.tsx
 * const vm = useScopedViewModel(CheckoutViewModel);
 *
 * // CheckoutScreen.tsx — same instance as CartScreen
 * const vm = useScopedViewModel(CheckoutViewModel);
 * ```
 *
 * The ViewModel is cleared (subscriptions cancelled, fetch aborted)
 * when `<ViewModelScope>` itself unmounts — e.g. when the user leaves
 * the checkout flow entirely.
 */
export function ViewModelScope({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const storeRef = useRef<ViewModelStore>(new Map());

  useEffect(() => {
    const store = storeRef.current;
    return () => {
      store.forEach((vm) => vm.onCleared());
      store.clear();
    };
  }, []);

  return (
    <ViewModelScopeContext.Provider value={storeRef.current}>
      {children}
    </ViewModelScopeContext.Provider>
  );
}

/**
 * useScopedViewModel<T> — Resolves a shared ViewModel from the nearest ViewModelScope.
 *
 * Unlike `useViewModel`, this hook does NOT create a new instance per component.
 * All components inside the same `<ViewModelScope>` share the same instance.
 *
 * The ViewModel is NOT cleared when the component unmounts — it lives until
 * the `<ViewModelScope>` itself unmounts.
 *
 * **Must be used inside a `<ViewModelScope>`.** Throws if no scope is found.
 *
 * ```tsx
 * // Both screens get the same CheckoutViewModel instance
 * const vm = useScopedViewModel(CheckoutViewModel);
 * ```
 *
 * @param ViewModelClass - The ViewModel class to resolve from the scope
 * @returns The shared ViewModel instance for this scope
 * @throws If called outside of a `<ViewModelScope>`
 */
export function useScopedViewModel<T extends ViewModel>(
  ViewModelClass: Constructor<T>,
): T {
  const store = useContext(ViewModelScopeContext);

  if (store === null) {
    throw new Error(
      `useScopedViewModel(${ViewModelClass.name}) was called outside of a <ViewModelScope>.\n` +
        'Wrap the parent navigator or screen group with <ViewModelScope>.',
    );
  }

  if (!store.has(ViewModelClass as Constructor<ViewModel>)) {
    store.set(
      ViewModelClass as Constructor<ViewModel>,
      createViewModelInstance(ViewModelClass),
    );
  }

  // Exposes the ViewModel class name in React DevTools (dev only)
  useDebugValue(ViewModelClass.name);

  return store.get(ViewModelClass as Constructor<ViewModel>) as T;
}
