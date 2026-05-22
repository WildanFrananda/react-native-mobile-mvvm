# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## 0.8.6 and earlier

See the [GitHub releases](https://github.com/WildanFrananda/react-native-mobile-mvvm/releases)
and the git history for changes prior to this changelog.

[Unreleased]: https://github.com/WildanFrananda/react-native-mobile-mvvm/compare/v0.8.6...HEAD
