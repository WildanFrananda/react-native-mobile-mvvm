<div align="center">

# react-native-mobile-mvvm

**MVVM Architecture for React Native — Compose & Flutter DX**

Bring the developer experience of Jetpack Compose, Flutter BLoC, and SwiftUI into React Native.  
Clean lifecycle management, reactive state, and dependency injection — all in one package.

[![npm version](https://img.shields.io/npm/v/react-native-mobile-mvvm?color=crimson&style=flat-square)](https://www.npmjs.com/package/react-native-mobile-mvvm)
[![npm downloads](https://img.shields.io/npm/dm/react-native-mobile-mvvm?style=flat-square)](https://www.npmjs.com/package/react-native-mobile-mvvm)
[![CI](https://img.shields.io/github/actions/workflow/status/wildanrailfans/react-native-mobile-mvvm/release.yml?label=CI&style=flat-square)](https://github.com/wildanrailfans/react-native-mobile-mvvm/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## Why?

React Native lacks an opinionated architecture standard. Teams coming from Android or Flutter are forced to learn a completely different mental model — hooks, context, and global stores — from scratch.

This package solves that by providing **6 core modules** that map directly to patterns you already know:

| This Package | Android/Compose | Flutter | SwiftUI |
|---|---|---|---|
| `ViewModel` | `ViewModel` + `viewModelScope` | `ChangeNotifier` + `dispose()` | `ObservableObject` |
| `StateFlow<T>` | `MutableStateFlow<T>` | `BehaviorSubject` | `@Published` |
| `EventFlow<T>` | `SharedFlow(replay=0)` / `Channel` | `StreamController` one-shot | `PassthroughSubject` |
| `useViewModel()` | `hiltViewModel()` | `context.watch<T>()` | `@StateObject` |
| `useStream()` | `collectAsState()` | `StreamBuilder` | `.sink` + `@Published` |
| `useEvent()` | `LaunchedEffect` + `SharedFlow` | `BlocListener` | `.onReceive` |
| `@Injectable` | `@HiltViewModel` | `@injectable` (GetIt) | — |

### StateFlow vs EventFlow — When to use which

| | `StateFlow<T>` | `EventFlow<T>` |
|---|---|---|
| **Purpose** | UI state | One-shot side effects |
| **Replay** | Yes — new subscribers get the last value | No — emit once, done |
| **Examples** | `isLoading`, `user`, `formData` | Navigation, snackbar, dialog |
| **Hook** | `useStream()` | `useEvent()` |

---

## Installation

```bash
# npm
npm install react-native-mobile-mvvm rxjs

# yarn
yarn add react-native-mobile-mvvm rxjs

# pnpm
pnpm add react-native-mobile-mvvm rxjs
```

### With Dependency Injection (optional)

If you want to use `@Injectable`, `@Inject`, and `configureDI()`:

```bash
npm install tsyringe reflect-metadata
```

Then enable decorator support in your **`tsconfig.json`**:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Quick Start

### 1. Define a ViewModel

```ts
// CounterViewModel.ts
import { ViewModel, StateFlow } from 'react-native-mobile-mvvm';

export class CounterViewModel extends ViewModel {
  private _count = new StateFlow<number>(0);

  // Expose a read-only stream to the UI
  public readonly count$ = this._count.asObservable();

  increment() {
    this._count.value += 1;
  }

  decrement() {
    this._count.value -= 1;
  }
}
```

### 2. Use it in a Screen

```tsx
// CounterScreen.tsx
import { useViewModel, useStream } from 'react-native-mobile-mvvm';
import { CounterViewModel } from './CounterViewModel';

const CounterScreen = () => {
  // Lifecycle is managed automatically — no useEffect, no cleanup boilerplate
  const vm = useViewModel(CounterViewModel);

  // Subscribes automatically, unsubscribes on unmount
  const count = useStream(vm.count$, 0);

  return (
    <View>
      <Text style={{ fontSize: 48 }}>{count}</Text>
      <Button onPress={() => vm.increment()} title="+" />
      <Button onPress={() => vm.decrement()} title="−" />
    </View>
  );
};
```

That's it. No `useEffect`. No `useState`. No manual cleanup.

---

## API Reference

### `ViewModel`

Abstract base class for all ViewModels. Extend it and override `onCleared()` for custom cleanup.

```ts
import { ViewModel } from 'react-native-mobile-mvvm';

export class MyViewModel extends ViewModel {
  override onCleared() {
    super.onCleared(); // always call super
    // your custom cleanup here
  }
}
```

#### Protected Members

| Member | Type | Description |
|---|---|---|
| `destroy$` | `Observable<void>` | Emits once when the component unmounts. Use with `takeUntil(this.destroy$)` to auto-cancel RxJS subscriptions. |
| `abortController` | `AbortController` | Pass `this.abortController.signal` to `fetch()` to cancel in-flight requests on unmount. |

#### Methods

| Method | Description |
|---|---|
| `onCleared()` | Called automatically on unmount. Override for custom cleanup. Always call `super.onCleared()`. |

**Example — cancelling a fetch request:**

```ts
export class UserViewModel extends ViewModel {
  private _user = new StateFlow<User | null>(null);
  public readonly user$ = this._user.asObservable();

  async fetchUser(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        signal: this.abortController.signal, // auto-cancelled on unmount
      });
      this._user.value = await res.json();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    }
  }
}
```

**Example — auto-cancelling an RxJS stream:**

```ts
import { interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class TimerViewModel extends ViewModel {
  private _tick = new StateFlow<number>(0);
  public readonly tick$ = this._tick.asObservable();

  constructor() {
    super();
    interval(1000)
      .pipe(takeUntil(this.destroy$)) // stops automatically on unmount
      .subscribe((n) => (this._tick.value = n));
  }
}
```

---

### `StateFlow<T>`

A reactive state container backed by RxJS `BehaviorSubject`. Analogous to `MutableStateFlow<T>` in Kotlin.

```ts
const _count = new StateFlow<number>(0);

_count.value;           // Read current value synchronously
_count.value = 42;      // Mutate — all subscribers are notified
_count.asObservable();  // Expose a read-only stream to the UI
```

#### Constructor

| Parameter | Type | Description |
|---|---|---|
| `initialValue` | `T` | The starting value of the state. |

#### Members

| Member | Type | Description |
|---|---|---|
| `value` | `T` (get/set) | Read or write the current state synchronously. |
| `asObservable()` | `Observable<T>` | Returns a read-only stream. The UI cannot call `.next()` directly. |

**Recommended pattern — keep mutation inside the ViewModel:**

```ts
export class FormViewModel extends ViewModel {
  // Private & mutable — only the ViewModel can mutate this
  private _email = new StateFlow<string>('');
  private _isValid = new StateFlow<boolean>(false);

  // Public & read-only — the UI observes these
  public readonly email$ = this._email.asObservable();
  public readonly isValid$ = this._isValid.asObservable();

  onEmailChanged(value: string) {
    this._email.value = value;
    this._isValid.value = value.includes('@');
  }
}
```

---

### `useViewModel<T>(ViewModelClass)`

Creates and binds a ViewModel to the React component lifecycle.

```ts
const vm = useViewModel(MyViewModel);
```

| Parameter | Type | Description |
|---|---|---|
| `ViewModelClass` | `Constructor<T extends ViewModel>` | The ViewModel **class** (not an instance). |

**Behaviour:**
- Creates the instance **once** on mount (never recreates on re-render).
- Resolves dependencies from the DI container if `@Injectable()` is present.
- Calls `viewModel.onCleared()` automatically on unmount.

---

### `useStream<T>(observable$, defaultValue)`

Subscribes to an RxJS `Observable` and returns its latest value as React state.

```ts
const count = useStream(vm.count$, 0);
```

| Parameter | Type | Description |
|---|---|---|
| `observable$` | `Observable<T>` | The RxJS stream to subscribe to. |
| `defaultValue` | `T` | Returned before the first emission. |

**Behaviour:**
- Subscribes on mount, unsubscribes on unmount.
- Re-subscribes if the `observable$` reference changes.
- Only triggers a re-render when the value actually changes.
- For `StateFlow` (BehaviorSubject), reads the current value synchronously on first render — no flicker with `defaultValue`.

---

### `EventFlow<T>`

A fire-and-forget event stream. Does **not** replay to new subscribers — emit once, done.  
Analogous to `SharedFlow(replay=0)` / `Channel` in Kotlin, or `StreamController` one-shot in Flutter.

Use `EventFlow` for one-time side effects: **navigation, snackbars, dialogs, toasts**.  
Use `StateFlow` for anything the UI needs to display.

```ts
// CheckoutViewModel.ts
import { ViewModel, StateFlow, EventFlow } from 'react-native-mobile-mvvm';

export class CheckoutViewModel extends ViewModel {
  // State — useStream() reads this
  private _isLoading = new StateFlow<boolean>(false);
  public readonly isLoading$ = this._isLoading.asObservable();

  // Events — useEvent() listens to these, never replayed
  private _navigateTo = new EventFlow<string>();
  private _showSnackbar = new EventFlow<string>();

  public readonly navigateTo$ = this._navigateTo.asObservable();
  public readonly showSnackbar$ = this._showSnackbar.asObservable();

  async placeOrder() {
    this._isLoading.value = true;
    try {
      await fetch('/api/orders', {
        method: 'POST',
        signal: this.abortController.signal,
      });
      // Fire once — new subscribers will NOT receive this
      this._navigateTo.emit('OrderSuccessScreen');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        this._showSnackbar.emit('Order failed. Please try again.');
      }
    } finally {
      this._isLoading.value = false;
    }
  }
}
```

#### Members

| Member | Type | Description |
|---|---|---|
| `emit(value)` | `void` | Fires the event to all current subscribers. New subscribers will not receive it. |
| `asObservable()` | `Observable<T>` | Exposes a read-only stream to the UI. |

---

### `useEvent<T>(observable$, handler)`

Subscribes to an `EventFlow` observable and runs a side-effect callback — **without causing a re-render**.  
Analogous to `BlocListener` in Flutter or `LaunchedEffect` + `collectLatest` in Compose.

> **Do not use `useStream` for EventFlow.** `useStream` stores state and triggers re-renders, which is wrong for fire-and-forget events.

```tsx
// CheckoutScreen.tsx
import { useCallback } from 'react';
import { useViewModel, useStream, useEvent } from 'react-native-mobile-mvvm';
import { useNavigation } from '@react-navigation/native';
import { CheckoutViewModel } from './CheckoutViewModel';

const CheckoutScreen = () => {
  const vm = useViewModel(CheckoutViewModel);
  const navigation = useNavigation();

  // State — renders when isLoading changes
  const isLoading = useStream(vm.isLoading$, false);

  // Events — side effects only, no re-render
  useEvent(
    vm.navigateTo$,
    useCallback((route) => {
      navigation.navigate(route as never);
    }, [navigation]),
  );

  useEvent(
    vm.showSnackbar$,
    useCallback((message) => {
      // Your snackbar library of choice
      Snackbar.show({ text: message, duration: Snackbar.LENGTH_SHORT });
    }, []),
  );

  return (
    <View>
      <Button
        title={isLoading ? 'Placing order...' : 'Place Order'}
        disabled={isLoading}
        onPress={() => vm.placeOrder()}
      />
    </View>
  );
};
```

> **Tip:** Always wrap `handler` in `useCallback`. An unstable function reference causes `useEvent` to re-subscribe on every render.

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `observable$` | `Observable<T>` | The EventFlow observable to listen to. |
| `handler` | `(value: T) => void` | Side-effect callback. Wrap in `useCallback` to keep it stable. |

**Behaviour:**
- Does NOT store the value in React state — no re-render.
- Subscribes on mount, unsubscribes on unmount.
- Re-subscribes if `observable$` or `handler` reference changes.

---

## Dependency Injection

The DI module is optional and lives in a separate sub-entry point to keep the core bundle lean.

### Setup — call once at the app entry point

```ts
// App.tsx or index.ts — must be the very first import
import 'reflect-metadata';

import { configureDI } from 'react-native-mobile-mvvm/di';
import { container } from 'tsyringe';

import { AuthRepositoryImpl } from './data/AuthRepositoryImpl';
import { ApiService } from './data/ApiService';

configureDI(() => {
  container.register('AuthRepository', { useClass: AuthRepositoryImpl });
  container.registerSingleton('ApiService', ApiService);
});
```

### Define an injectable ViewModel

```ts
// LoginViewModel.ts
import { ViewModel, StateFlow } from 'react-native-mobile-mvvm';
import { Injectable, Inject } from 'react-native-mobile-mvvm/di';
import type { AuthRepository } from '../domain/AuthRepository';

@Injectable()
export class LoginViewModel extends ViewModel {
  private _isLoading = new StateFlow<boolean>(false);
  private _error = new StateFlow<string | null>(null);

  public readonly isLoading$ = this._isLoading.asObservable();
  public readonly error$ = this._error.asObservable();

  constructor(
    @Inject('AuthRepository') private authRepo: AuthRepository,
  ) {
    super();
  }

  async login(email: string, password: string) {
    this._isLoading.value = true;
    this._error.value = null;
    try {
      await this.authRepo.login(email, password, {
        signal: this.abortController.signal,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        this._error.value = (e as Error).message;
      }
    } finally {
      this._isLoading.value = false;
    }
  }

  override onCleared() {
    super.onCleared();
    console.log('LoginViewModel cleared');
  }
}
```

### Use in a screen

```tsx
// LoginScreen.tsx
import { useViewModel, useStream } from 'react-native-mobile-mvvm';
import { LoginViewModel } from './LoginViewModel';

const LoginScreen = () => {
  const vm = useViewModel(LoginViewModel); // AuthRepository is auto-injected

  const isLoading = useStream(vm.isLoading$, false);
  const error = useStream(vm.error$, null);

  return (
    <View>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <TextInput onChangeText={(t) => { /* ... */ }} />
      <Button
        title={isLoading ? 'Logging in...' : 'Login'}
        disabled={isLoading}
        onPress={() => vm.login('user@example.com', 'secret')}
      />
    </View>
  );
};
```

### DI Decorators

All decorators are re-exported from [tsyringe](https://github.com/microsoft/tsyringe) with PascalCase aliases:

| This Package | tsyringe | Description |
|---|---|---|
| `@Injectable()` | `@injectable()` | Marks a class as resolvable by the container |
| `@Singleton()` | `@singleton()` | Registers as a singleton scope |
| `@Inject(token)` | `@inject(token)` | Injects a dependency by token |
| `@AutoInjectable()` | `@autoInjectable()` | Resolves constructor params automatically |
| `@Scoped(scope)` | `@scoped(scope)` | Registers with a custom lifecycle scope |
| `configureDI(fn)` | — | Runs DI setup callback at app startup |
| `getContainer` | `container` | Direct access to the tsyringe container |

---

## Real-World Example — Full Feature ViewModel

```ts
import { ViewModel, StateFlow } from 'react-native-mobile-mvvm';
import { Injectable, Inject } from 'react-native-mobile-mvvm/di';
import { combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

interface Product {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class ProductListViewModel extends ViewModel {
  private _products = new StateFlow<Product[]>([]);
  private _searchQuery = new StateFlow<string>('');
  private _isLoading = new StateFlow<boolean>(false);
  private _error = new StateFlow<string | null>(null);

  public readonly isLoading$ = this._isLoading.asObservable();
  public readonly error$ = this._error.asObservable();

  // Derived state — filtered products based on search query
  public readonly filteredProducts$ = combineLatest([
    this._products.asObservable(),
    this._searchQuery.asObservable(),
  ]).pipe(
    map(([products, query]) =>
      query.trim()
        ? products.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase()),
          )
        : products,
    ),
    takeUntil(this.destroy$), // auto-cancelled on unmount
  );

  constructor(
    @Inject('ProductRepository') private repo: ProductRepository,
  ) {
    super();
  }

  async loadProducts() {
    this._isLoading.value = true;
    this._error.value = null;
    try {
      const data = await this.repo.getAll({
        signal: this.abortController.signal,
      });
      this._products.value = data;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        this._error.value = 'Failed to load products.';
      }
    } finally {
      this._isLoading.value = false;
    }
  }

  onSearchChanged(query: string) {
    this._searchQuery.value = query;
  }
}
```

---

## Peer Dependencies

| Package | Version | Required |
|---|---|---|
| `react` | `>=18` | ✅ Always |
| `react-native` | `>=0.71` | ✅ Always |
| `rxjs` | `^7` | ✅ Always |
| `tsyringe` | `^4` | ⚡ Only with DI |
| `reflect-metadata` | `^0.2` | ⚡ Only with DI |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict, `experimentalDecorators`) |
| Reactive Engine | RxJS 7 (`BehaviorSubject`, `Subject`, `takeUntil`) |
| DI Container | TSyringe + reflect-metadata |
| Build | tsup (CJS + ESM + `.d.ts`) |

---

## License

[MIT](./LICENSE) © Wildan Frananda
