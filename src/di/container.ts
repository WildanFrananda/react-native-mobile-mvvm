import { container } from 'tsyringe';
import type { Constructor } from '../types';

/**
 * True when a class opted into DI — i.e. it carries `design:paramtypes`
 * metadata, emitted by TypeScript's `emitDecoratorMetadata` for any class that
 * has an `@Injectable`/`@Inject`/other decorator (requires the reflect-metadata
 * polyfill to be loaded).
 *
 * Read defensively: `Reflect.getMetadata` only exists when reflect-metadata is
 * present, and undecorated classes have no such metadata.
 */
function hasDiMetadata(target: Constructor): boolean {
  const reflect = Reflect as {
    getMetadata?: (key: string, target: unknown) => unknown;
  };
  return (
    typeof reflect.getMetadata === 'function' &&
    reflect.getMetadata('design:paramtypes', target) !== undefined
  );
}

/**
 * Creates a ViewModel instance — prioritises DI container resolution,
 * falls back to `new ClassName()` only for ViewModels that did not opt into DI.
 *
 * Resolution order (analogous to Hilt with a manual instantiation fallback):
 * 1. Attempt resolution from the tsyringe container (works for `@Injectable`
 *    classes and explicitly registered tokens).
 * 2. If resolution fails:
 *    - For a class that opted into DI (decorated → has `design:paramtypes`
 *      metadata), re-throw. A failure here is a real DI misconfiguration — most
 *      commonly a dependency that was never registered — and falling back to
 *      `new ViewModelClass()` would silently build the instance with `undefined`
 *      dependencies, hiding the real cause behind a later, unrelated `TypeError`.
 *      Re-throwing keeps the actionable "cannot inject the dependency …" message.
 *    - For a plain (undecorated) class, fall back to `new ViewModelClass()` —
 *      the "simple ViewModel without DI" path.
 *
 * The DI opt-in is detected via decorator metadata rather than constructor
 * arity: `ViewModelClass.length` cannot distinguish a required dependency from
 * an optional one (`constructor(dep?: X)` still has length 1), so an arity gate
 * would wrongly throw for a plain class that merely declares an optional param.
 */
export function createViewModelInstance<T>(ViewModelClass: Constructor<T>): T {
  try {
    return container.resolve<T>(ViewModelClass as never);
  } catch (error) {
    if (hasDiMetadata(ViewModelClass as Constructor)) {
      throw error;
    }
    return new ViewModelClass();
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
