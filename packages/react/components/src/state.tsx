import React, { useCallback, useContext, useEffect, createContext } from 'react'

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
import { 
  LoadFunction,
  Session, 
  EnduserSession,
} from '@tellescope/sdk'

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

export const replace_elements_in_array = <T extends { id: string }>(a: LoadedData<T[]>, updated: { [id: string]: Partial<T> }) => {
  if (a.status !== LoadingStatus.Loaded) return a

  return { status: LoadingStatus.Loaded, value: a.value.map(e => !!updated[e.id] ? updated[e.id] : e)}
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
  replace: (state: LoadedData<T[]>, action: PayloadAction<{ id: string, updated: T}>) => void; 
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
    replace: (state, action) => replace_elements_in_array(state, { [action.payload.id]: action.payload.updated }),
    updateSome: (state, action) => update_elements_in_array(state, action.payload),
    remove: (s, a) => remove_elements_in_array(s, [a.payload.id]),
    removeSome: (s, a) => remove_elements_in_array(s, a.payload.ids),
  }
})

interface MappedListReducers<T extends { id: string }> {
  setForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadAction<{ key: string, value: LoadedData<T[]> }>) => void;
  addElementsForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadAction<{ key: string, elements: T[] }>) => void; 
  [index: string]: any
}
export const createSliceForMappedListState = <T extends { id: string }, N extends string>(name: N) => createSlice<Indexable<LoadedData<T[]>>, MappedListReducers<T>, N>({
  name,
  initialState: {} as Indexable<LoadedData<T[]>>,
  reducers: {
    setForKey: (state, action) => {
      state[action.payload.key] = action.payload.value
    },
    addElementsForKey: (state, action) => {
      if (state[action.payload.key].status !== LoadingStatus.Loaded) {
        state[action.payload.key] = { status: LoadingStatus.Loaded, value: action.payload.elements }
      }

      const toUnshift: T[] = []
      for (const e of action.payload.elements) {
        if ((state[action.payload.key].value as T[]).find(v => v.id === e.id) !== undefined) continue
        toUnshift.push(e)
      }

      (state[action.payload.key].value as T[]).unshift(...toUnshift)
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

export interface ListUpdateMethods <T, ADD> {
  addLocalElement: (e: T) => void,
  addLocalElements: (e: T[]) => void,
  createElement: (e: ADD) => Promise<T>,
  createElements: (e: ADD[]) => Promise<T[]>,
  findById: (id: string) => T | undefined,
  updateElement: (id: string, e: Partial<T>) => Promise<T>,
  updateLocalElement: (id: string, e: Partial<T>) => void,
  updateLocalElements: (updates: { [id: string]: Partial<T> }) => void,
  removeElement: (id: string) => Promise<void>,
  removeLocalElements: (ids: string[]) => void,
}
export type ListStateReturnType <T extends { id: string }, ADD=Partial<T>> = [LoadedData<T[]>, ListUpdateMethods<T, ADD>]
export const useListStateHook = <T extends { id: string }, ADD extends Partial<T>>(
  modelName: ModelName,
  state: LoadedData<T[]>, 
  session: Session | EnduserSession,
  slice: Slice<any, ListReducers<T>>,
  apiCalls: {
    loadQuery: LoadFunction<T>, 
    addOne?: (value: ADD) => Promise<T>,
    addSome?: (values: ADD[]) => Promise<{ created: T[], errors: any[] }>,
    updateOne?: (id: string, updates: Partial<T>) => Promise<T>,
    deleteOne?: (id: string) => Promise<void>,
  },
  options?: {
    socketConnection?: 'model' | 'keys' | 'self' | 'none'
    loadFilter?: Partial<T>,
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: Partial<T>[]) => void;
    onDelete?: (id: string[]) => void;
  }
): ListStateReturnType<T, ADD> => 
{
  const { loadQuery, addOne, addSome, updateOne, deleteOne } = apiCalls

  const socketConnection = options?.socketConnection ?? 'model'
  const loadFilter = options?.loadFilter

  const dispatch = useTypedDispatch()
  const didFetch = useContext(FetchContext)

  const addLocalElement = useCallback((e: T) => {
    dispatch(slice.actions.add(e))
    options?.onAdd?.([e])
    return e
  }, [dispatch, options, slice])
  const addLocalElements = useCallback((es: T[]) => {
    dispatch(slice.actions.addSome(es))
    options?.onAdd?.(es)
    return es
  }, [dispatch, options, slice])
  const createElement = useCallback(async (e: ADD) => {
    if (!addOne) throw new Error(`Add element by API is not supported`)
    return addLocalElement(await addOne(e))
  }, [addLocalElement, addOne])
  const createElements = useCallback(async (es: ADD[]) => {
    if (!addSome) throw new Error(`Add elements by API is not supported`)
    return addLocalElements((await addSome(es)).created)
  }, [addLocalElements, addSome])
 
  const updateLocalElement = useCallback((id: string, updates: Partial<T>) => {
    dispatch(slice.actions.update({ id, updates }))
    options?.onUpdate?.([{ id, ...updates }])
  }, [dispatch, options, slice])
  const updateLocalElements = useCallback((updates: { [id: string] : Partial<T> }) => {
    dispatch(slice.actions.updateSome(updates))

    const updated: Partial<T>[] = []
    for (const id in updates) {
      updated.push({ id, ...updates[id] })
    }
    options?.onUpdate?.(updated)
  }, [dispatch, options, slice])

  const replaceLocalElement = useCallback((id: string, updated: T) => {
    dispatch(slice.actions.replace({ id, updated }))
    options?.onUpdate?.([updated])
    return updated
  }, [dispatch, options, slice])
  const updateElement = useCallback(async (id: string, e: Partial<T>) => {
    if (!updateOne) throw new Error(`Update element by API is not supported`)
    return replaceLocalElement(id, await updateOne(id, e)) // API returns updated model, avoids needing to merge object fields client-side, so just replace
  }, [replaceLocalElement, updateOne])

  const removeLocalElement = useCallback(id => {
    dispatch(slice.actions.remove(id))
    options?.onDelete?.([id])
  }, [dispatch, options, slice])
  const removeLocalElements = useCallback(ids => {
    dispatch(slice.actions.removeSome(ids))
    options?.onDelete?.(ids)
  }, [dispatch, options, slice])
  const removeElement = useCallback(async (id: string) => {
    if (!deleteOne) throw new Error(`Add element by API is not supported`)
    removeLocalElement(await deleteOne(id))
  }, [removeLocalElement, deleteOne])

  const findById = useCallback((id: string) => {
    if (!id) return undefined
    if (state.status !== LoadingStatus.Loaded) return undefined

    return state.value.find(v => v.id === id)
  }, [state])

  useEffect(() => {
    const fetchKey = loadFilter ? JSON.stringify(loadFilter) + modelName : modelName
    if (didFetch[fetchKey]) return
    didFetch[fetchKey] = true

    toLoadedData(() => loadQuery({ filter: loadFilter })).then(
      es => {
        if (es.status === LoadingStatus.Loaded) {
          dispatch(slice.actions.addSome(es.value))

          if (socketConnection !== 'keys') return
          const subscription = { } as Indexable         
          for (const e of es.value) {
            subscription[e.id] = modelName
          }
          session.subscribe(subscription)
        } 
      }
    )

    return () => {
      if (state.status !== LoadingStatus.Loaded || socketConnection !== 'keys') return
      session.unsubscribe(state.value.map(e => e.id))
    }
  }, [state, socketConnection, didFetch, loadFilter, loadQuery])

  useEffect(() => {
    if (socketConnection === 'none') return 
    if (didFetch[modelName + 'socket']) return
    didFetch[modelName + 'socket'] = true

    session.handle_events({
      [`created-${modelName}`]: addLocalElements,
      [`updated-${modelName}`]: es => {
        const idToUpdates = {} as Indexable<Partial<T>>
        for (const { id, ...e } of es) {
          idToUpdates[id] = e 
        }
        updateLocalElements(idToUpdates)
      },
      [`deleted-${modelName}`]: removeLocalElements,
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

  return [state, {
    addLocalElement, addLocalElements,
    createElement, createElements, updateElement, updateLocalElement, updateLocalElements, findById, removeElement, removeLocalElements 
  }]
}

export interface MappedListUpdateMethods <T, ADD>{
  createElement:  (e: ADD) => Promise<T>,
  createElements: (e: ADD[]) => Promise<T[]>,
}
export type MappedListStateReturnType <T extends { id: string }, ADD=Partial<T>> = [
  LoadedData<T[]>,
  MappedListUpdateMethods<T, ADD>
]
export const useMappedListStateHook = <T extends { id: string }, ADD extends Partial<T>>(
  modelName: ModelName,
  filterKey: (keyof T) & string,
  state:  Indexable<LoadedData<T[]>>, 
  session: EnduserSession | Session,
  key: string, 
  slice: Slice<any, MappedListReducers<T>>,
  apiCalls: {
    loadQuery: LoadFunction<T>, 
    addOne?: (value: ADD) => Promise<T>,
    addSome?: (values: ADD[]) => Promise<{ created: T[], errors: any[] }>,
    updateOne?: (id: string, updates: Partial<T>) => Promise<T>,
    deleteOne?: (id: string) => Promise<void>,
  },
  options?: {
    socketConnection?: 'keys' | 'none',
    loadFilter?: Partial<T>,
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: Partial<T>[]) => void;
    onDelete?: (id: string[]) => void;
  }
): MappedListStateReturnType<T, ADD>=> {
  const { loadQuery, addOne, addSome, updateOne, deleteOne } = apiCalls

  const loadFilter = options?.loadFilter
  const socketConnection = options?.socketConnection ?? 'keys'

  const dispatch = useTypedDispatch()
  const didFetch = useContext(FetchContext)

  const addLocalElementForKey = useCallback((key: string, e: T) => {
    dispatch(slice.actions.addElementsForKey({ key, elements: [e] } ))
    options?.onAdd?.([e])
    return e
  }, [dispatch, slice]) 
  const addLocalElementsForKey = useCallback((key: string, es: T[]) => {
    dispatch(slice.actions.addElementsForKey({ key, elements: es } ))
    options?.onAdd?.(es) 
    return es
  }, [dispatch, slice]) 

  const createElement = useCallback(async (e: ADD) => {
    if (!addOne) throw new Error(`Add element by API is not supported`)

    const key = e[filterKey]
    if (typeof key !== 'string') throw new Error(`filterKey must be a string`)

    return addLocalElementForKey(key, await addOne(e))
  }, [filterKey, addLocalElementForKey, addOne])

  const createElements = useCallback(async (es: ADD[]) => {
    if (!addSome) throw new Error(`Add elements by API is not supported`)

    const key = es[0]?.[filterKey]
    if (typeof key !== 'string') throw new Error(`filterKey must be a string`)

    return addLocalElementsForKey(key, (await addSome(es)).created)
  }, [filterKey, addLocalElementsForKey, addSome])

  useEffect(() => {
    if (!key) return

    const fetchKey = loadFilter ? JSON.stringify(loadFilter) + key : key
    if (didFetch[fetchKey]) return
    didFetch[fetchKey] = true

    const filter: Partial<T> = { ...loadFilter, [filterKey]: key } as any // we know [filterKey] is a keyof T
    toLoadedData(() => loadQuery({ filter })).then(
      value => dispatch(slice.actions.setForKey({ key, value }))
    )
  }, [key, loadFilter, dispatch, didFetch, loadQuery])

  useEffect(() => {
    if (!key) return
    if (socketConnection === 'none') return
    if (didFetch[key + 'socket']) return
    didFetch[key + 'socket'] = true

    session.subscribe({ [key]: modelName }, {
      'created-chats': (cs: T[]) => addLocalElementsForKey(key, cs)
    })

    return () => { 
      session.unsubscribe([key]) 
      didFetch[key + 'socket'] = false
    }
  }, [modelName, session, key, didFetch, socketConnection, addLocalElementForKey])

  return [state[key] ?? UNLOADED, {
    createElement,
    createElements,
  }]
}

// const useSocketConnectionForList = <T extends { id: string }>(session: Session | EnduserSession) => {}

const useResolvedSession = (type: SessionType) => {
  const u_session = useSession({ throwIfMissingContext: type === 'user' })
  const e_session = useEnduserSession({ throwIfMissingContext: type === 'enduser' })
  return type === 'user' ? u_session : e_session
}

export type HookOptions<T> = {
  loadFilter?: Partial<T>,
}

export const useChatRooms = (type: SessionType, options={} as HookOptions<ChatRoom>) => {
  const session = useResolvedSession(type)
  return useListStateHook('chat_rooms', useTypedSelector(s => s.chat_rooms), session, chatRoomsSlice,
    { 
      loadQuery: session.api.chat_rooms.getSome,
      addOne: session.api.chat_rooms.createOne,
      addSome: session.api.chat_rooms.createSome,
      deleteOne: session.api.chat_rooms.deleteOne,
      updateOne: session.api.chat_rooms.updateOne,
    },
    { 
      socketConnection: 'self',
      ...options,
    },
  )
}

export const useChats = (roomId: string, type: SessionType, options={} as HookOptions<ChatMessage>) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chats)
  const [_, { updateLocalElement: updateLocalChatRoom }] = useChatRooms(type)  
  const toReturn = useMappedListStateHook(
    'chats', 'roomId', state, session, roomId, 
    chatsSlice,
    { 
      loadQuery: session.api.chats.getSome,
      addOne: session.api.chats.createOne,
      addSome: session.api.chats.createSome,
      deleteOne: session.api.chats.deleteOne,
      updateOne: session.api.chats.updateOne,
    }, 
    {
      ...options,
      onAdd: ms => {
        const newest = ms[0]
        updateLocalChatRoom(roomId, { recentMessage: newest.message, recentSender: newest.senderId ?? '' })
    }
  }) 

  return toReturn
}