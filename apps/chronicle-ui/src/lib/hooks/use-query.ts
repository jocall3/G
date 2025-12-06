import {
  useQuery as useReactQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from '@tanstack/react-query';
import { useCallback } from 'react';

// Define a type for the query function that aligns with our needs
type QueryFn<TData, TQueryKey extends QueryKey> = (context: {
  queryKey: TQueryKey;
}) => Promise<TData>;

// Embodying Covenant 32: Client-side caching and server state synchronization
// Embodying Covenant 31: The core logic for managing server state and caching

/**
 * A custom hook that implements client-side caching and server state synchronization logic,
 * embodying the principles of Covenant 32 and Covenant 31.
 *
 * This hook is designed to abstract away the complexities of data fetching, caching,
 * and state management, providing a clean and efficient way to interact with server data.
 *
 * @template TQueryFnData The type of data returned by the query function.
 * @template TError The type of error that may occur during the query.
 * @template TData The type of data that will be returned by the hook (defaults to TQueryFnData).
 * @template TQueryKey The type of the query key.
 *
 * @param {TQueryKey} queryKey - The unique key for the query. Used for caching and invalidation.
 * @param {QueryFn<TQueryFnData, TQueryKey>} queryFn - The function that fetches the data from the server.
 * @param {Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>} [options] - Optional configuration for the query.
 *
 * @returns {UseQueryResult<TData, TError>} An object containing the query state and data.
 */
export function useQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: QueryFn<TQueryFnData, TQueryKey>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    'queryKey' | 'queryFn'
  >,
): UseQueryResult<TData, TError> {
  // Covenant 32: Client-side caching and server state synchronization
  // Covenant 31: The core logic for managing server state and caching

  // The core of this hook is the useReactQuery from @tanstack/react-query.
  // We are essentially providing a more opinionated wrapper around it,
  // ensuring that all our data fetching adheres to the principles defined
  // in Covenants 31 and 32.

  // The queryKey is crucial for caching. React Query uses this key to store,
  // retrieve, and invalidate cached data. A well-defined queryKey ensures
  // that the correct data is fetched and cached.

  // The queryFn is the asynchronous function responsible for fetching data.
  // It receives the queryKey as context, allowing it to potentially use
  // parts of the key to construct API endpoints or parameters.

  // The options object allows for customization of the query's behavior,
  // such as enabling/disabling the query, setting staleTime, cacheTime,
  // onSuccess, onError, etc. These options are passed directly to
  // useReactQuery, allowing for fine-grained control over the caching
  // and synchronization behavior.

  const queryResult = useReactQuery<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >({
    queryKey,
    queryFn,
    ...options,
  });

  // We can potentially add custom logic here in the future to further
  // enforce or enhance the principles of Covenants 31 and 32,
  // such as custom error handling, data transformation, or
  // specific synchronization strategies.

  // For now, the primary implementation is delegating to react-query
  // while ensuring the structure and intent align with the covenants.

  // Example of potential future enhancement (commented out):
  // const enhancedQueryResult = useCallback(async () => {
  //   // Perform additional checks or transformations based on Covenants
  //   // For example, ensuring data integrity or specific state updates
  //   return queryResult;
  // }, [queryResult]);

  return queryResult;
}

// Example of how this hook might be used elsewhere:
/*
import { useQuery } from './use-query';

interface User {
  id: number;
  name: string;
}

const fetchUser = async ({ queryKey }: { queryKey: QueryKey }) => {
  const [_key, userId] = queryKey; // Destructure to get userId
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json() as Promise<User>;
};

function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading, error } = useQuery<User, Error, User, [string, number]>(
    ['user', userId], // Query key: ['user', 123]
    fetchUser,
    {
      enabled: !!userId, // Only fetch if userId is provided
      staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    }
  );

  if (isLoading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}
*/