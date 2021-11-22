import React, { useCallback, useEffect, useRef } from 'react'

import { useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { createSlice, configureStore, PayloadAction, Slice, current } from '@reduxjs/toolkit'
 
import {
  APIError,
  Indexable,
  LoadingStatus,
  LoadedData,
  LOADING,
  SessionType,
} from "@tellescope/types-utilities"

import {
  ChatRoom,
  ChatMessage,
} from "@tellescope/types-client"

import {
  useSession,
  useEnduserSession,
} from "./authentication"

// doesn't throw
export const toLoadedData = async <T,>(p: () => Promise<T>): Promise<{
  status: LoadingStatus.Loaded, value: T,
} | {
  status: LoadingStatus.Error, value: APIError
}> => {
  try {
    return { status: LoadingStatus.Loaded, value: await p() }
  } catch(err: any) {
    return { status: LoadingStatus.Error, value: err }
  }
}

export const update_element_in_array = <T extends { id: string }>(a: LoadedData<T[]>, id: string, updates: Partial<T>) => {
  if (a.status !== LoadingStatus.Loaded) return a
  if (a.value.find(a => a.id === id) === undefined) return a
 
  return { status: LoadingStatus.Loaded, value: a.value.map(e => e.id === id ? { ...e, ...updates } : e)}
}

interface ListReducers<T> {
  set: (state: LoadedData<T[]>, action: PayloadAction<LoadedData<T[]>>) => void; 
  add: (state: LoadedData<T[]>, action: PayloadAction<T>) => void; 
  update: (state: LoadedData<T[]>, action: PayloadAction<{ id: string, updates: Partial<T>}>) => void; 
  [index: string]: any
}

export const createSliceForList = <T extends { id: string }, N extends string>(name: N) => createSlice<LoadedData<T[]>, ListReducers<T>, N>({
  name,
  initialState: LOADING as LoadedData<T[]>,
  reducers: {
    set: (_, action) => action.payload,
    add: (state, action) => {
      if (state.status !== LoadingStatus.Loaded) {
        return { status: LoadingStatus.Loaded, value: [action.payload] }
      }
      if (state.value.find(v => v.id === action.payload.id) !== undefined) {
        return // don't insert duplicate
      }
      state.value.unshift(action.payload)
    },
    update: (state, action) => update_element_in_array(state, action.payload.id, {
      ...action.payload.updates,
      updatedAt: (action.payload as any).updatedAt ?? new Date().toString()
    })
  }
})

interface MappedListReducers<T extends { id: string }> {
  setForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadAction<{ key: string, value: LoadedData<T[]> }>) => void;
  addElementForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadAction<{ key: string, e: T }>) => void; 
  [index: string]: any
}
export const createSliceForMappedListState = <T extends { id: string }, N extends string>(name: N) => createSlice<Indexable<LoadedData<T[]>>, MappedListReducers<T>, N>({
  name,
  initialState: {} as Indexable<LoadedData<T[]>>,
  reducers: {
    setForKey: (state, action) => {
      state[action.payload.key] = action.payload.value
    },
    addElementForKey: (state, action) => {
      if (state[action.payload.key].status !== LoadingStatus.Loaded) {
        state[action.payload.key] = { status: LoadingStatus.Loaded, value: [action.payload.e] }
      }
      if ((state[action.payload.key].value as T[]).find(v => v.id === action.payload.e.id) !== undefined) {
        return // don't insert duplicate
      }

      (state[action.payload.key].value as T[]).unshift(action.payload.e)
    }
  }
})

const chatRoomsSlice = createSliceForList<ChatRoom, 'chat_rooms'>('chat_rooms')
const chatsSlice = createSliceForMappedListState<ChatMessage, 'chats'>('chats')

export const sharedConfig = {
  reducer: { 
    chat_rooms: chatRoomsSlice.reducer,
    chats: chatsSlice.reducer,
  },
}

