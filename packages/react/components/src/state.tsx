import React, { useCallback, useContext, useEffect, useRef, createContext } from 'react'

import { useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux'
import { createSlice, configureStore, PayloadAction, Slice } from '@reduxjs/toolkit'
 
import {
  APIError,
  Indexable,
  LoadingStatus,
  LoadedData,
  UNLOADED,
  SessionType,
} from "@tellescope/types-utilities"

import {
  ChatRoom,
  ChatMessage,
} from "@tellescope/types-client"
import {
  ModelName,
} from "@tellescope/types-models"

import {
  useSession,
  useEnduserSession,
} from "./authentication"
import { Session, EnduserSession } from '@tellescope/sdk'

const FetchContext = createContext({} as Indexable<boolean>)
export const WithFetchContext = ( { children } : { children: React.ReactNode }) => (
  <FetchContext.Provider value={{ }}>{children}</FetchContext.Provider>
)

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

export const add_elements_to_array = <T extends { id: string }>(a: LoadedData<T[]>, elements: T[]) => {
  if (a.status !== LoadingStatus.Loaded) return { status: LoadingStatus.Loaded, value: elements }
 
  const newValues = elements.filter(e => a.value.find(v => v.id === e.id) === undefined) 
  return { status: LoadingStatus.Loaded, value: [...newValues, ...a.value] }
}


export const update_elements_in_array = <T extends { id: string }>(a: LoadedData<T[]>, updates: { [id: string]: Partial<T> }) => {
  if (a.status !== LoadingStatus.Loaded) return a

  return { status: LoadingStatus.Loaded, value: a.value.map(e => !!updates[e.id] ? { ...e, ...updates[e.id] } : e)}
}

export const remove_elements_in_array = <T extends { id: string }>(a: LoadedData<T[]>, ids: string[]) => {
  if (a.status !== LoadingStatus.Loaded) return a
  return { status: LoadingStatus.Loaded, value: a.value.filter(v => !ids.includes(v.id) )}
}

interface ListReducers<T> {
  set: (state: LoadedData<T[]>, action: PayloadAction<LoadedData<T[]>>) => void; 
  setFetching: (state: LoadedData<T[]>) => void;
  add: (state: LoadedData<T[]>, action: PayloadAction<T>) => void; 
  addSome: (state: LoadedData<T[]>, action: PayloadAction<T[]>) => void; 
  update: (state: LoadedData<T[]>, action: PayloadAction<{ id: string, updates: Partial<T>}>) => void; 
  updateSome: (state: LoadedData<T[]>, action: PayloadAction<{ [id: string]: Partial<T>}>) => void; 
  remove: (state: LoadedData<T[]>, action: PayloadAction<{ id: string }>) => void; 
  removeSome: (state: LoadedData<T[]>, action: PayloadAction<{ ids: string[] }>) => void; 
  [index: string]: any
}

export const createSliceForList = <T extends { id: string }, N extends string>(name: N) => createSlice<LoadedData<T[]>, ListReducers<T>, N>({
  name,
  initialState: UNLOADED as LoadedData<T[]>,
  reducers: {
    set: (_, action) => action.payload,
    setFetching: (s) => s.status === LoadingStatus.Unloaded ? { status: LoadingStatus.Fetching, value: undefined } : s,
    add: (state, action) => add_elements_to_array(state, [action.payload]),
    addSome: (state, action) => add_elements_to_array(state, action.payload),
    update: (state, action) => update_elements_in_array(state, { 
      [action.payload.id]: {
        ...action.payload.updates,
        updatedAt: (action.payload as any).updatedAt ?? new Date().toString()
      }
    }),
    updateSome: (state, action) => update_elements_in_array(state, action.payload),
    remove: (s, a) => remove_elements_in_array(s, [a.payload.id]),
    removeSome: (s, a) => remove_elements_in_array(s, a.payload.ids),
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
        return state
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
  addElements: (e: T[]) => void,
  findById: (id: string) => T | undefined,
  updateElement: (id: string, e: Partial<T>) => void,
  updateElements: (updates: { [id: string]: Partial<T> }) => void,
  removeElement: (id: string) => void,
  removeElements: (ids: string[]) => void,
}
export type ListStateReturnType <T extends { id: string }> = [LoadedData<T[]>, ListUpdateMethods<T>]
export const useListStateHook = <T extends { id: string }>(
  modelName: ModelName,
  state: LoadedData<T[]>, 
  session: Session | EnduserSession,
  slice: Slice<any, ListReducers<T>>,
  loadQuery: () => Promise<T[]>, 
  options?: {
    socketConnection: 'model' | 'keys' | 'self' | 'none'
  }
): ListStateReturnType<T> => 
{
  const socketConnection = options?.socketConnection ?? 'model'
  const dispatch = useTypedDispatch()
  const didFetch = useContext(FetchContext)

  const addElement = useCallback((e: T) => {
    dispatch(slice.actions.add(e))
  }, [dispatch, slice])
  const addElements = useCallback((es: T[]) => {
    dispatch(slice.actions.addSome(es))
  }, [dispatch, slice])

  const updateElement = useCallback((id: string, updates: Partial<T>) => {
    dispatch(slice.actions.update({ id, updates }))
  }, [dispatch, slice])
  const updateElements = useCallback((updates: { [id: string] : Partial<T> }) => {
    dispatch(slice.actions.updateSome(updates))
  }, [dispatch, slice])

  const removeElement = useCallback(id => {
    dispatch(slice.actions.remove(id))
  }, [dispatch, slice])
  const removeElements = useCallback(ids => {
    dispatch(slice.actions.removeSome(ids))
  }, [dispatch, slice])

  const findById = useCallback((id: string) => {
    if (!id) return undefined
    if (state.status !== LoadingStatus.Loaded) return undefined

    return state.value.find(v => v.id === id)
  }, [state])

  useEffect(() => {
    if (didFetch[modelName]) return
    didFetch[modelName] = true

    if (state.status === LoadingStatus.Unloaded) {
      toLoadedData(loadQuery).then(
        es => {
          if (es.status === LoadingStatus.Loaded) {
            dispatch(slice.actions.addSome(es.value))

            if (socketConnection !== 'keys') return
            const subscription = { } as Indexable         
            for (const e of es.value) {
              subscription[e.id] = modelName
            }
            session.subscribe(subscription)
          } else {
            dispatch(slice.actions.set(es))
          }
        }
      )
    }

    return () => {
      if (state.status !== LoadingStatus.Loaded || socketConnection !== 'keys') return
      session.unsubscribe(state.value.map(e => e.id))
    }
  }, [state, socketConnection, didFetch, loadQuery])

  useEffect(() => {
    if (socketConnection === 'none') return 
    if (didFetch[modelName + 'socket']) return
    didFetch[modelName + 'socket'] = true

    session.handle_events({
      [`created-${modelName}`]: addElements,
      [`updated-${modelName}`]: es => {
        const idToUpdates = {} as Indexable<Partial<T>>
        for (const { id, ...e } of es) {
          idToUpdates[id] = e 
        }
        updateElements(idToUpdates)
      },
      [`deleted-${modelName}`]: removeElements,
    })

    if (socketConnection !== 'model') return 
    session.subscribe({ [modelName]: modelName }) // subscribe to model-wide updates

    return () => { 
      session.unsubscribe([modelName])
      didFetch[modelName + 'socket'] = false
      session.removeAllSocketListeners(`created-${modelName}`)
      session.removeAllSocketListeners(`updated-${modelName}`)
      session.removeAllSocketListeners(`deleted-${modelName}`)
    }
  }, [session, socketConnection, didFetch])

  return [state, { addElement, addElements, updateElement, updateElements, findById, removeElement, removeElements }]
}

export interface MappedListUpdateMethods <T>{
  addElementForKey:  (key: string, e: T) => void,
  addElementsForKey: (key: string, e: T[]) => void,
}
export type MappedListStateReturnType <T extends { id: string }> = [
  LoadedData<T[]>,
  MappedListUpdateMethods<T>
]
export const useMappedListStateHook = <T extends { id: string }>(
  modelName: ModelName,
  state:  Indexable<LoadedData<T[]>>, 
  session: EnduserSession | Session,
  key: string, 
  loadQuery: () => Promise<T[]>, 
  slice: Slice<any, MappedListReducers<T>>,
  options?: {
    socketConnection?: 'keys' | 'none',
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: T[]) => void;
    onDelete?: (n: T[]) => void;
  }
): MappedListStateReturnType<T>=> {
  const socketConnection = options?.socketConnection ?? 'keys'
  const dispatch = useTypedDispatch()
  const didFetch = useContext(FetchContext)

  const addElementForKey = useCallback((key: string, e: T) => {
    dispatch(slice.actions.addElementForKey({ key, e } ))
    options?.onAdd?.([e])
  }, [dispatch, slice]) 

  const addElementsForKey = useCallback((key: string, es: T[]) => {
    for (const e of es) addElementForKey(key, e)
    options?.onAdd?.(es) 
  }, [addElementForKey]) 

  useEffect(() => {
    if (!key) return
    if (didFetch[key]) return
    didFetch[key] = true

    toLoadedData(loadQuery).then(
      value => dispatch(slice.actions.setForKey({ key, value }))
    )
  }, [key, didFetch, loadQuery])

  useEffect(() => {
    if (!key) return
    if (socketConnection === 'none') return
    if (didFetch[key + 'socket']) return
    didFetch[key + 'socket'] = true

    session.subscribe({ [key]: modelName }, {
      'created-chats': (cs: T[]) => addElementsForKey(key, cs)
      // todo add updated and delted when supported
    })

    return () => { 
      session.unsubscribe([key]) 
      didFetch[key + 'socket'] = false
    }
  }, [modelName, session, key, socketConnection, addElementsForKey])

  return [state[key] ?? UNLOADED, {
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
  const session = useResolvedSession(type)
  return useListStateHook('chat_rooms', useTypedSelector(s => s.chat_rooms), session, chatRoomsSlice, session.api.chat_rooms.getSome, { socketConnection: 'self' })
}

export const useChats = (roomId: string, type: SessionType) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chats)
  const [_, { updateElement: updateChatRoom }] = useChatRooms(type)  
  const toReturn = useMappedListStateHook('chats', state, session, roomId, () => session.api.chats.getSome({ filter: { roomId } }), chatsSlice, {
    onAdd: ms => {
      const newest = ms[0]
      updateChatRoom(roomId, { recentMessage: newest.message, recentSender: newest.senderId ?? '' })
    }
  }) 

  return toReturn
}