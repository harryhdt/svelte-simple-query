const defaultFetcher = async (url: string) => {
	const res = await fetch(Query.baseURI + url, {
		...Query.baseInit
	});

	if (!res.ok) {
		const error = new Error(
			'An error occurred while fetching the data.'
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		) as any;
		error.info = await res.json();
		error.status = res.status;
		//
		throw error;
	}

	return res.json();
};

type QueryShape = {
	baseURI: string;
	baseInit: RequestInit;
	fetcher: typeof defaultFetcher;
	cacheTimeout: number;
	setup: (options: Omit<QueryOptions, 'setup'>) => void;
	bagHit: Record<string, number>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onError?: (query: StateQuery<any>, error: any) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSuccess?: (query: StateQuery<any>) => void;
	loadingSlowTimeout?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onLoadingSlow?: (query: StateQuery<any>) => void;
	retryCount?: number;
	retryDelay?: number;
	shouldRetryWhenError?: boolean;
	clear: (endpoint?: string) => void;
	clearGroup: (group?: string) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	group: (group: string) => StateQuery<any>[];
};

// Use QueryShape to define Query
export const Query: QueryShape = {
	baseURI: '',
	baseInit: {},
	fetcher: defaultFetcher,
	cacheTimeout: 2000,
	setup: (options: QueryOptions) => {
		// Safely update Query
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		delete options.setup;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		delete options.bagHit;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		delete options.clear;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		delete options.clearGroup;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		delete options.group;
		Object.assign(Query, {
			...Query,
			...options
		}); // Safely update Query
	},
	bagHit: {} as Record<string, number>,
	clear: (endpoint) => {
		if (endpoint) {
			CacheStore[endpoint] = null;
			state[endpoint].data = null;
			state[endpoint].isError = false;
			state[endpoint].isLoading = false;
			Query.bagHit[endpoint] = 0;
			return;
		} else {
			CacheStore = {};
			Object.keys(state).forEach((key) => {
				state[key].data = null;
				state[key].isError = false;
				state[key].isLoading = false;
				Query.bagHit[key] = 0;
			});
			return;
		}
	},
	clearGroup: (group) => {
		Object.keys(state).forEach((key) => {
			if (state[key].group === group) {
				CacheStore[key] = null;
				state[key].data = null;
				state[key].isError = false;
				state[key].isLoading = false;
				Query.bagHit[key] = 0;
			}
		});
	},
	group: (group) => {
		return Object.keys(state)
			.filter((key) => {
				return state[key].group === group || state[key].groups?.includes(group);
			})
			.map((key) => {
				return state[key];
			});
	}
};

// Use QueryShape to define QueryOptions
type QueryOptions = Omit<
	{
		[key in keyof QueryShape]?: QueryShape[key];
	},
	'setup' | 'bagHit' | 'clear' | 'clearGroup' | 'group'
>;

const state = $state({ system: {} }) as {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: StateQuery<any>;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	system: {
		[key: string]: {
			onLoadingSlowTimeout: number;
			shouldRetryWhenErrorTimeout: number;
			disableLoading: boolean;
			inFlightPromise: Promise<void> | null;
			lastErrorSequenceId: number;
			retryAttemptForSequence: number;
		};
	};
};

// Known Limitation: state and CacheStore objects grow unbounded for dynamic endpoints.
// After many paginated/filtered queries, old entries remain in memory.
// Acceptable for most apps, but heavy dynamic usage (10k+ unique queries) may cause memory bloat.
// Consider: implementing LRU eviction, manual purge(), or accepting the limitation.
let CacheStore = {} as {
	[key: string]: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: any;
		time: number;
	} | null;
};

type StateQuery<T, TError = never> = {
	data: T | null;
	isError: boolean | string | TError;
	isLoading: boolean;
	fetch: () => Promise<void>;
	refetch: (options?: { disableLoading: boolean }) => Promise<void>;
	mutate: (options?: MutateOptions) => Promise<void>;
	clear: () => void;
	endpoint: string;
	group?: string;
	groups?: string[];
};