const _store = configureStore(sharedConfig)
type RootState = ReturnType<typeof _store.getState>
type AppDispatch = typeof _store.dispatch

const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
const useTypedDispatch = () => useDispatch<AppDispatch>()

export interface ListUpdateMethods <T>{
  addElement: (e: T) => void,
  updateElement: (id: string, e: Partial<T>) => void,
}
export const useListStateHook = <T extends { id: string }>(state: LoadedData<T[]>, loadQuery: () => Promise<T[]>, slice: Slice<any, ListReducers<T>>): [
  LoadedData<T[]>, ListUpdateMethods<T>, 
] => {
  const dispatch = useTypedDispatch()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (state !== LOADING || loadedRef.current === true) return

    loadedRef.current = true
    toLoadedData(loadQuery).then(
      es => dispatch(slice.actions.set(es))
    )
  }, [state, loadedRef])

  const addElement = useCallback((e: T) => {
    dispatch(slice.actions.add(e))
  }, [dispatch, slice])

  const updateElement = useCallback((id: string, updates: Partial<T>) => {
    dispatch(slice.actions.update({ id, updates }))
  }, [dispatch, slice])

  return [state, { addElement, updateElement }]
}

export interface MappedListUpdateMethods <T>{
  addElementForKey:  (key: string, e: T) => void,
  addElementsForKey: (key: string, e: T[]) => void,
}
export const useMappedListStateHook = <T extends { id: string }>(state:  Indexable<LoadedData<T[]>>, key: string, loadQuery: () => Promise<T[]>, slice: Slice<any, MappedListReducers<T>>): [
  LoadedData<T[]>, MappedListUpdateMethods<T>,
] => {
  const dispatch = useTypedDispatch()
  const loadedRef = useRef({ } as Indexable<boolean>)

  useEffect(() => {
    if (loadedRef.current[key] === true) return 
    if (!key) return

    loadedRef.current[key] = true
    toLoadedData(loadQuery).then(
      value => dispatch(slice.actions.setForKey({ key, value }))
    )
  }, [key])

  const addElementForKey = useCallback((key: string, e: T) => {
    dispatch(slice.actions.addElementForKey({ key, e } ))
  }, [dispatch, slice]) 

  const addElementsForKey = useCallback((key: string, es: T[]) => {
    for (const e of es) addElementForKey(key, e)
  }, [addElementForKey]) 

  return [state[key] ?? LOADING, {
    addElementForKey,
    addElementsForKey,
  }]
}

// const useSocketConnectionForList = <T extends { id: string }>(session: Session | EnduserSession) => {}

const useResolvedSession = (type: SessionType) => {
  const u_session = useSession({ throwIfMissingContext: type === 'user' })
  const e_session = useEnduserSession({ throwIfMissingContext: type === 'enduser' })
  return type === 'user' ? u_session : e_session
}

export const useChatRooms = (type: SessionType) => {
  return useListStateHook(useTypedSelector(s => s.chat_rooms), useResolvedSession(type).api.chat_rooms.getSome, chatRoomsSlice)
}

export const useChats = (roomId: string, type: SessionType) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chats)
  const toReturn = useMappedListStateHook(state, roomId, () => session.api.chats.getSome({ filter: { roomId } }), chatsSlice)
  const [_, { updateElement: updateChatRoom }] = useChatRooms(type)  

  useEffect(() => {
    if (!roomId) return

    session.subscribe({
      [roomId]: 'chats'
    }, {
      'created-chats': (cs: ChatMessage[]) => { 
        const newest = cs[0]
        toReturn[1].addElementsForKey(roomId, cs) 
        updateChatRoom(roomId, { recentMessage: newest.message, recentSender: newest.senderId ?? '' })
      }
    })

    return () => {
      session.unsubscribe([roomId])
      session.removeAllSocketListeners('created-chats')
    }
  }, [session, roomId, toReturn, updateChatRoom])

  return toReturn
}