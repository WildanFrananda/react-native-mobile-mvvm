import { container } from 'tsyringe';
import type { Constructor } from '../types';

/**
 * Checks whether the DI container can resolve the given token.
 * This allows `useViewModel` to work with or without DI configuration.
 */
function tryResolveFromContainer<T>(ViewModelClass: Constructor<T>): T | null {
  try {
    return container.resolve(ViewModelClass as never);
  } catch {
    return null;
  }
}

/**
 * Creates a ViewModel instance — prioritises DI container resolution,
 * falls back to `new ClassName()` if the class is not registered.
 *
 * Resolution order (analogous to Hilt with a manual instantiation fallback):
 * 1. Attempt resolution from the tsyringe container (if class is decorated with @injectable)
 * 2. Fall back to `new ViewModelClass()` (for simple ViewModels without DI)
 */
export function createViewModelInstance<T>(ViewModelClass: Constructor<T>): T {
  const resolved = tryResolveFromContainer(ViewModelClass);
  if (resolved !== null) {
    return resolved;
  }
  return new ViewModelClass();
}

/**
 * Configures the global DI container.
 *
 * Call this function **once** at the application entry point (App.tsx or index.ts),
 * before any component renders. Analogous to `GetIt.instance.registerSingleton()`
 * or the `@HiltAndroidApp` Application class in Android.
 *
 * @example
 * ```ts
 * // App.tsx
 * import 'reflect-metadata'; // MUST be imported first!
 * import { configureDI } from 'react-native-mobile-mvvm/di';
 * import { container } from 'tsyringe';
 *
 * configureDI(() => {
 *   container.register('AuthRepository', { useClass: AuthRepositoryImpl });
 *   container.register('ApiService', { useClass: ApiServiceImpl });
 * });
 * ```
 */
export function configureDI(setup: () => void): void {
  setup();
}

/**
 * Direct access to the tsyringe container for manual registration or resolution.
 * Use this when `configureDI` is not flexible enough for a specific use case.
 */
export { container as getContainer } from 'tsyringe';
