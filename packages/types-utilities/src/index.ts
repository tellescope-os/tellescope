export interface Indexable<T=any> { [index: string] : T }
export type LoadedData<T=any> = 'loading' | T