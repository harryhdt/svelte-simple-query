# Svelte Simple Query

A simple yet powerful, lightweight data query library for Svelte 5, providing full control with built-in functionalities. Built with TypeScript for easy usage and strong typing.

## Features

- **TypeScript Support**: Fully typed for better development experience.
- **Query Management**: Simple and flexible querying system.
- **Data Management**: Supports fetching, caching, and mutations.
- **Dynamic Querying**: Fetch dynamic endpoints effortlessly.
- **Automatic Retries**: Built-in retry logic on failure.
- **Cache Management**: Control cache behavior with timeout and group management.
- **Error & Loading States**: Built-in handling for loading, error, and success states.

## Installation

```bash
npm install svelte-simple-query
```

## Quick Start

```svelte
<script lang="ts">
	import { Query, useQuery } from 'svelte-simple-query';

	Query.setup({
		baseURI: 'https://api.example.com'
	});

	interface User {
		id: number;
		name: string;
		email: string;
	}

	let users = useQuery<User[]>('/users');
	users.fetch();
</script>

<div>
	{#if users.isLoading}
		<p>Loading users...</p>
	{:else if users.isError}
		<p class="error">Error: {users.isError}</p>
	{:else if users.data}
		<ul>
			{#each users.data as user (user.id)}
				<li>{user.name} ({user.email})</li>
			{/each}
		</ul>
	{:else}
		<p>No data</p>
	{/if}
</div>
```

## Examples

<details>
<summary><strong>📋 View Examples</strong></summary>

### Featured Examples

- **[Minimal](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/minimal)** - Basic setup and data fetching
- **[Basic](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/basic)** - Error handling, loading states, and refetching
- **[Pagination](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/pagination)** - Page-based data fetching with navigation

</details>

## Common Use Cases

<details>
<summary><strong>🔄 Fetching Data</strong></summary>

```svelte
<script lang="ts">
	import { useQuery } from 'svelte-simple-query';

	interface Post {
		id: number;
		title: string;
		body: string;
	}

	let posts = useQuery<Post[]>('/posts', {
		cacheTimeout: 5000 // Cache for 5 seconds
	});
	posts.fetch();
</script>

{#if posts.isLoading}
	Loading posts...
{:else if posts.isError}
	Failed to load: {posts.isError}
{:else if posts.data}
	{#each posts.data as post (post.id)}
		<article>
			<h3>{post.title}</h3>
			<p>{post.body}</p>
		</article>
	{/each}
{/if}
```

</details>

<details>
<summary><strong>⚠️ Error Handling</strong></summary>

```svelte
<script lang="ts">
	import { useQuery } from 'svelte-simple-query';

	interface User {
		id: number;
		name: string;
	}

	let users = useQuery<User[]>('/users');
	users.fetch();
</script>

{#if users.isError}
	<div class="error">
		<!-- Error can be a string or Error object with status/info -->
		{#if typeof users.isError === 'object' && users.isError.status}
			<p>Error {users.isError.status}</p>
			<p>Details: {JSON.stringify(users.isError.info)}</p>
		{:else}
			<p>{users.isError}</p>
		{/if}
		<button onclick={() => users.refetch()}>Retry</button>
	</div>
{:else if users.isLoading}
	<p>Loading...</p>
{:else if users.data}
	<ul>
		{#each users.data as user (user.id)}
			<li>{user.name}</li>
		{/each}
	</ul>
{/if}
```

</details>

<details>
<summary><strong>✏️ Mutations & Updates</strong></summary>

```svelte
<script lang="ts">
	import { mutate, useQuery, Query } from 'svelte-simple-query';

	interface User {
		id: number;
		name: string;
	}

	const updateUser = async (userId: number, newData: Partial<User>) => {
		try {
			// Step 1: Make server mutation (POST/PUT/DELETE)
			const response = await fetch(`/api/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newData)
			});

			if (!response.ok) throw new Error('Update failed');
			const updatedUser = await response.json();

			// Step 2: Update cache with server response
			await mutate(`/users/${userId}`, {
				data: updatedUser
			});

			return updatedUser;
		} catch (error) {
			console.error('Update failed:', error);
			throw error;
		}
	};

	// Optimistic Update Pattern
	const optimisticUpdate = async (userId: number, newData: Partial<User>, originalData: User) => {
		try {
			// Update cache immediately (optimistic)
			await mutate(`/users/${userId}`, {
				data: { ...originalData, ...newData }
			});

			// Then make server mutation
			const response = await fetch(`/api/users/${userId}`, {
				method: 'PUT',
				body: JSON.stringify(newData)
			});

			if (!response.ok) throw new Error('Update failed');
			const updatedUser = await response.json();

			// Update cache with server response
			await mutate(`/users/${userId}`, { data: updatedUser });
		} catch (error) {
			// Revert cache on error
			await mutate(`/users/${userId}`, { data: originalData });
			console.error('Update failed, reverted:', error);
		}
	};
