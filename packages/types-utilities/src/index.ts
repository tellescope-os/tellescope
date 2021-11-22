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

export type ErrorType = "User" | "Internal"
export type ErrorCode = 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 500
export const isErrorCode = (c: any): c is ErrorCode => 
  [400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 500].includes(c)

export interface ErrorInfo {
  message: string;
  info: object;
}
export interface APIError extends ErrorInfo {
  code: ErrorCode,
}

export type SessionType = "user" | "enduser"

export type SortOption = "oldFirst" | "newFirst"

export type JSONType = null | number | boolean | string | object | undefined

export interface CustomUpdateOptions {
  replaceObjectFields?: boolean,
}

export type CRUD = 'create' | 'update' | 'read' | 'delete' 
export type HTTPMethod = 'post' | 'get' | 'patch' | 'delete' 
export type Operation = CRUD | 'createMany' | 'readMany' 

export interface FileBlob extends Blob {
  name: string;
}

export interface S3PresignedPost {
  url: string,
  fields: Indexable,
}