<script lang="ts">
	import { Query } from '../../../lib/query.svelte.js'; // change to svelte-simple-query
	import type { LayoutProps } from './$types.js';
	let { children }: LayoutProps = $props();

	Query.setup({
		baseURI: 'https://jsonplaceholder.typicode.com',
		baseInit: {
			headers: {
				'cache-control': 'no-cache' // since jsonplaceholder typicode cached by default
			}
		},
		cacheTimeout: 5000, // -1 for no cache
		onError: (query, error) => {
			console.log('error', query.endpoint);
			console.warn(error);
		},
		onSuccess: (query) => {
			console.log('success', query.endpoint);
		},
		loadingSlowTimeout: 10000,
		onLoadingSlow: (query) => {
			console.log('loading slow', query.endpoint);
		},
		shouldRetryWhenError: true,
		retryCount: 5,
		retryDelay: 5000
	});
</script>

{@render children()}