export const useQuery = <T, TError = never>(
	endpoint: string,
	options?: QueryOptions & { group?: string; groups?: string[] }
) => {
	//
	if (!state[endpoint]) {
		state[endpoint] = {
			data: null,
			isError: false,
			isLoading: false,
			fetch: null!,
			refetch: null!,
			mutate: null!,
			clear: null!,
			endpoint,
			group: options?.group,
			groups: options?.groups
		};
	}
	if (!state.system?.[endpoint]) {
		state.system[endpoint] = {
			onLoadingSlowTimeout: 0,
			shouldRetryWhenErrorTimeout: 0,
			disableLoading: false,
			inFlightPromise: null,
			lastErrorSequenceId: 0,
			retryAttemptForSequence: 0
		};
	}
	//
	const TheQuery = { ...Query };
	if (options) {
		TheQuery.setup(options);
	}
	const fetchData = async () => {
		try {
			if (TheQuery.onLoadingSlow) {
				clearTimeout(state.system[endpoint].onLoadingSlowTimeout);
				state.system[endpoint].onLoadingSlowTimeout = setTimeout(() => {
					if (state[endpoint].isLoading && TheQuery.onLoadingSlow) {
						TheQuery.onLoadingSlow(state[endpoint]);
					}
				}, TheQuery.loadingSlowTimeout ?? 30000);
			}
			if (CacheStore[endpoint]) {
				state[endpoint].data = CacheStore[endpoint].data;
				if (
					TheQuery.cacheTimeout !== -1 &&
					new Date().getTime() - CacheStore[endpoint].time > TheQuery.cacheTimeout
				) {
					const json = await TheQuery.fetcher(endpoint);
					//
					CacheStore[endpoint] = {
						data: json,
						time: new Date().getTime()
					};
					state[endpoint].data = json;
					state[endpoint].isError = false;
					if (TheQuery.onSuccess) TheQuery.onSuccess(state[endpoint]);
					state.system[endpoint].retryAttemptForSequence = 0;
					state.system[endpoint].disableLoading = false; // Reset temp suppression after successful fetch
				}
			} else {
				if (!state.system[endpoint].disableLoading) {
					state[endpoint].isLoading = true;
				}
				const json = await TheQuery.fetcher(endpoint);
				CacheStore[endpoint] = {
					data: json,
					time: new Date().getTime()
				};
				state[endpoint].data = json;
				state[endpoint].isError = false;
				if (TheQuery.onSuccess) TheQuery.onSuccess(state[endpoint]);
				state.system[endpoint].retryAttemptForSequence = 0;
				state.system[endpoint].disableLoading = false; // Reset temp suppression after successful fetch
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			CacheStore[endpoint] = null;
			state[endpoint].isError = error;
			state[endpoint].data = null;
			if (TheQuery.onError) TheQuery.onError(state[endpoint], error);
			if (TheQuery.shouldRetryWhenError) {
				clearTimeout(state.system[endpoint].shouldRetryWhenErrorTimeout);
				// Generate unique sequence ID for this error event to prevent race conditions
				const errorSequenceId = Date.now();
				state.system[endpoint].lastErrorSequenceId = errorSequenceId;
				state.system[endpoint].retryAttemptForSequence = 0;
				state.system[endpoint].shouldRetryWhenErrorTimeout = setTimeout(
					() => {
						// Only retry if still in same error sequence
						if (state.system[endpoint].lastErrorSequenceId !== errorSequenceId) {
							return;
						}
						if (state.system[endpoint].retryAttemptForSequence >= (TheQuery.retryCount ?? 5)) {
							state.system[endpoint].disableLoading = false;
							return;
						}
						state.system[endpoint].retryAttemptForSequence++;
						state[endpoint].refetch({ disableLoading: true });
					},
					TheQuery.retryDelay && TheQuery.retryDelay >= 1000 ? TheQuery.retryDelay : 10000
				);
			}
		} finally {
			state[endpoint].isLoading = false;
		}
	};
	//
	if (!state[endpoint].fetch) {
		state[endpoint].fetch = async () => {
			Query.bagHit[endpoint] = (Query.bagHit[endpoint] || 0) + 1;
			if (Query.bagHit[endpoint] > 1) {
				// Deduplicated request: wait for in-flight fetch to complete
				if (state.system[endpoint].inFlightPromise) {
					await state.system[endpoint].inFlightPromise;
				}
				return;
			}
			state.system[endpoint].inFlightPromise = fetchData();
			await state.system[endpoint].inFlightPromise;
			Query.bagHit[endpoint] = 0;
			state.system[endpoint].inFlightPromise = null;
		};
	}
	if (!state[endpoint].refetch) {
		state[endpoint].refetch = async (opt) => {
			if (opt && opt.disableLoading) {
				state.system[endpoint].disableLoading = opt.disableLoading;
			} else {
				state.system[endpoint].disableLoading = false;
			}
			CacheStore[endpoint] = null;
			await fetchData();
		};
	}
	if (!state[endpoint].mutate) {
		state[endpoint].mutate = async (options) => {
			await mutate(endpoint, options);
		};
	}
	if (!state[endpoint].clear) {
		state[endpoint].clear = () => {
			CacheStore[endpoint] = null;
			state[endpoint].data = null;
			state[endpoint].isError = false;
			state[endpoint].isLoading = false;
			Query.bagHit[endpoint] = 0;
		};
	}
	//
	return state[endpoint] as StateQuery<T, TError>;
};

type MutateOptions = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	populateCache?: (currentData: any) => any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any; // data shouldn't undefined
	refetch?: boolean;
};

export const useSingleQuery = <T, TError = never>(
	endpointCallBack: (key: string) => string,
	options?: QueryOptions & { group?: string; groups?: string[] }
) => {
	return new Proxy(
		{},
		{
			get: (_, key) => {
				// Clone the options each time to avoid mutation problems
				const clonedOptions = options ? { ...options } : undefined;
				return useQuery(endpointCallBack(key.toString()), clonedOptions);
			}
		}
	) as {
		[key: string]: ReturnType<typeof useQuery<T, TError>>;
	};
};
export const useDynamicQueries = useSingleQuery;

export const mutate = async (endpoint: string, options?: MutateOptions) => {
	if (!state[endpoint]) {
		console.warn(`[Query] No query found for endpoint: ${endpoint}`);
		return;
	}
	const defaultOptions = { refetch: options?.data || options?.populateCache ? false : true };
	options = { ...defaultOptions, ...options };
	//
	let data = options.data;
	if (options.populateCache) {
		data = options.populateCache(state[endpoint].data);
	}
	if (data !== undefined) {
		CacheStore[endpoint] = {
			data,
			time: new Date().getTime()
		};
		state[endpoint].data = data;
	}
	if (options.refetch) {
		await state[endpoint].refetch();
	}
};

// ## To Do
// autoRefetchWhenOnline => boolean => check cache first
// autoRefetchWhenFocus => boolean => check cache first
// Feature Web Socket
