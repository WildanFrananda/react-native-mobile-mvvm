# Release Guide

Step-by-step checklist for publishing a new version to npm and creating a GitHub Release with changelog.

---

## 1. Decide the version bump

Follow [Semantic Versioning](https://semver.org/):

| Change type | Example | Bump |
|---|---|---|
| Bug fix, internal refactor | Fix useStream flicker | `patch` → `0.1.0` → `0.1.1` |
| New feature, backwards-compatible | Add EventFlow + useEvent | `minor` → `0.1.0` → `0.2.0` |
| Breaking API change | Rename StateFlow → Store | `major` → `0.1.0` → `1.0.0` |

---

## 2. Update the version

```bash
# patch — bug fixes only
npm version patch

# minor — new features, no breaking changes
npm version minor

# major — breaking changes
npm version major
```

This command:
- Bumps `version` in `package.json`
- Creates a git commit: `v0.2.0`
- Creates a git tag: `v0.2.0`

---

## 3. Build the package

```bash
npm run build
```

Verify `dist/` contains fresh output:

```bash
ls dist/
# index.js  index.mjs  index.d.ts  di/
```

---

## 4. Dry-run — check what will be published

```bash
npm pack --dry-run
```

Make sure only `dist/` files appear. No source files, no `.env`, no test files.

---

## 5. Publish to npm

```bash
# First time — login if needed
npm login

# Publish
npm publish --access public
```

Verify on npm:

```
https://www.npmjs.com/package/react-native-mobile-mvvm
```

---

## 6. Push the tag to GitHub

```bash
git push origin main --tags
```

---

## 7. Create the GitHub Release

Go to: `https://github.com/wildanrailfans/react-native-mobile-mvvm/releases/new`

Or via CLI (install `gh` first: `brew install gh`):

```bash
gh release create v0.2.0 \
  --title "v0.2.0 — EventFlow & useEvent" \
  --notes "$(cat <<'EOF'
## What's New

### ✨ EventFlow<T> — Fire-and-forget event stream
Analog to `SharedFlow(replay=0)` / `Channel` in Kotlin, `StreamController` one-shot in Flutter, and `PassthroughSubject` in SwiftUI/Combine.

Use it for one-time events that should **never** be replayed to new subscribers: navigation, snackbars, dialogs.

\`\`\`ts
private _navigateTo = new EventFlow<string>();
public readonly navigateTo$ = this._navigateTo.asObservable();

// In a method — fires once, done
this._navigateTo.emit('HomeScreen');
\`\`\`

### ✨ useEvent() — Side-effect hook
Analog to \`BlocListener\` in Flutter and \`LaunchedEffect + collectLatest\` in Compose.

Subscribes to an EventFlow and runs a callback — **without causing a re-render**.

\`\`\`tsx
useEvent(
  vm.navigateTo$,
  useCallback((route) => navigation.navigate(route), [navigation]),
);
\`\`\`

### 🐛 Fix: useStream() flicker on first render
Previously, \`useStream\` rendered once with \`defaultValue\` before reading the current BehaviorSubject value — causing a visible flicker.

Now it reads the current value synchronously during initialization, so the first render is already correct.

## Migration

No breaking changes. Fully backwards-compatible with v0.1.0.

New imports available:
\`\`\`ts
import { EventFlow, useEvent } from 'react-native-mobile-mvvm';
\`\`\`
EOF
)"
```

---

## Release Note Template

Use this template each release — fill in the sections that apply:

```markdown
## What's New

### ✨ Feature name
Short description. Analogy to Kotlin/Flutter/SwiftUI equivalent.

```ts
// minimal code example
```

### 🐛 Fix: short description
What was wrong, what is correct now.

### ⚠️ Breaking Changes (major only)
What changed and how to migrate.

## Migration
"No breaking changes" or migration steps.

New imports:
```ts
import { NewThing } from 'react-native-mobile-mvvm';
```
```

---

## Quick checklist

```
[ ] npm version minor/patch/major
[ ] npm run build
[ ] npm pack --dry-run  (verify dist only)
[ ] npm publish --access public
[ ] git push origin main --tags
[ ] gh release create vX.Y.Z --title "..." --notes "..."
[ ] Verify on npmjs.com
```
