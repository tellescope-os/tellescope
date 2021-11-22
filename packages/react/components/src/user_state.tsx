import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit'

import {
  Enduser,
} from "@tellescope/types-client"

import {
  SessionOptions,
} from "@tellescope/sdk"

import {
  useSession,
  WithSession,
} from "./authentication"

import {
  sharedConfig,
  createSliceForList,
  useListStateHook,
} from "./state"

const endusersSlice = createSliceForList<Enduser, 'endusers'>('endusers')

const store = configureStore({
  reducer: { 
    endusers: endusersSlice.reducer,
    ...sharedConfig.reducer,
  },
})
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
const useTypedDispatch = () => useDispatch<AppDispatch>()

type Values<T> = {
  value: T[],
  setValue: (t: T[]) => void,
}

export const WithUserState = ({ children, sessionOptions }: { children: React.ReactNode, sessionOptions?: SessionOptions  }) => (
  <WithSession sessionOptions={sessionOptions}>  
    <Provider store={store}>
      {children}
    </Provider>
  </WithSession>
)

export const useEndusers = () => {
  return useListStateHook(useTypedSelector(s => s.endusers), useSession().api.endusers.getSome, endusersSlice)
}