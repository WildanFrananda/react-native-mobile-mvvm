/**
 * Sub-entry point: `react-native-mobile-mvvm/di`
 *
 * Kept as a separate import path so that tree-shakers can exclude
 * the entire DI module if the consuming project does not use it:
 *
 * ```ts
 * import { Injectable, Inject } from 'react-native-mobile-mvvm/di';
 * import { configureDI } from 'react-native-mobile-mvvm/di';
 * ```
 */
export { Injectable, Singleton, Inject, AutoInjectable, Scoped, Registry } from './decorators';
export { configureDI, getContainer, createViewModelInstance } from './container';
