/**
 * DI Decorators — Clean re-exports from tsyringe with intuitive aliases
 * for developers familiar with Android or Flutter.
 *
 * Analogies:
 * - `@Injectable` ≈ `@HiltViewModel` (Android) / `@injectable` (GetIt/Flutter)
 * - `@Singleton`  ≈ `@Singleton` (Hilt) / `registerSingleton` (GetIt)
 * - `@Inject`     ≈ `@Inject` (Hilt) / constructor injection (GetIt)
 *
 * ## Usage
 *
 * ```ts
 * import 'reflect-metadata'; // MUST be imported once at the entry point!
 * import { Injectable, Inject } from 'react-native-mobile-mvvm/di';
 * import { ViewModel } from 'react-native-mobile-mvvm';
 *
 * @Injectable()
 * export class UserViewModel extends ViewModel {
 *   constructor(
 *     @Inject('AuthRepository') private authRepo: AuthRepository,
 *     @Inject('ApiService') private api: ApiService,
 *   ) {
 *     super();
 *   }
 *
 *   async fetchProfile() {
 *     const user = await this.authRepo.getUser({
 *       signal: this.abortController.signal,
 *     });
 *     // ...
 *   }
 * }
 * ```
 */
export {
  injectable as Injectable,
  singleton as Singleton,
  inject as Inject,
  autoInjectable as AutoInjectable,
  scoped as Scoped,
  registry as Registry,
} from 'tsyringe';
