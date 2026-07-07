# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `ViewModelScope` teardown was not fault-isolated: `store.forEach(vm =>
  vm.clear())` runs each ViewModel's user `onCleared()` hook, and one throwing
  hook aborted the loop, leaving every later-inserted scoped ViewModel uncleared
  (its fetches, subscriptions and streams leaking). `ViewModel.clear()` now
  guards `onCleared()`, and the scope loop isolates each teardown, so one
  failure can no longer leak sibling ViewModels.
- DI resolution used constructor arity (`ViewModelClass.length === 0`) to decide
  the `new` fallback, which cannot tell a required dependency from an optional
  one — a plain `class VM { constructor(dep?: Repo) {} }` used without DI
  wrongly threw instead of falling back to `new`. The fallback is now gated on
  DI opt-in (presence of `design:paramtypes` decorator metadata): decorated
  classes with an unresolvable dependency still surface the real error, while
  undecorated classes (even with optional params) fall back to `new`.
- `ComputedStateFlow` re-emitted on every source tick even when the computed
  value was unchanged, breaking `useStream`'s "re-render only on a new value"
  guarantee. The derived stream now applies `distinctUntilChanged`
  (`derivedStateOf`-style). It is still not glitch-free for reconverging
  (diamond/chained) graphs — documented on `asObservable()`.
- `ViewModel.clear()`'s owned-flow completion only inspects the ViewModel's own
  instance fields; documentation now states this explicitly (flows held in
  arrays/Maps/getters must be completed in `onCleared()`), correcting the prior
  "discovers all owned flows" claim.

### Changed

- `ComputedStateFlow.from` accepts an optional `isEqual` comparator to
  de-duplicate the derived stream (defaults to `Object.is`); pass a structural
  comparator for object/array results.
- Removed the deprecated `@types/react-native` devDependency; React Native ships
  its own TypeScript declarations since 0.71.

## [0.8.8]

### Added

- Comprehensive Jest test suite (jsdom + ts-jest) covering the core primitives
  (`StateFlow`, `EventFlow`, `ComputedStateFlow`, `UiState`, `ViewModel`), all
  hooks, the DI layer and `ViewModelScope`, with coverage thresholds.
- `test:watch` and `test:coverage` npm scripts.
- Continuous Integration workflow (`.github/workflows/ci.yml`) running lint,
  tests and build on every push and pull request across Node 18, 20 and 22.
- `repository`, `bugs` and `homepage` fields and `sideEffects: false` in
  `package.json` (npm page links and better tree-shaking for consumers).

### Fixed

- `useStream` recreated its derived Observable on every render, changing the
  `useEffect` dependency and forcing a re-subscribe (and an `AppState` listener
  re-add) each render. The Observable is now memoized on its source, so the
  hook subscribes once.
- **`useViewModel` bound the component to a torn-down ViewModel under React
  18/19 StrictMode** (default in new RN/Expo and in tests). The unmount cleanup
  cleared the instance and nulled the ref, but StrictMode re-runs the effect
  without re-running render, so no new instance was created — leaving
  `destroy$` completed and the `AbortController` aborted. The hook now rebuilds
  a fresh, live instance when re-entering effect setup after a clear.
- `reactTo` permanently terminated its subscription (and surfaced an unhandled
  rejection) the first time a handler threw or its Promise rejected — e.g. a
  failed `fetch()` in the documented search/debounce pattern. Handler errors are
  now caught per-invocation, routed to an optional `onError` (default
  `console.error`), and the reactor keeps running.
- `createViewModelInstance` (DI) swallowed every resolution error and fell back
  to `new ViewModelClass()`. A ViewModel with a missing dependency registration
  was silently constructed with `undefined` dependencies, hiding the real cause.
  The original `tsyringe` error is now re-thrown for classes that declare
  constructor parameters; the `new` fallback is used only for dependency-free
  classes.
- `ViewModel.clear()` never completed the `StateFlow`/`EventFlow` instances a
  ViewModel owns (the documented `complete()` wiring did not exist). `clear()`
  now discovers and completes owned flows automatically. It is also idempotent
  (a repeated `clear()` no longer re-runs `onCleared()`), and `onCleared()` now
  runs **after** framework teardown (abort + `destroy$`).
- `useViewModel` misclassified a named (non-arrow) factory function as a class
  and routed it through the DI container + `new`. Class-vs-factory detection is
  now reliable, so named factories work like arrow factories.
- The published bundle emitted ES2022 `static {}` initializer blocks (no `tsup`
  `target`), which older Hermes builds in the supported `react-native >=0.71`
  range cannot parse — a potential bundle/launch crash. The build now targets
  `es2019`, downleveling static blocks and class fields.

### Changed

- `ViewModel.launch(task)` no longer re-throws non-`AbortError` errors (which
  became unhandled rejections in its fire-and-forget usage). It accepts an
  optional `onError` handler (default `console.error`). Callers that previously
  relied on `await launch(...)` rejecting should pass an `onError`.
- Removed the public `subject` getter on `StateFlow` (previously marked
  `@internal`). It exposed the raw `BehaviorSubject`, letting the UI call
  `.next()`/`.complete()`/`.error()` and bypass the read-only contract. Use
  `value` / `asObservable()` instead.

## 0.8.6 and earlier

See the [GitHub releases](https://github.com/WildanFrananda/react-native-mobile-mvvm/releases)
and the git history for changes prior to this changelog.

[Unreleased]: https://github.com/WildanFrananda/react-native-mobile-mvvm/compare/v0.8.8...HEAD
[0.8.8]: https://github.com/WildanFrananda/react-native-mobile-mvvm/compare/v0.8.6...v0.8.8
