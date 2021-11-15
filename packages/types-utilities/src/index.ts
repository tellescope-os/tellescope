export interface Indexable<T=any> { [index: string] : T }
export enum LoadingStatus {
  Loading,
  Error,
  Loaded,
}
export const LOADING: { status: LoadingStatus.Loading, value: undefined } = { 
  status: LoadingStatus.Loading, value: undefined 
}

export type LoadedData<T=any> = typeof LOADING
  | { status: LoadingStatus.Error, value: APIError } 
  | { status: LoadingStatus.Loaded, value: T } 

export type APIError = {
  code: number,
  message: string,
  info: {},
}

export type SessionType = "user" | "enduser"

export type SortOption = "oldFirst" | "newFirst"