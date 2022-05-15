import React, { useEffect, useState } from "react"

import {
  APIError,

  LoadedData,
  LoadedDataSuccess,
  LoadingStatus,
} from "@tellescope/types-utilities"

import {
  LinearProgress,
  Typography,
} from "./mui"

export { LoadedData, LoadedDataSuccess, APIError, LoadingStatus }

interface LoadingElement <T>{
  data: LoadedData<T>,
  render: (data: T) => React.ReactElement,
  onError?: (error: APIError) => React.ReactElement,
}

export const renderDefaultError = (error: APIError) => {
  console.error(error)
  return <Typography>{error?.message ?? 'An error occurred'}</Typography>
}

export const LoadingLinear = <T,>({ data, render, onError=renderDefaultError }: LoadingElement<T>) => {
  if (data.status === LoadingStatus.Loaded) return render(data.value)
  if (data.status === LoadingStatus.Error) return onError(data.value)

  return <LinearProgress/>
}

export const value_is_loaded = <T,>(data: LoadedData<T>): data is { status: LoadingStatus.Loaded, value: T } => (
  data.status === LoadingStatus.Loaded
)

interface LoadingDataProps <T> {
  data: { [K in keyof T]: LoadedData<T[K]> },
  render: (data: T) => React.ReactElement,
  onError?: (error: APIError) => React.ReactElement,
}
export const LoadingData = <T,>({ data, render, onError=renderDefaultError } : LoadingDataProps<T>) => {
  const values = Object.values(data) as LoadedData<any>[]

  const error = values.find(v => v.status === LoadingStatus.Error)
  if (error) { 
    return onError(error.value) 
  }

  // if anything is still loading
  if (values.find(v => v.status !== LoadingStatus.Loaded)) { 
    return <LinearProgress /> 
  }

  const loadedData = {} as T
  for (const k in data) {
    loadedData[k] = (data[k] as LoadedDataSuccess<any>).value 
  }
  return render(loadedData)
}

export const Resolver = <T,>(p: { item: T, initialValue?: React.ReactNode, resolver: (k: T) => React.ReactNode }) => {
  const { item, resolver, initialValue } = p
  const [resolved, setResolved] = useState(initialValue ?? null as React.ReactNode)

  useEffect(() => {
    setResolved(resolver(item))
  }, [resolver])  

  return <>{resolved}</>
}