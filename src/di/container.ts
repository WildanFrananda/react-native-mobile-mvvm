import { container } from 'tsyringe';
import type { Constructor } from '../types';

/**
 * Creates a ViewModel instance — prioritises DI container resolution,
 * falls back to `new ClassName()` only for dependency-free ViewModels.
 *
 * Resolution order (analogous to Hilt with a manual instantiation fallback):
 * 1. Attempt resolution from the tsyringe container (works for `@injectable`
 *    classes and explicitly registered tokens).
 * 2. If resolution fails AND the class declares no constructor parameters,
 *    fall back to `new ViewModelClass()` — the "simple ViewModel without DI" path.
 *
 * If resolution fails for a class that DOES declare constructor parameters, the
 * original tsyringe error is re-thrown rather than swallowed. Falling back to
 * `new ViewModelClass()` there would construct the ViewModel with `undefined`
 * dependencies and hide the real cause (usually a missing registration),
 * surfacing later as an unrelated `TypeError`. Re-throwing keeps the actionable
 * "cannot inject the dependency …" diagnostic.
 */
export function createViewModelInstance<T>(ViewModelClass: Constructor<T>): T {
  try {
    return container.resolve<T>(ViewModelClass as never);
  } catch (error) {
    if (ViewModelClass.length === 0) {
      return new ViewModelClass();
    }
    throw error;
  }
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
