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

This package solves that by providing **8 core modules** that map directly to patterns you already know:

| This Package | Android/Compose | Flutter | SwiftUI |
|---|---|---|---|
| `ViewModel` | `ViewModel` + `viewModelScope` | `ChangeNotifier` + `dispose()` | `ObservableObject` |
| `StateFlow<T>` | `MutableStateFlow<T>` | `BehaviorSubject` | `@Published` |
| `EventFlow<T>` | `SharedFlow(replay=0)` / `Channel` | `StreamController` one-shot | `PassthroughSubject` |
| `ComputedStateFlow` | `derivedStateOf {}` | `combineLatest()` (RxDart) | `combine()` / Combine |
| `UiState<T>` | `sealed class UiState` | `ConnectionState` / BLoC states | Enum-driven state |
| `useViewModel()` | `hiltViewModel()` | `context.watch<T>()` | `@StateObject` |
| `useStream()` | `collectAsStateWithLifecycle()` | `StreamBuilder` | `.sink` + `@Published` |
| `useEvent()` | `LaunchedEffect` + `SharedFlow` | `BlocListener` | `.onReceive` |
| `useInit()` | `LaunchedEffect(Unit)` | `initState()` | `.task { }` |
| `useLifecycle()` | `DisposableEffect(Unit)` | `StatefulWidget` + `dispose()` | `.onAppear` + `.onDisappear` |
| `useUiState()` | `when (state) { is Loading }` | `AsyncSnapshot` fields | `switch state { }` |
| `ViewModelScope` | Nav graph scope | `MultiProvider` / `InheritedWidget` | `@EnvironmentObject` |
| `useScopedViewModel()` | `hiltViewModel(navBackStackEntry)` | `context.read<T>()` at scope level | `@EnvironmentObject` |
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
| `isEqual` | `(a: T, b: T) => boolean` | Optional. Equality check — skips emit if returns `true`. Default: `Object.is` (reference equality). |

Like Kotlin's `StateFlow`, value setter only emits when the value actually changes. For primitive types, this works out of the box. For objects, provide a custom equality function:

```ts
// Default — reference equality (Object.is). Primitives deduplicated automatically.
private _count = new StateFlow<number>(0);
this._count.value = 5;
this._count.value = 5; // no emit — same value

// Custom equality — deduplicate by id, not reference
private _user = new StateFlow<User>(initial, (a, b) => a.id === b.id);

// Deep equality — install lodash separately
import isEqual from 'lodash.isequal';
private _config = new StateFlow<Config>(initial, isEqual);
```

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
- **AppState-aware** — pauses subscription when app goes to background, resumes on foreground. Analog to `collectAsStateWithLifecycle()` in Compose. Saves battery and prevents stale updates while UI is not visible.

---

### `useInit(fn)`

Runs a callback exactly once when the component mounts. Handles both sync and async callbacks.

Analogous to `LaunchedEffect(Unit)` in Compose, `initState()` in Flutter, and `.task { }` in SwiftUI.

```tsx
const UserScreen = () => {
  const vm = useViewModel(UserViewModel);

  // ❌ Before — developer must remember empty dependency array
  useEffect(() => { vm.fetchUser('123'); }, []);

  // ✅ After — intent is clear, no dependency array footgun
  useInit(() => vm.fetchUser('123'));

  // Async works too — errors handled inside ViewModel via UiState
  useInit(async () => {
    await vm.loadDashboard();
  });

  const { data, isLoading, isError, error } = useUiState(vm.userState$);
  // ...
};
```

> **Note:** Do not use `useInit` for subscriptions or cleanup — use `useLifecycle` for those.

---

### `useLifecycle(onMount, onUnmount)`

Runs `onMount` when the component appears and `onUnmount` when it disappears. Both are called exactly once.

#### When to use `useInit` vs `useLifecycle`

| Hook | Use when… |
|---|---|
| `useInit(fn)` | Trigger a one-shot action on mount. No cleanup needed (e.g. `vm.fetchUser()`) |
| `useLifecycle(onMount, onUnmount)` | Start a resource on mount **and** stop it on unmount (e.g. tracking, sockets, sensors) |

#### Full Example

```tsx
import { useViewModel, useStream, useLifecycle } from 'react-native-mobile-mvvm';
import { MapViewModel } from './MapViewModel';

const MapScreen = () => {
  const vm = useViewModel(MapViewModel);

  // ✅ Two clear callbacks — no magic return function
  useLifecycle(
    () => vm.startLocationTracking(),
    () => vm.stopLocationTracking(),
  );

  const location = useStream(vm.location$, null);

  return <MapView region={location} />;
};
```

Common use cases:
- GPS / location tracking
- WebSocket connections
- Bluetooth / sensor listeners
- Analytics session tracking
- Background timers that need explicit cancellation

