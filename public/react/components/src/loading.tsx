import React, { useEffect, useState } from "react"

import {
  APIError,

  LoadedData,
  LoadingStatus,
} from "@tellescope/types-utilities"

import {
  LinearProgress,
} from "./mui"

interface LoadingElement <T>{
  data: LoadedData<T>,
  render: (data: T) => React.ReactElement,
  onError?: (error: APIError) => React.ReactElement,
}

export const LoadingLinear = <T,>({ data, render, onError }: LoadingElement<T>) => {
  if (data.status === LoadingStatus.Loading) return <LinearProgress/>
  if (data.status === LoadingStatus.Error) return onError?.(data.value) ?? null

  return render(data.value)
}

export const Resolver = <T,>(p: { item: T, initialValue?: React.ReactNode, resolver: (k: T) => React.ReactNode }) => {
  const { item, resolver, initialValue } = p
  const [resolved, setResolved] = useState(initialValue ?? null as React.ReactNode)

  useEffect(() => {
    setResolved(resolver(item))
  }, [resolver])  

  return <>{resolved}</>
}