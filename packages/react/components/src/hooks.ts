import React, { useEffect, useRef, useState } from "react"
import {
  Indexable,
  LoadedData,
  LoadingStatus,
  LOADING
} from "@tellescope/types-utilities"
import {
  objects_equivalent,
} from "@tellescope/utilities"

export const useLoadedState = <T, D={}>(fetch?: (d: Partial<D>) => Promise<T | void>, dependencies?: D) => {
  const fetchedRef = useRef(undefined as typeof dependencies | null)
  const [data, setData] = useState(LOADING as LoadedData<T>)

  useEffect(() => {
    if (!fetch) return
    if (dependencies && objects_equivalent(dependencies, fetchedRef.current ?? undefined)) return
    if (fetchedRef.current === null) return

    fetchedRef.current = dependencies ?? null

    fetch(dependencies ?? {})
    .then(value => setData(value ? { status: LoadingStatus.Loaded, value } : LOADING ))
    .catch(error => setData({ status: LoadingStatus.Error, value: error }))
  }, [fetch, ...Object.values(dependencies ?? []), fetchedRef])

  return [data, setData] as [LoadedData<T>, React.SetStateAction<LoadedData<T>>]
}