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
};

// Use QueryShape to define Query
export const Query: QueryShape = {
	baseURI: '',
	baseInit: {},
	fetcher: defaultFetcher,
	cacheTimeout: 2000,
	setup: (options: QueryOptions) => {
		Object.assign(Query, {
			...Query,
			...options
		}); // Safely update Query
	},
	bagHit: {} as Record<string, number>
};

// Use QueryShape to define QueryOptions
type QueryOptions = Omit<
	{
		[key in keyof QueryShape]?: QueryShape[key];
	},
	'setup' | 'bagHit'
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
			shouldRetryWhenErrorAttempt: number;
			disableLoading: boolean;
		};
	};
};

const CacheStore = {} as {
	[key: string]: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: any;
		time: number;
	} | null;
};

type StateQuery<T> = {
	data: T | null;
	isError: boolean | string;
	isLoading: boolean;
	fetch: () => Promise<void>;
	refetch: (options?: { disableLoading: boolean }) => Promise<void>;
	mutate: (options?: MutateOptions) => Promise<void>;
	clear: () => void;
	endpoint: string;
};

export const useQuery = <T>(endpoint: string, options?: QueryOptions) => {
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
			endpoint
		};
	}
	if (!state.system?.[endpoint]) {
		state.system[endpoint] = {
			onLoadingSlowTimeout: 0,
			shouldRetryWhenErrorTimeout: 0,
			shouldRetryWhenErrorAttempt: 0,
			disableLoading: false
		};
	}
	//
	if (options) {
		Query.setup(options);
	}
	const fetchData = async () => {
		try {
			if (Query.onLoadingSlow) {
				clearTimeout(state.system[endpoint].onLoadingSlowTimeout);
				state.system[endpoint].onLoadingSlowTimeout = setTimeout(() => {
					if (state[endpoint].isLoading && Query.onLoadingSlow) {
						Query.onLoadingSlow(state[endpoint]);
					}
				}, Query.loadingSlowTimeout ?? 30000);
			}
			if (CacheStore[endpoint]) {
				state[endpoint].data = CacheStore[endpoint].data;
				if (
					Query.cacheTimeout !== -1 &&
					new Date().getTime() - CacheStore[endpoint].time > Query.cacheTimeout
				) {
					const json = await Query.fetcher(endpoint);
					//
					CacheStore[endpoint] = {
						data: json,
						time: new Date().getTime()
					};
					state[endpoint].data = json;
					state[endpoint].isError = false;
					if (Query.onSuccess) Query.onSuccess(state[endpoint]);
				}
			} else {
				if (!state.system[endpoint].disableLoading) {
					state[endpoint].isLoading = true;
				}
				const json = await Query.fetcher(endpoint);
				CacheStore[endpoint] = {
					data: json,
					time: new Date().getTime()
				};
				state[endpoint].data = json;
				state[endpoint].isError = false;
				if (Query.onSuccess) Query.onSuccess(state[endpoint]);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			CacheStore[endpoint] = null;
			state[endpoint].isError = error;
			state[endpoint].data = null;
			if (Query.onError) Query.onError(state[endpoint], error);
			if (Query.shouldRetryWhenError) {
				clearTimeout(state.system[endpoint].shouldRetryWhenErrorTimeout);
				state.system[endpoint].shouldRetryWhenErrorTimeout = setTimeout(
					() => {
						if (state.system[endpoint].shouldRetryWhenErrorAttempt >= (Query.retryCount ?? 5)) {
							state.system[endpoint].disableLoading = false;
							return;
						}
						state.system[endpoint].shouldRetryWhenErrorAttempt++;
						state[endpoint].refetch({ disableLoading: true });
					},
					Query.retryDelay && Query.retryDelay >= 1000 ? Query.retryDelay : 10000
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
			if (Query.bagHit[endpoint] > 1) return;
			await fetchData();
			Query.bagHit[endpoint] = 0;
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
	return state[endpoint] as StateQuery<T>;
};

type MutateOptions = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	populateCache?: (currentData: any) => any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any; // data shouldn't undefined
	refetch?: boolean;
};

export const useSingleQuery = <T>(endpointCallBack: (key: string) => string) => {
	return new Proxy({}, { get: (_, key) => useQuery(endpointCallBack(key.toString())) }) as {
		[key: string]: ReturnType<typeof useQuery<T>>;
	};
};

export const mutate = async (endpoint: string, options?: MutateOptions) => {
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
