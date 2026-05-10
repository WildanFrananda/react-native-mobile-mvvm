/**
 * Generic constructor type — used by useViewModel to accept a class
 * as an argument (not an instance), following the pattern used in Angular / tsyringe.
 *
 * @example
 * function useViewModel<T extends ViewModel>(cls: Constructor<T>): T
 */
export type Constructor<T = unknown> = new (...args: unknown[]) => T;

/**
 * DI injection token — can be a string, symbol, or class constructor.
 * Analogous to `InjectionToken` in Angular or a qualifier annotation in Hilt.
 */
export type InjectionToken<T = unknown> = string | symbol | Constructor<T>;