| Parameter | Type | Description |
|---|---|---|
| `onMount` | `() => void` | Called once when the component mounts |
| `onUnmount` | `() => void` | Called once when the component unmounts (guaranteed) |

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

### `ComputedStateFlow`

Derives a new `Observable` from one or more `StateFlow` instances. Sugar over `combineLatest + map` — no need to call `.asObservable()` on each source or import RxJS operators manually.

Analogous to `derivedStateOf {}` in Compose, `combine()` in Swift/Combine, and `combineLatest()` in RxDart/Flutter.

```ts
// ❌ Before — verbose, requires RxJS knowledge
public readonly filteredList$ = combineLatest([
  this._items.asObservable(),
  this._query.asObservable(),
]).pipe(
  map(([items, query]) => items.filter((i) => i.name.includes(query))),
  takeUntil(this.destroy$),
);

// ✅ After — reads like derivedStateOf in Compose
public readonly filteredList$ = ComputedStateFlow.from(
  [this._items, this._query],
  ([items, query]) => items.filter((i) => i.name.includes(query)),
);
```

**Full example — multiple sources, multiple derived states:**

```ts
// ProductListViewModel.ts
import { ViewModel, StateFlow, ComputedStateFlow } from 'react-native-mobile-mvvm';

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

export class ProductListViewModel extends ViewModel {
  private _products = new StateFlow<Product[]>([]);
  private _searchQuery = new StateFlow<string>('');
  private _showInStockOnly = new StateFlow<boolean>(false);

  public readonly searchQuery$ = this._searchQuery.asObservable();
  public readonly showInStockOnly$ = this._showInStockOnly.asObservable();

  // Derived — recomputes automatically when any source changes
  public readonly filteredProducts$ = ComputedStateFlow.from(
    [this._products, this._searchQuery, this._showInStockOnly],
    ([products, query, inStockOnly]) =>
      products
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .filter((p) => (inStockOnly ? p.inStock : true)),
  );

  // Single-source derived state
  public readonly resultCount$ = ComputedStateFlow.from(
    [this._products],
    ([products]) => products.length,
  );

  onSearchChanged(query: string) {
    this._searchQuery.value = query;
  }

  toggleInStockFilter() {
    this._showInStockOnly.value = !this._showInStockOnly.value;
  }
}
```

```tsx
// ProductListScreen.tsx
import { useViewModel, useStream } from 'react-native-mobile-mvvm';
import { ProductListViewModel } from './ProductListViewModel';

const ProductListScreen = () => {
  const vm = useViewModel(ProductListViewModel);

  // These re-render automatically when _products, _searchQuery, or _showInStockOnly changes
  const products = useStream(vm.filteredProducts$, []);
  const resultCount = useStream(vm.resultCount$, 0);
  const showInStockOnly = useStream(vm.showInStockOnly$, false);

  return (
    <View>
      <TextInput
        placeholder="Search..."
        onChangeText={(t) => vm.onSearchChanged(t)}
      />
      <Button
        title={showInStockOnly ? 'In Stock Only ✓' : 'Show All'}
        onPress={() => vm.toggleInStockFilter()}
      />
      <Text>{resultCount} products found</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    </View>
  );
};
```

#### API

| | Description |
|---|---|
| `ComputedStateFlow.from(sources, compute)` | Creates a derived Observable from an array of StateFlow instances |

| Parameter | Type | Description |
|---|---|---|
| `sources` | `StateFlow<T>[]` | One or more StateFlow instances to observe |
| `compute` | `(values: T[]) => R` | Pure function that derives the new value. Receives current values of all sources as a typed tuple. |

**Returns:** `Observable<R>` — use `useStream(vm.derived$, defaultValue)` to consume in the UI.

> **Note:** `ComputedStateFlow.from()` emits immediately on subscribe because `StateFlow` is backed by `BehaviorSubject`. The first render will already have the correct derived value — no flicker.

---

### `UiState<T>` + `useUiState()`

A sealed state type for async operations. Replaces the anti-pattern of three separate StateFlows (`isLoading`, `data`, `error`) with a single, mutually exclusive state.

Analogous to `sealed class UiState` in Kotlin/Compose and `AsyncSnapshot` + `ConnectionState` in Flutter.

**In the ViewModel — factory helpers mirror Kotlin sealed class constructors:**

```ts
// UserViewModel.ts
import { ViewModel, StateFlow, UiState } from 'react-native-mobile-mvvm';

interface User {
  id: string;
  name: string;
  email: string;
}

export class UserViewModel extends ViewModel {
  // ❌ Anti-pattern — three fragmented StateFlows
  // private _isLoading = new StateFlow<boolean>(false);
  // private _user = new StateFlow<User | null>(null);
  // private _error = new StateFlow<string | null>(null);

  // ✅ One source of truth — mutually exclusive states
  private _userState = new StateFlow<UiState<User>>(UiState.idle());
  public readonly userState$ = this._userState.asObservable();

  async fetchUser(id: string) {
    this._userState.value = UiState.loading();
    try {
      const res = await fetch(`/api/users/${id}`, {
        signal: this.abortController.signal,
      });
      const user: User = await res.json();
      this._userState.value = UiState.success(user);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        this._userState.value = UiState.error((e as Error).message);
      }
    }
  }
}
```

