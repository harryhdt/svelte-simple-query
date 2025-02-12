<script lang="ts">
	import { Query, useQuery } from '../../../lib/query.svelte.js'; // change to svelte-simple-query

	Query.setup({
		baseURI: 'https://jsonplaceholder.typicode.com',
		baseInit: {
			headers: {
				'cache-control': 'no-cache' // since jsonplaceholder typicode cached by default
			}
		}
	});

	interface UserSchema {
		id: number;
		name: string;
		email: string;
	}
	const users = useQuery<UserSchema[]>('/users');
	users.fetch();
</script>

<p>
	Please note, this example is not for production, just for demo purpose.
	<br />
	Using jsonplaceholder.typicode.com, which their data is auto refresh by default.
	<br />
	<a
		href="https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/minimal"
		target="_blank">Check source</a
	>
</p>

<div>
	{#if users.isLoading}
		Loading...
	{:else if users.data}
		{#each users.data as u, i}
			<div>
				{i + 1}.
				{u.name}
			</div>
		{:else}
			<div>No users yet.</div>
		{/each}
		<button type="button" onclick={() => users.refetch()}>Refresh</button>
	{:else if users.isError}
		{users.isError}
		<button type="button" onclick={() => users.refetch()}>Try again</button>
	{:else}
		Blank
	{/if}
</div>
