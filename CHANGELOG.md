# Changelog

All notable changes to this project will documented in this file.

## [0.0.7] - 2026-06-07

### ✨ New Features

- **`autoClearExpiredCache`**: New option to auto-clean expired cache entries on interval (default: `60000`ms). SSR-safe. Works out of the box — no setup() call required, timer starts on module init. **No user action needed.**
- **`clearExpiredCache()`**: New method to manually clear only expired cache entries. Preserves state/data — UI keeps showing stale data until next fetch, no sudden blank screen.
- **`StateQuery<T, TError>`**: Added second generic `TError` (defaults to `never`) for typed error handling. `isError` is now typed as `boolean | string | TError` instead of `boolean | string`.

### 📚 Documentation

- Added `autoClearExpiredCache` to setup example & options table.
- Clarified `isError` semantics — typed as `boolean | string | TError`.
- Clarified query identity, group management, per-entry cache TTL behavior.
- Updated known limitations: auto-cleanup acknowledged as mitigation.

### ⚠️ Breaking Changes

**None** — All features are additive. Existing code continues to work.

## [0.0.6] - 2026-03-20

### ♻️ Refactor

- **Loading State**: Removed the forced `isLoading = true` assignment when refreshing a stale cache in the background. Background refresh now preserves the existing visible data without toggling the query's loading flag to avoid UI flicker.
- **Comments**: Cleaned up several unnecessary inline comments in `useQuery` for readability.

### 📌 Notes for consumers

- This refactor intentionally keeps the old data visible during a stale-refresh and does not set `isLoading` for that background fetch. If you relied on `isLoading` to indicate background refreshes, update your UI logic to use `onLoadingSlow` / `onSuccess` callbacks or watch for cache `time` differences.

## [0.0.5] - 2026-03-14

### 🐛 Bug Fixes

- **Retry Logic**: Fixed retry counter not resetting on successful fetch, causing subsequent errors to not retry properly
- **Concurrent Retries**: Implemented sequence-based retry mechanism to prevent race conditions when multiple errors occur simultaneously on same endpoint
- **Request Deduplication**: Fixed bagHit early return to properly await in-flight promises, allowing callers to correctly coordinate concurrent `.fetch()` calls
- **Loading State**: Added `isLoading = true` indicator when refreshing stale cache in background (was previously false)
- **Error Handling**: Added endpoint validation in `mutate()` to prevent crashes when mutating non-existent queries
- **disableLoading Reset**: Fixed `disableLoading` flag not resetting after `refetch({ disableLoading: true })`. Now properly resets to `false` after successful fetch, enabling loading indicators for subsequent operations.

### ♻️ Code Quality

- **Dead Code Removal**: Removed unused `shouldRetryWhenErrorAttempt` counter (replaced by sequence-based `retryAttemptForSequence`)
- **Syntax Fix**: Removed extra closing brace that was causing scope issues
- **Clean Initialization**: System state now only includes actively used properties

### 📚 Documentation

- **Dynamic Queries**: Documented `useDynamicQueries<T>()` as an alias for `useSingleQuery<T>()` with examples
- **Memory Limitation**: Added explicit comment documenting known limitation of unbounded state growth for dynamic endpoints (10k+ unique queries may cause bloat)
- **Cache Semantics**: Clarified `cacheTimeout` modes:
  - `-1` = cache forever (never expire)
  - `0` = disable caching (always fetch fresh)
  - `>0` = TTL in milliseconds
- **Advanced Features**: Added USAGE.md section explaining request deduplication, retry logic, and cache behavior

### ⚠️ Breaking Changes

**None** - All changes are bug fixes and improvements. Existing code continues to work.

### 🔄 Internal Changes

- Retry attempt tracking now uses per-sequence ID (`lastErrorSequenceId`) instead of global counter
- In-flight promises stored in `inFlightPromise` for proper deduplication handling
- Cache stale refresh now sets loading state with guard against `disableLoading` flag

### 🎯 Impact

**Production Ready**: Library is now safe for production use with proper retry handling, error safety, and correct loading indicators.

---

## [0.0.4] - Previous Release

(See git history for details)
