<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from '../../../../lib/query.svelte.js'; // change to svelte-simple-query

	interface UserSchema {
		id: number;
		name: string;
		email: string;
	}
	const user = useQuery<UserSchema>('/users/' + page.params.slug);
	user.fetch();
</script>

<div>
	<div>
		<a href="/example/basic">Back</a>
	</div>
	{#if user.isLoading}
		Loading...
	{:else if user.data}
		{user.data.name} - {user.data.email}
	{:else if user.isError}
		{user.isError}
	{:else}
		Blank
	{/if}
</div>
