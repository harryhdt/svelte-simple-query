# Svelte Simple Query

A simple yet powerful, lightweight data query library for Svelte 5, providing full control with built-in functionalities. Built with TypeScript for easy usage and strong typing.

## Features

- **TypeScript Support**: Fully typed for better development experience.
- **Query Management**: Simple and flexible querying system.
- **Data Management**: Supports fetching, caching, and mutations.
- **Dynamic Querying**: Fetch dynamic endpoints effortlessly.

## Installation

```bash
npm install svelte-simple-query
```

### Usage

```svelte
<script lang="ts">
	import { Query, useQuery } from 'svelte-simple-query';

	Query.setup({
		baseURI: 'https://jsonplaceholder.typicode.com'
	});

	interface UserSchema {
		id: number;
		name: string;
	}
	const users = useQuery<UserSchema[]>('/users');
	users.fetch();
</script>

<div>
	{#if users.isLoading}
		Loading...
	{:else if users.data}
		{JSON.stringify(users.data)}
	{:else if users.isError}
		{users.isError}
	{:else}
		...
	{/if}
</div>
```

## Example

- **[Minimal](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/minimal)**
- **[Basic](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/basic)**
- **[Pagination](https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/pagination)**

## Query API

`Query.setup(options)` for the global configuration of queries.

- **`baseURI`** _(string)_ - Base API endpoint.
- **`baseInit`** _(object)_ - Default request options.
- **`cacheTimeout`** _(number)_ - Cache expiration time in milliseconds, default `2000`.
- **`onError(query, error)`** _(function)_ - Callback for errors.
- **`onSuccess(query)`** _(function)_ - Callback for successful requests.
- **`loadingSlowTimeout`** _(number)_ - Timeout duration in milliseconds before triggering slow loading handler, default `30000`.
- **`onLoadingSlow(query)`** _(function)_ - Callback triggered when a query is loading slower than expected.
- **`shouldRetryWhenError`** _(boolean)_ - Whether to retry on failure, default `false`.
- **`retryCount`** _(number)_ - Number of retries on failure, default `5`.
- **`retryDelay`** _(number)_ - Delay between retries in milliseconds, default `10000`.

<br>

`Query.clear(endpoint?: optional)`

Clears cached query results and resets internal query states. Useful when logging out users, refreshing data, or preventing stale responses.

**Parameters:**

- endpoint (optional, string) - If provided, only clears the cache for the specified endpoint.

**Usage**

```
Query.clear(); // Clears all cached queries
Query.clear("/users"); // Clears cache only for the "/users" endpoint
```

<br>

`Query.clearGroup(group: string)`

Clears all cached queries associated with a specific group. This is useful for managing grouped queries, such as clearing related data when switching views or updating dependent resources.

**Parameters:**

- group (string) - The name of the query group to clear.

**Usage**

```
const usersPageA = useQuery("/users?page=a", { group: "user-data" });
const usersPageB = useQuery("/users?page=b", { group: "user-data" });
Query.clearGroup("user-data"); // Clears all queries tagged under "user-data"
```

<br>

`Query.group(group: string)`

Retrun all queries associated with a specific group. This is useful for managing grouped queries, such as clearing related data when switching views or updating dependent resources.

**Parameters:**

- group (string) - The name of the query group to clear.

**Usage**

```
const usersPageA = useQuery("/users?page=a", { group: "user-data" });
const usersPageB = useQuery("/users?page=b", { group: "userQuery-data" });
const usersPageB = useQuery("/users", { groups: ["userQuery-data", "user-data"] });
Query.group("user-data"); // Return all queries tagged under "user-data"
Query.group("userQuery-data"); // Return all queries tagged under "userQuery-data"
```

<br>

## API

- **`useQuery(endpoint, options)`**: Fetch data from the specified endpoint with optional settings.
- **`useSingleQuery(() => string, options)`**: Fetch a dynamic single resource dynamically with optional settings.
- **`mutate(endpoint, options)`**: Perform a mutation the given endpoint with optional settings.

## Query/Data Management

`query.{...}` for managing data state and execution.

- **`data`**: The response data from the query.
- **`isError`**: Boolean indicating if an error occurred.
- **`isLoading`**: Boolean indicating if the query is loading.
- **`fetch()`**: Initiates a data fetch request.
- **`refetch(options)`**: Re-fetches the query data with optional configurations.
- **`mutate(options)`**: Mutate existing query data dynamically.
- **`clear()`**: Clears the query cache, data, isError and isLoading.
- **`endpoint`**: The API endpoint associated with the query.

## License

MIT
