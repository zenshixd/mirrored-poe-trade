export async function parallelize<T, R>(arr: T[], mapFn: (item: T) => Promise<R>): Promise<R[]> {
    return Promise.all(arr.map(mapFn));
}