</script>

<button onclick={() => updateUser(1, { name: 'John Doe' }, originalUser)}> Update User </button>
```

</details>

<details>
<summary><strong>🔀 Dynamic/Parameterized Queries</strong></summary>

```svelte
<script lang="ts">
	import { useDynamicQueries } from 'svelte-simple-query';

	interface Post {
		id: number;
		title: string;
	}

	let postId = $state<number | null>(null);

	// Create multiple queries based on dynamic IDs
	const posts = useDynamicQueries<Post>((id: number) => `/posts/${id}`);

	const loadPost = async (id: number) => {
		postId = id;
		await posts[id].fetch();
	};
</script>

<input
	type="number"
	placeholder="Enter post ID"
	onchange={(e) => loadPost(parseInt(e.target.value))}
/>

{#if postId && posts[postId]?.data}
	<div>
		<h3>{posts[postId].data.title}</h3>
	</div>
{/if}
```

</details>

<details>
<summary><strong>🏷️ Query Groups & Cleanup</strong></summary>

```svelte
<script lang="ts">
	import { useQuery, Query } from 'svelte-simple-query';

	// Group related queries
	let usersPageA = useQuery('/users?page=1', { group: 'user-pages' });
	let usersPageB = useQuery('/users?page=2', { group: 'user-pages' });
	usersPageA.fetch();
	usersPageB.fetch();

	const clearAllUserPages = () => {
		Query.clearGroup('user-pages'); // Clear all queries in the group
	};

	const returnGroup = () => {
		const allUserQueries = Query.group('user-pages');
		console.log(allUserQueries);
	};
</script>

<button onclick={clearAllUserPages}>Clear All User Pages</button>
```

</details>

<details>
<summary><strong>📋 URL Params: Pagination & Sorting</strong></summary>

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from 'svelte-simple-query';
	import { untrack } from 'svelte';

	interface User {
		id: number;
		name: string;
		email: string;
	}

	// Derive URL params
	const pageNum = $derived(page.url.searchParams.get('page') || '1');
	const sortBy = $derived(page.url.searchParams.get('sort') || 'name');
	const search = $derived(page.url.searchParams.get('search') || '');

	// Query state
	let users = $state(useQuery<User[]>('/users'));

	// Refetch when params change
	$effect(() => {
		pageNum, sortBy, search; // Track dependencies
		untrack(() => {
			const endpoint = `/users?page=${pageNum}&sort=${sortBy}${search ? `&search=${search}` : ''}`;
			users = useQuery<User[]>(endpoint);
			users.fetch();
		});
	});

	// Update URL and let $effect handle refetch
	const updateParams = (key: string, value: string | null) => {
		const params = new URLSearchParams(page.url.search);
		if (value === null) {
			params.delete(key);
		} else {
			params.set(key, value);
		}

		// Reset to page 1 when sorting/searching
		if ((key === 'sort' || key === 'search') && params.get('page') !== '1') {
			params.set('page', '1');
		}

		// Update URL - $effect will detect change via $derived and refetch
		window.history.replaceState({}, '', `?${params.toString()}`);
	};
</script>

<div class="controls">
	<input
		type="text"
		placeholder="Search users..."
		value={search}
		onchange={(e) => updateParams('search', e.target.value || null)}
	/>

	<select value={sortBy} onchange={(e) => updateParams('sort', e.target.value)}>
		<option value="name">Sort by Name</option>
		<option value="email">Sort by Email</option>
		<option value="date">Sort by Date</option>
	</select>
</div>

{#if users.isLoading}
	<p>Loading...</p>
{:else if users.isError}
	<p>Error: {users.isError}</p>
{:else if users.data}
	<table>
		<thead>
			<tr>
				<th style="cursor: pointer" onclick={() => updateParams('sort', 'name')}>Name</th>
				<th style="cursor: pointer" onclick={() => updateParams('sort', 'email')}>Email</th>
			</tr>
		</thead>
		<tbody>
			{#each users.data as user (user.id)}
				<tr>
					<td>{user.name}</td>
					<td>{user.email}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="pagination">
		<button
			onclick={() => updateParams('page', String(Math.max(1, parseInt(pageNum) - 1)))}
			disabled={parseInt(pageNum) === 1}
		>
			Previous
		</button>
		<span>Page {pageNum}</span>
		<button onclick={() => updateParams('page', String(parseInt(pageNum) + 1))}> Next </button>
	</div>
{/if}
```

</details>

## Configuration

<details>
<summary><strong>⚙️ Query.setup() Options</strong></summary>

Initialize the library globally with `Query.setup(options)`:

```typescript
Query.setup({
	baseURI: 'https://api.example.com',
	baseInit: {
		headers: {
			Authorization: 'Bearer token'
		}
	},
	cacheTimeout: 2000, // Default cache duration (ms)
	onError: (query, error) => {
		console.error(`Query failed: ${query.endpoint}`, error);
	},
	onSuccess: (query) => {
		console.log(`Query succeeded: ${query.endpoint}`);
	},
	loadingSlowTimeout: 30000, // When to trigger slow loading
	onLoadingSlow: (query) => {
		console.warn(`Slow query: ${query.endpoint}`);
	},
	shouldRetryWhenError: true, // Enable automatic retries
	retryCount: 5, // Number of retry attempts
	retryDelay: 10000 // Delay between retries (ms)
});
```

**Options:**

| Option                 | Type     | Default | Description                                                    |
| ---------------------- | -------- | ------- | -------------------------------------------------------------- |
| `baseURI`              | string   | -       | Base API endpoint                                              |
| `baseInit`             | object   | -       | Default fetch options (headers, credentials, etc.)             |
| `fetcher`              | function | -       | Custom fetch implementation (defaults to native fetch)         |
| `cacheTimeout`         | number   | 2000    | Cache expiration in ms. Use `-1` for permanent, `0` to disable |
| `onError`              | function | -       | Called on error: `(query, error) => void`                      |
| `onSuccess`            | function | -       | Called on success: `(query) => void`                           |
| `loadingSlowTimeout`   | number   | 30000   | Threshold for slow loading indicator (ms)                      |
| `onLoadingSlow`        | function | -       | Called when loading exceeds threshold: `(query) => void`       |
| `shouldRetryWhenError` | boolean  | false   | Automatically retry failed queries                             |
| `retryCount`           | number   | 5       | Maximum retry attempts                                         |
| `retryDelay`           | number   | 10000   | Delay between retries in ms                                    |

</details>

## Advanced Features

### Request Deduplication

When multiple `.fetch()` calls happen simultaneously on the same endpoint, only **one network request** is made. Subsequent calls wait for the first request to complete, then return the cached result:

```typescript
const users = useQuery<User[]>('/users');

users.fetch(); // Network request #1 starts, data gets cached
users.fetch(); // Waits for request #1 to complete (no new request)
users.fetch(); // Waits for request #1 to complete (no new request)

// All await complete when first network request finishes
// Data from request #1 is now cached for all three
```

**Benefits:** Prevents duplicate requests when effects/handlers trigger simultaneously. The cached data from the first request satisfies all pending calls.

### Automatic Retries

When `shouldRetryWhenError: true`, failed requests automatically retry based on configuration:

```typescript
Query.setup({
	shouldRetryWhenError: true,
	retryCount: 5, // Max 5 retries
	retryDelay: 10000 // 10s between attempts
});

// Each error event gets unique ID - if new error occurs before retries complete,
// previous retry sequence is abandoned (prevents thundering herd problem)
```

### Error Object Structure

The `isError` field contains either a string or Error object with additional properties:

```typescript
if (query.isError) {
	if (typeof query.isError === 'object' && query.isError.status) {
		console.log(query.isError.status); // HTTP status code
		console.log(query.isError.info); // Parsed response body
	} else {
		console.log(query.isError); // Error message string
	}
}
```

### Cache Behavior

- **Cache Hit:** Returns cached data immediately if not expired
- **Cache Expired:** Returns old data visually while fetching fresh data in background (may not set `isLoading`)
- **Stale While Revalidate:** Default behavior compatible with real-world UX patterns

Cache TTL modes:

- `-1`: Never expires (permanent cache)
- `0`: No caching (always fetch fresh)
- `> 0`: Milliseconds until expiration

## API Reference

### Query Hooks

#### `useQuery<T>(endpoint, options?)`

Fetch data from a specific endpoint.

**Features:**

- Request deduplication (multiple simultaneous `.fetch()` = 1 request)
- Automatic caching with configurable TTL
- Built-in error handling and retry logic
- Group management for batch operations
- Local option overrides (all Query.setup options can be passed)

**Parameters:**

- `endpoint`: API path (baseURI + endpoint)
- `options.cacheTimeout`: Override global cache TTL (ms)
- `options.group`: Single group tag for query organization (`Query.clearGroup()` targets this)
- `options.groups`: Array of group tags (query appears in multiple groups)
- `options.*`: Any Query.setup() option can be overridden locally for this query

**Note:** Options passed to useQuery apply only to that query instance and override global settings (Query.setup()).
When the same `endpoint` is registered more than once, the first `group` / `groups` assignment wins. Later `useQuery()` calls reuse the existing query state and do not update its group tags.

**Group Management:**

- A query can have either a single `group` OR multiple `groups` tags (or both)
- `Query.group('tag')` returns all queries with that tag (from either group or groups)
- `Query.clearGroup('tag')` clears all queries associated with that tag
- If you need different group tags, use a different endpoint key or clear the existing query before recreating it

```typescript
// Single group
const userData = useQuery<User[]>('/users', {
	group: 'user-data'
});

// Multiple groups
const sharedData = useQuery<any>('/shared', {
	groups: ['user-data', 'system-data']
});

// Override retry behavior for this query only
const riskData = useQuery<any>('/risky-endpoint', {
	shouldRetryWhenError: false
});

// Get all queries tagged with 'user-data'
const userQueries = Query.group('user-data'); // includes userData and sharedData
```

**Refetch Methods:**

```typescript
// Initial fetch
await data.fetch();

// Refetch bypassing cache
await data.refetch();

// Refetch suppressing loading state (doesn't hide old data)
await data.refetch({ disableLoading: true });
```

#### `useDynamicQueries<T>(keyFn, options?)` / `useSingleQuery<T>(keyFn, options?)`

Create multiple queries dynamically based on a key function. Both methods are equivalent.

```typescript
const posts = useDynamicQueries<Post>((id: number) => `/posts/${id}`);
await posts[1].fetch();
await posts[2].fetch();
```

#### `mutate(endpoint, options?)`

Update cache for a query (doesn't make server requests). Make server mutations separately.

**Options:**

- `data`: Directly set cache data
- `populateCache`: Update cache using a function (receives current data)
- `refetch`: Force data refresh from server (default: true if neither data nor populateCache provided, false otherwise)

```typescript
// Update cache directly
await mutate('/users/1', {
	data: { id: 1, name: 'Updated' }
});

// Update cache using function
await mutate('/users', {
	populateCache: (current) => [...current, newUser]
});

// Force refetch even when providing data
await mutate('/users/1', {
	data: { id: 1, name: 'Updated' },
	refetch: true // Will update cache AND fetch fresh data
});
```

### Query Management Methods

#### `Query.clear(endpoint?)`

Clears cached query results and resets internal query states.

```typescript
Query.clear(); // Clear all queries
Query.clear('/users'); // Clear specific endpoint
```

#### `Query.clearGroup(group)`

Clears all queries in a specific group.

```typescript
Query.clearGroup('user-data');
```

#### `Query.group(group)`

Returns all queries associated with a group.

```typescript
const userQueries = Query.group('user-data');
```

### Query State & Methods

Each query object provides:

**Properties:**

```typescript
query.data; // The fetched data (T | null)
query.isLoading; // Boolean - currently fetching?
query.isError; // Error message string or false
query.endpoint; // The API endpoint string
query.group; // Assigned group tag (if any, set on first registration)
query.groups; // Assigned group tags array (if any, set on first registration)
```

**Methods:**

```typescript
query.fetch()              // Start fetching data
query.refetch(options?)    // Re-fetch with optional config
query.mutate(options?)     // Update cache with new data
query.clear()              // Clear this specific query
```

## Known Limitations & Risks

### Memory Growth (Allowed Risk)

The library maintains an unbounded cache and state objects for each unique endpoint. This is by design to maximize performance:

- **Acceptable for**: Most applications with <10k unique queries (typical use: static endpoints + pagination)
- **Risk**: Heavy dynamic usage may accumulate memory bloat over extended sessions
- **Examples of concern**:
  - Fetching 10,000+ unique filtered queries without cleanup
  - Long-running SPA with continuous dynamic parameterization
  - No automatic eviction of old entries

**Mitigation strategies**:

- Call `Query.clear(endpoint)` for stale queries you no longer need
- Call `Query.clearGroup(group)` to batch-clear related queries
- Consider implementing LRU eviction in your application layer
- Monitor memory in dev tools for long-running sessions

**Status**: Acknowledged and accepted tradeoff for performance. Not a bug, design choice.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes, bug fixes, and version history.

## License

MIT
