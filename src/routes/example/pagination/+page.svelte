<script lang="ts">
	import { untrack } from 'svelte';
	import { mutate, Query, useQuery, useSingleQuery } from '../../../lib/query.svelte.js'; // change to svelte-simple-query

	interface UserSchema {
		id: number;
		name: string;
		email: string;
	}
	let page = $state('1');
	let limit = $state('3');
	const useUsers = (query: Record<string, string> = {}) =>
		useQuery<UserSchema[]>('/users?' + new URLSearchParams(query), {
			onSuccess: (query) => {
				console.log('Example isolated option');
				console.log('success', query.endpoint);
			}
		});
	// svelte-ignore state_referenced_locally
	let users = $state(useUsers());

	$effect(() => {
		limit;
		page;
		untrack(() => {
			users = useUsers({
				_start: ((parseInt(page) - 1) * parseInt(limit)).toString(),
				_limit: limit
			});
			users.fetch();
		});
	});

	// useSingleQuery is dynamic query => user[key].fetch()
	const user = useSingleQuery<UserSchema>((key) => '/users/' + key);

	let statePage = $state({
		loadingAdd: false,
		loadingEdit: false
	});
	const addUser = async () => {
		statePage.loadingAdd = true;
		const res = await fetch('https://jsonplaceholder.typicode.com/users', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: 'User ' + ((users.data?.length || 0) + 1),
				email: (users.data?.length || 0) + 1 + '-user@example.com'
			})
		});
		const newUser = await res.json();
		// four way for mutate data
		// await mutate('/users', {
		// 	data: [...(users.data || []), newUser]
		// });
		// await mutate('/users', {
		// 	populateCache: (currentData) => {
		// 		return [...currentData, newUser];
		// 	}
		// });
		users.mutate({
			data: [...(users.data || []), newUser]
		});
		// users.mutate({
		// 	populateCache: (currentData) => {
		// 		return [...currentData, newUser];
		// 	}
		// });
		//
		statePage.loadingAdd = false;
	};

	const editFirstUser = async () => {
		statePage.loadingEdit = true;
		const res = await fetch('https://jsonplaceholder.typicode.com/users/1', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: 1,
				name: 'EDITED User 1'
			})
		});
		const updatedUser = await res.json();
		// mutate /users
		await users.mutate({
			data: users.data?.map((u) => ({
				...(u.id === 1 ? { ...u, ...updatedUser } : u)
			}))
		});
		// powerful dynamic user[key] for mutate their data, try open user 1 for check result
		await user[1].mutate({
			data: { ...user[1].data, ...updatedUser }
		});
		//
		statePage.loadingEdit = false;
	};
</script>

<p>
	Please note, this example is not for production, just for demo purpose.
	<br />
	Using jsonplaceholder.typicode.com, which their data is auto refresh by default.
	<br />
	<a
		href="https://github.com/harryhdt/svelte-simple-query/tree/main/src/routes/example/pagination"
		target="_blank">Check source</a
	>
</p>
<div>
	{#if users.isLoading}
		Loading...
	{:else if users.data}
		<div>
			<button type="button" onclick={addUser} disabled={statePage.loadingAdd}
				>{statePage.loadingAdd ? 'Adding...' : 'Add user'}</button
			>
			<button type="button" onclick={editFirstUser} disabled={statePage.loadingEdit}
				>{statePage.loadingEdit ? 'Updating...' : 'Edit 1st user'}</button
			>
			<button
				type="button"
				onclick={() => {
					Query.setup({ baseURI: 'https://google.com' });
					users.refetch();
				}}
			>
				Simulate error
			</button>
		</div>
		{#each users.data as u, i}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_mouse_events_have_key_events -->
			<div
				onmouseover={() => {
					// simulate for pre-fetch before link opened, dynamic using powerful useSingleQuery
					user[u.id].fetch();
				}}
			>
				{i + 1}.
				<a href="/example/basic/{u.id}">
					{u.name}
				</a>
			</div>
		{:else}
			<div>No users yet.</div>
		{/each}
		<select bind:value={page}>
			<option value="1">1</option>
			<option value="2">2</option>
			<option value="3">3</option>
		</select>
		<select bind:value={limit}>
			<option value="3">3</option>
			<option value="5">5</option>
			<option value="10">10</option>
			<option value="15">15</option>
		</select>
		<button type="button" onclick={() => users.refetch()}>Refresh</button>
	{:else if users.isError}
		{users.isError}
		<button type="button" onclick={() => users.refetch()}>Try again</button>
		<button
			type="button"
			onclick={() => {
				Query.setup({ baseURI: 'https://jsonplaceholder.typicode.com' });
				users.refetch();
			}}>Reset</button
		>
	{:else}
		Blank
	{/if}
</div>
