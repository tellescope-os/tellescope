export interface Indexable<T=any> { [index: string] : T }
export enum LoadingStatus {
  Unloaded = 0,
  Fetching,
  Error,
  Loaded,
}
export const UNLOADED: { status: LoadingStatus.Unloaded, value: undefined } = { 
  status: LoadingStatus.Unloaded, 
  value: undefined,
}

export type LoadedDataSuccess<T> = { status: LoadingStatus.Loaded, value: T }

export type LoadedData<T=any> = typeof UNLOADED
  | { status: LoadingStatus.Fetching, value: undefined }
  | { status: LoadingStatus.Error, value: APIError } 
  | LoadedDataSuccess<T>

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
export type APIErrorHandler = (e: APIError) => void;

export type SessionType = "user" | "enduser"

export type SortOption = "oldFirst" | "newFirst"

export type JSONType = null | number | boolean | string | object | undefined

export interface CustomUpdateOptions {
  replaceObjectFields?: boolean,
}

export type CUD = 'create' | 'update' | 'delete' 
export type CRUD = CUD | 'read'
export type HTTPMethod = 'post' | 'get' | 'patch' | 'delete' 
export type Operation = CRUD | 'createMany' | 'readMany' 

export interface FileBlob extends Blob {
  name: string;
}
export interface FileDetails {
  name: string;
  size: number;
  type: string;
  enduserId?: string;
}
export interface FileBuffer extends Buffer, FileDetails {} 
export interface ReactNativeFile {
  uri: string,
  name: string,
  type: string,
}

export interface S3PresignedPost {
  url: string,
  fields: {
    'Content-Type': string,
    key: string,
    bucket: string,
    'X-Amz-Algorithm': string,
    'X-Amz-Credential': string,
    'X-Amz-Date': string,
    Policy: string,
    'X-Amz-Signature': string,
  },
}

export type UserIdentity = {
  type: SessionType,
  id: string,
}

export const assertUnreachable = (x: never): never => {
  throw new Error("Reached invalid code - conditional logic is likely not exhaustive");
}