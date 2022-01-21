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

export const renderDefaultError = (error: APIError) => <Typography>{error?.message ?? 'An error occurred'}</Typography>

export const LoadingLinear = <T,>({ data, render, onError=renderDefaultError }: LoadingElement<T>) => {
  if (data.status === LoadingStatus.Loaded) return render(data.value)
  if (data.status === LoadingStatus.Error) return onError(data.value)

  return <LinearProgress/>
}

export const value_is_loaded = <T,>(data: LoadedData<T>): data is { status: LoadingStatus.Loaded, value: T } => (
  data.status === LoadingStatus.Loaded
)
 
type LoadingElements = LoadedData<any>[]
export const values_are_loaded = <T extends LoadingElements>(data: T): data is LoadedDataSuccess<any>[] & T => {
  for (const entry of data) {
    if (entry.status === LoadingStatus.Unloaded) return false 
    if (entry.status === LoadingStatus.Fetching) return false 
    if (entry.status === LoadingStatus.Error) {
      throw { index: data.indexOf(entry), error: entry.value }
    }
  }

  return true
}

export const Resolver = <T,>(p: { item: T, initialValue?: React.ReactNode, resolver: (k: T) => React.ReactNode }) => {
  const { item, resolver, initialValue } = p
  const [resolved, setResolved] = useState(initialValue ?? null as React.ReactNode)

  useEffect(() => {
    setResolved(resolver(item))
  }, [resolver])  

  return <>{resolved}</>
}