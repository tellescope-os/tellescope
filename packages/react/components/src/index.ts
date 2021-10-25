import { useEffect, useRef, useState } from "react"

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import {
  LoadedData,
} from "@tellescope/types-utilities"

export * from "./layout.web";
export * from "./tables.web";
export * from "./forms.web";
export * from "./loading.web";



export const useLoadedState = <T>(fetch?: () => Promise<T>) => {
  const fetchedRef = useRef(false)
  const [data, setData] = useState('loading' as LoadedData<T>)

  useEffect(() => {
    if (!fetch || fetchedRef.current === true) return
    fetchedRef.current = true

    fetch().then(setData).catch(console.error)
  }, [fetch, fetchedRef])

  return [data, setData] as [T | 'loading', React.Dispatch<React.SetStateAction<T | "loading">>]
}