**In the UI — `useUiState` destructures into readable booleans:**

```tsx
// UserScreen.tsx
import { useViewModel, useUiState } from 'react-native-mobile-mvvm';
import { UserViewModel } from './UserViewModel';

const UserScreen = () => {
  const vm = useViewModel(UserViewModel);

  // Analogous to collectAsState() + when(state) in Compose
  // or AsyncSnapshot fields (hasData, hasError) in Flutter
  const { data, isLoading, isError, error, isIdle } = useUiState(vm.userState$);

  if (isIdle) {
    return <Button title="Load Profile" onPress={() => vm.fetchUser('123')} />;
  }

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (isError) {
    return (
      <View>
        <Text style={{ color: 'red' }}>{error}</Text>
        <Button title="Retry" onPress={() => vm.fetchUser('123')} />
      </View>
    );
  }

  // TypeScript knows data is non-null here because isError/isLoading/isIdle are false
  return (
    <View>
      <Text style={{ fontSize: 24 }}>{data!.name}</Text>
      <Text>{data!.email}</Text>
    </View>
  );
};
```

**Pattern matching on raw state — TypeScript narrows the type per branch:**

```tsx
const { state } = useUiState(vm.userState$);

switch (state.status) {
  case 'idle':    return <Button title="Load" onPress={() => vm.fetchUser('1')} />;
  case 'loading': return <ActivityIndicator />;
  case 'success': return <Text>{state.data.name}</Text>; // state.data typed as User
  case 'error':   return <Text>{state.message}</Text>;
}
```

#### `UiState<T>` factory methods

| Method | Returns | Description |
|---|---|---|
| `UiState.idle()` | `UiState<T>` | Initial state — nothing loaded yet |
| `UiState.loading()` | `UiState<T>` | Async operation in progress |
| `UiState.success(data)` | `UiState<T>` | Operation succeeded, carries data |
| `UiState.error(message)` | `UiState<T>` | Operation failed, carries error message |

#### `useUiState(observable$, initialState?)` return value

| Field | Type | Description |
|---|---|---|
| `state` | `UiState<T>` | Raw state — for exhaustive pattern matching |
| `data` | `T \| null` | Data when `status === 'success'`, null otherwise |
| `isIdle` | `boolean` | True when `status === 'idle'` |
| `isLoading` | `boolean` | True when `status === 'loading'` |
| `isSuccess` | `boolean` | True when `status === 'success'` |
| `isError` | `boolean` | True when `status === 'error'` |
| `error` | `string \| null` | Error message when `status === 'error'`, null otherwise |

---

### `ViewModelScope` + `useScopedViewModel()`

Share a single ViewModel instance across multiple screens or components. The instance lives as long as the `<ViewModelScope>` is mounted — not tied to any individual component lifecycle.

Analogous to `hiltViewModel(navBackStackEntry)` in Compose, `MultiProvider` scope in Flutter, and `@EnvironmentObject` in SwiftUI.

**`useViewModel` vs `useScopedViewModel`:**

| | `useViewModel` | `useScopedViewModel` |
|---|---|---|
| Instance | New per component | Shared within scope |
| Lifetime | Component lifetime | Scope lifetime |
| Use case | Screen-local state | Cross-screen shared state |
| Cleanup | On component unmount | On scope unmount |

**Step 1 — wrap a navigator or screen group with `<ViewModelScope>`:**

```tsx
// AppNavigator.tsx
import { ViewModelScope } from 'react-native-mobile-mvvm';

export const CheckoutNavigator = () => (
  // All screens inside share the same CheckoutViewModel instance
  <ViewModelScope>
    <Stack.Navigator>
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  </ViewModelScope>
);
// When the user navigates away from the checkout flow entirely,
// ViewModelScope unmounts → CheckoutViewModel.onCleared() is called automatically.
```

**Step 2 — call `useScopedViewModel` in any screen inside the scope:**

```tsx
// CartScreen.tsx
import { useScopedViewModel, useUiState } from 'react-native-mobile-mvvm';
import { CheckoutViewModel } from './CheckoutViewModel';

const CartScreen = () => {
  // Same instance as CheckoutScreen and PaymentScreen
  const vm = useScopedViewModel(CheckoutViewModel);
  const { data: cart, isLoading } = useUiState(vm.cartState$);

  return (
    <View>
      {isLoading && <ActivityIndicator />}
      {cart && <CartList items={cart.items} />}
      <Button title="Proceed to Checkout" onPress={() => vm.validateCart()} />
    </View>
  );
};

// CheckoutScreen.tsx — receives the SAME CheckoutViewModel instance
const CheckoutScreen = () => {
  const vm = useScopedViewModel(CheckoutViewModel);
  // vm.cartState$ already has the validated cart from CartScreen — no reload needed
  const { data: cart } = useUiState(vm.cartState$);

  return <Text>Total: ${cart?.total}</Text>;
};
```

> **Note:** `useScopedViewModel` throws if called outside a `<ViewModelScope>`. For per-screen ViewModels that don't need sharing, keep using `useViewModel`.

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

## Recipes

Common real-world patterns with idiomatic solutions. These are the equivalent of the **"idioms"** section in official Compose documentation.

### 🔍 Search with Debounce (`reactTo`)

The most common pattern in any app with a search bar. In Compose, the idiomatic solution is:

```kotlin
// Compose — idiomatic
viewModelScope.launch {
  snapshotFlow { searchQuery }
    .debounce(300)
    .distinctUntilChanged()
    .collectLatest { query -> search(query) }
}
```

This package provides `reactTo()` — a protected method on `ViewModel` that composes the exact same pipeline:

```ts
// This package — reads like Compose, no RxJS operators to import
export class SearchViewModel extends ViewModel {
  private _query   = new StateFlow<string>('');
  private _results = new StateFlow<Product[]>([]);

  public readonly query$   = this._query.asObservable();
  public readonly results$ = this._results.asObservable();

  constructor() {
    super();
    // ✅ One line — debounce + distinctUntilChanged + switchMap + takeUntil all handled
    this.reactTo(this._query, 300, async (q) => {
      this._results.value = await productApi.search(q);
    });
  }

  onQueryChanged(query: string) { this._query.value = query; }
}
```

```tsx
// SearchScreen.tsx
const SearchScreen = () => {
  const vm = useViewModel(SearchViewModel);
  const results = useStream(vm.results$, []);

  return (
    <View>
      <TextInput
        placeholder="Search products..."
        onChangeText={(t) => vm.onQueryChanged(t)}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    </View>
  );
};
```

#### What `reactTo` does internally

```ts
stateFlow.subject
  .pipe(
    debounceTime(300),      // wait 300ms after last keystroke
    distinctUntilChanged(), // skip if value didn't change
    switchMap(async (q) => {
      // switchMap = collectLatest — cancels previous async call
      // if user types again before it finishes
      this._results.value = await productApi.search(q);
    }),
    takeUntil(this.destroy$), // auto-cleanup on unmount
  )
  .subscribe();
```

> **For developers coming from Compose:** `switchMap` is the RxJS equivalent of `collectLatest` — it cancels the previous call when a new value arrives. This prevents stale results from a slow request arriving after a newer, faster request.

#### `reactTo` API

| Parameter | Type | Description |
|---|---|---|
| `stateFlow` | `StateFlow<T>` | The state to observe |
| `debounceMs` | `number` | Milliseconds to wait after last change. Use `0` to skip debouncing |
| `handler` | `(value: T) => void \| Promise<void>` | Called with the latest value. Previous call is cancelled if a new value arrives |

#### Variants

```ts
// Immediate reaction — no debounce, but still cancels stale calls (switchMap)
this.reactTo(this._selectedTab, 0, (tab) => this.loadTabContent(tab));

// Longer debounce for expensive operations (e.g. full-text search API)
this.reactTo(this._searchQuery, 500, async (q) => {
  this._results.value = await this.repo.fullTextSearch(q);
});
```

#### Prefer manual RxJS? That's fine too.

`reactTo` is sugar over standard RxJS. If you need operators not covered by `reactTo` (e.g. `mergeMap`, `retry`, `catchError`), write the pipeline directly — `destroy$` and `subject` are there for you:

```ts
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError, EMPTY } from 'rxjs';

this._query.subject
  .pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q) => from(productApi.search(q)).pipe(
      catchError(() => EMPTY), // handle search errors without killing the stream
    )),
    takeUntil(this.destroy$),
  )
  .subscribe((results) => (this._results.value = results));
```

---

### 🛰️ Resource Lifecycle (Start on Mount / Stop on Unmount)

The equivalent of `DisposableEffect` in Compose. Use `useLifecycle` in the UI layer:

```kotlin
// Compose
DisposableEffect(Unit) {
  vm.startLocationTracking()
  onDispose { vm.stopLocationTracking() }
}
```

```tsx
// This package — identical contract
useLifecycle(
  () => vm.startLocationTracking(),
  () => vm.stopLocationTracking(),
);
```

See [`useLifecycle`](#uselifecycleonmount-onunmount) in the API reference for the full documentation.

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
