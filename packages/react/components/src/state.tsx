import React, { useCallback, useContext, useEffect, createContext } from 'react'

import { TypedUseSelectorHook, createDispatchHook, createSelectorHook, ReactReduxContextValue, useDispatch } from 'react-redux'
import { createSlice, configureStore, PayloadAction, Slice } from '@reduxjs/toolkit'
 
import {
  APIError,
  Indexable,
  LoadingStatus,
  LoadedData,
  UNLOADED,
  SessionType,
  CustomUpdateOptions,
} from "@tellescope/types-utilities"

import {
  ChatRoom,
  ChatMessage,
  EngagementEvent, 
  UserDisplayInfo,
  CalendarEvent,
} from "@tellescope/types-client"
import { isModelName } from "@tellescope/types-models"

import {
  useResolvedSession
} from "./index"
import { 
  LoadFunction,
  Session, 
  EnduserSession,
} from '@tellescope/sdk'

export const TellescopeStoreContext = React.createContext<ReactReduxContextValue<AppDispatch>>(null as any);
export const createTellescopeSelector = () => createSelectorHook(TellescopeStoreContext)

interface FetchContextValue {
  didFetch: (s: string, force?: boolean, refetchInMS?: number) => boolean,
  setFetched: (s: string, b: boolean) => void;
}
const FetchContext = createContext({} as FetchContextValue)
export const WithFetchContext = ( { children } : { children: React.ReactNode }) => {
  const lookupRef = React.useRef({} as Indexable<{ lastFetch: number, status: boolean }>)  

  return (
    <FetchContext.Provider value={{
      didFetch: (s, force, refetchInMS=5000) => {
        const { status, lastFetch } = lookupRef.current[s] ?? {}
        if (lastFetch + refetchInMS >= Date.now()) return true // prevent more frequent reloads
        if (force) return false // trigger fetch when forced

        return status // return true status
      },
      setFetched: (s, b) => {
        lookupRef.current[s] = lookupRef.current[s] ?? {}
        lookupRef.current[s].status = b
        lookupRef.current[s].lastFetch = Date.now()
      },
     }}>
      {children}
    </FetchContext.Provider>
  )
}

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

// default add to start
export const add_elements_to_array = <T extends { id: string }>(a: LoadedData<T[]>, elements: T[], options?: { addTo?: 'start' | 'end' }) => {
  if (a.status !== LoadingStatus.Loaded) return { status: LoadingStatus.Loaded, value: elements }
 
  const newValues = elements.filter(e => a.value.find(v => v.id === e.id) === undefined) 
  return { 
    status: LoadingStatus.Loaded, 
    value: options?.addTo === 'end' ? [...a.value, ...newValues] : [...newValues, ...a.value] 
  }
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

type PayloadActionWithOptions <DATA, OPTIONS={}> = PayloadAction<{ value: DATA, options?: OPTIONS }>

interface ListReducers<T> {
  set: (state: LoadedData<T[]>, action: PayloadActionWithOptions<LoadedData<T[]>>) => void; 
  setFetching: (state: LoadedData<T[]>) => void;
  add: (state: LoadedData<T[]>, action: PayloadActionWithOptions<T, AddOptions>) => void; 
  addSome: (state: LoadedData<T[]>, action: PayloadActionWithOptions<T[], AddOptions>) => void; 
  update: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ id: string, updates: Partial<T>}>) => void; 
  updateSome: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ [id: string]: Partial<T>}>) => void; 
  replace: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ id: string, updated: T}>) => void; 
  remove: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ id: string }>) => void; 
  removeSome: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ ids: string[] }>) => void; 
  [index: string]: any
}

export const createSliceForList = <T extends { id: string }, N extends string>(name: N) => createSlice<LoadedData<T[]>, ListReducers<T>, N>({
  name,
  initialState: UNLOADED as LoadedData<T[]>,
  reducers: {
    set: (_, action) => action.payload.value,
    setFetching: (s) => s.status === LoadingStatus.Unloaded ? { status: LoadingStatus.Fetching, value: undefined } : s,
    add: (state, action) => add_elements_to_array(state, [action.payload.value], action.payload.options),
    addSome: (state, action) => add_elements_to_array(state, action.payload.value, action.payload.options),
    update: (state, action) => update_elements_in_array(state, { 
      [action.payload.value.id]: {
        ...action.payload.value.updates,
        updatedAt: (action.payload as any).updatedAt ?? new Date().toString()
      }
    }),
    replace: (state, action) => replace_elements_in_array(state, { [action.payload.value.id]: action.payload.value.updated }),
    updateSome: (state, action) => update_elements_in_array(state, action.payload.value),
    remove: (s, a) => remove_elements_in_array(s, [a.payload.value.id]),
    removeSome: (s, a) => remove_elements_in_array(s, a.payload.value.ids),
  }
})

interface MappedListReducers<T extends { id: string | number }> {
  setForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadActionWithOptions<{ key: string, data: LoadedData<T[]> }, AddOptions>) => void;
  addElementsForKey: (state: Indexable<LoadedData<T[]>>, action: PayloadActionWithOptions<{ key: string, elements: T[] }, AddOptions>) => void; 
  [index: string]: any
}
export const createSliceForMappedList = <T extends { id: string }, N extends string>(name: N) => createSlice<Indexable<LoadedData<T[]>>, MappedListReducers<T>, N>({
  name,
  initialState: {} as Indexable<LoadedData<T[]>>,
  reducers: {
    setForKey: (state, action) => {
      state[action.payload.value.key] = action.payload.value.data
    },
    addElementsForKey: (state, action) => {
      if (state[action.payload.value.key].status !== LoadingStatus.Loaded) {
        state[action.payload.value.key] = { status: LoadingStatus.Loaded, value: action.payload.value.elements }
      }

      const toAdd: T[] = []
      for (const e of action.payload.value.elements) {
        if ((state[action.payload.value.key].value as T[]).find(v => v.id === e.id) !== undefined) continue
        toAdd.push(e)
      }

      // default to start
      if (action.payload.options?.addTo === 'end') {
        (state[action.payload.value.key].value as T[]).push(...toAdd)
      } else {
        (state[action.payload.value.key].value as T[]).unshift(...toAdd)
      }
    }
  }
})

export type ChatRoomDisplayInfo = { id: string } & { [index: string]: UserDisplayInfo }

const chatRoomsSlice = createSliceForList<ChatRoom, 'chat_rooms'>('chat_rooms')
const calendarEventsSlice = createSliceForList<CalendarEvent, 'calendar_events'>('calendar_events')
const chatsSlice = createSliceForMappedList<ChatMessage, 'chats'>('chats')
const chatRoomDisplayInfoslice = createSliceForMappedList<ChatRoomDisplayInfo, 'chat-room-display-info'>('chat-room-display-info')
const engagementEventsSlice = createSliceForList<EngagementEvent, 'engagement_events'>('engagement_events')

export const sharedConfig = {
  reducer: { 
    chat_rooms: chatRoomsSlice.reducer,
    chats: chatsSlice.reducer,
    chatRoomDisplayInfo: chatRoomDisplayInfoslice.reducer,
    calendar_events: calendarEventsSlice.reducer,
    engagement_events: engagementEventsSlice.reducer,
  },
}

const _store = configureStore(sharedConfig)
type RootState = ReturnType<typeof _store.getState>
type AppDispatch = typeof _store.dispatch

const useTypedSelector = createTellescopeSelector() as any as TypedUseSelectorHook<RootState> 
const useTellescopeDispatch = createDispatchHook(TellescopeStoreContext) 

export type AddOptions = {
  addTo?: 'start' | 'end'
}

export interface ListUpdateMethods <T, ADD> {
  addLocalElement: (e: T, o?: AddOptions) => T,
  addLocalElements: (e: T[], o?: AddOptions) => T[],
  createElement: (e: ADD, o?: AddOptions) => Promise<T>,
  createElements: (e: ADD[], o?: AddOptions) => Promise<T[]>,
  findById: (id: string) => T | undefined,
  updateElement: (id: string, e: Partial<T>, o?: CustomUpdateOptions) => Promise<T>,
  updateLocalElement: (id: string, e: Partial<T>) => void,
  updateLocalElements: (updates: { [id: string]: Partial<T> }) => void,
  removeElement: (id: string) => Promise<void>,
  removeLocalElements: (ids: string[]) => void,
  reload: () => void;
}
export type ListStateReturnType <T extends { id: string | number }, ADD=Partial<T>> = [LoadedData<T[]>, ListUpdateMethods<T, ADD>]
export const useListStateHook = <T extends { id: string | number }, ADD extends Partial<T>> (
  modelName: string,
  state: LoadedData<T[]>, 
  session: Session | EnduserSession,
  slice: Slice<any, ListReducers<T>>,
  apiCalls: {
    loadQuery: LoadFunction<T>, 
    addOne?: (value: ADD) => Promise<T>,
    addSome?: (values: ADD[]) => Promise<{ created: T[], errors: any[] }>,
    updateOne?: (id: string, updates: Partial<T>, o?: CustomUpdateOptions) => Promise<T>,
    deleteOne?: (id: string) => Promise<void>,
  },
  options?: {
    socketConnection?: 'model' | 'keys' | 'self' | 'none'
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: ({ id: string } & Partial<T>)[]) => void;
    onDelete?: (id: string[]) => void;
  } & HookOptions<T>
): ListStateReturnType<T, ADD> => 
{
  const { loadQuery, addOne, addSome, updateOne, deleteOne } = apiCalls
  if (options?.refetchInMS !== undefined && options.refetchInMS < 5000) {
    throw new Error("refetchInMS must be greater than 5000")
  }

  const socketConnection = options?.socketConnection ?? 'model'
  const loadFilter = options?.loadFilter

  const dispatch = useTellescopeDispatch()
  const { didFetch, setFetched } = useContext(FetchContext)

  const addLocalElement = useCallback((e: T, o?: AddOptions) => {
    dispatch(slice.actions.add({ value: e, options: o }))
    options?.onAdd?.([e])
    return e
  }, [dispatch, options, slice])
  const addLocalElements = useCallback((es: T[], o?: AddOptions) => {
    dispatch(slice.actions.addSome({ value: es, options: o }))
    options?.onAdd?.(es)
    return es
  }, [dispatch, options, slice])
  const createElement = useCallback(async (e: ADD, options?: AddOptions) => {
    if (!addOne) throw new Error(`Add element by API is not supported`)
    return addLocalElement(await addOne(e), options)
  }, [addLocalElement, addOne])
  const createElements = useCallback(async (es: ADD[], options?: AddOptions) => {
    if (!addSome) throw new Error(`Add elements by API is not supported`)
    return addLocalElements((await addSome(es)).created, options)
  }, [addLocalElements, addSome])
 
  const updateLocalElement = useCallback((id: string, updates: Partial<T>) => {
    dispatch(slice.actions.update({ value: { id, updates } }))
    options?.onUpdate?.([{ id, ...updates }])
  }, [dispatch, options, slice])
  const updateLocalElements = useCallback((updates: { [id: string] : Partial<T> }) => {
    dispatch(slice.actions.updateSome({ value: updates }))

    const updated: ({ id: string } & Partial<T>)[] = []
    for (const id in updates) {
      updated.push({ id, ...updates[id] })
    }
    options?.onUpdate?.(updated)
  }, [dispatch, options, slice])

  const replaceLocalElement = useCallback((id: string, updated: T) => {
    dispatch(slice.actions.replace({ value: { id, updated } }))
    options?.onUpdate?.([{ ...updated, id }])
    return updated
  }, [dispatch, options, slice])
  const updateElement = useCallback(async (id: string, e: Partial<T>, o?: CustomUpdateOptions) => {
    if (!updateOne) throw new Error(`Update element by API is not supported`)
    return replaceLocalElement(id, await updateOne(id, e, o)) // API returns updated model, avoids needing to merge object fields client-side, so just replace
  }, [replaceLocalElement, updateOne])

  const removeLocalElement = useCallback(id => {
    dispatch(slice.actions.remove({ value: { id } }))
    options?.onDelete?.([id])
  }, [dispatch, options, slice])
  const removeLocalElements = useCallback(ids => {
    dispatch(slice.actions.removeSome({ value: { ids } }))
    options?.onDelete?.(ids)
  }, [dispatch, options, slice])
  const removeElement = useCallback(async (id: string) => {
    if (!deleteOne) throw new Error(`Add element by API is not supported`)
    await deleteOne(id)
    removeLocalElement(id)
  }, [removeLocalElement, deleteOne])

  const findById = useCallback((id: string) => {
    if (!id) return undefined
    if (state.status !== LoadingStatus.Loaded) return undefined

    return state.value.find(v => v.id === id)
  }, [state])

  const load = useCallback((force: boolean) => {
    if (options?.dontFetch) return
    const fetchKey = loadFilter ? JSON.stringify(loadFilter) + modelName : modelName
    if (didFetch(fetchKey, force, options?.refetchInMS)) return
    setFetched(fetchKey, true)

    toLoadedData(() => loadQuery({ filter: loadFilter })).then(
      es => {
        if (es.status === LoadingStatus.Loaded) {
          dispatch(slice.actions.addSome({ value: es.value }))

          if (!isModelName(modelName)) return // a custom extension without our socket support

          if (socketConnection !== 'keys') return
          const subscription = { } as Indexable         
          for (const e of es.value) {
            subscription[e.id] = modelName
          }
          session.subscribe(subscription)
        } else {
          dispatch(slice.actions.set({ value: es }))
        }
      }
    )

    // unsubscribing from sockets doesn't matter too much, 
    // and having load / reload depend on state can cause unexpected re-renders for client 
    
    // return () => {
    //   if (state.status !== LoadingStatus.Loaded || socketConnection !== 'keys') return
    //   if (!isModelName(modelName)) return // a custom extension without our socket support

    //   session.unsubscribe(state.value.map(e => e.id.toString()))
    // }
  }, [socketConnection, didFetch, modelName, isModelName, loadFilter, loadQuery, options?.dontFetch])

  const reload = useCallback(() => load(true), [load])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (!isModelName(modelName)) return // a custom extension without our socket support
    if (socketConnection === 'none') return 
    if (didFetch(modelName + 'socket')) return
    setFetched(modelName + 'socket', true)

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
      setFetched(modelName + 'socket', false)
      session.removeAllSocketListeners(`created-${modelName}`)
      session.removeAllSocketListeners(`updated-${modelName}`)
      session.removeAllSocketListeners(`deleted-${modelName}`)
    }
  }, [session, socketConnection, didFetch, isModelName])

  return [state, {
    addLocalElement, addLocalElements,
    createElement, createElements, updateElement, updateLocalElement, updateLocalElements, findById, removeElement, removeLocalElements,
    reload,
  }]
}

export interface MappedListUpdateMethods <T, ADD>{
  setLocalElementForKey: (key: string, e: LoadedData<T[]>) => void;
  addLocalElement: (e: T, o?: AddOptions) => void,
  addLocalElements: (e: T[], o?: AddOptions) => void,
  createElement:  (e: ADD, o?: AddOptions) => Promise<T>,
  createElements: (e: ADD[], o?: AddOptions) => Promise<T[]>,
  reload: () => void;
}
export type MappedListStateReturnType <T extends { id: string | number }, ADD=Partial<T>> = [
  LoadedData<T[]>,
  MappedListUpdateMethods<T, ADD>
]
export const useMappedListStateHook = <T extends { id: string | number }, ADD extends Partial<T>>(
  modelName: string,
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
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: Partial<T>[]) => void;
    onDelete?: (id: string[]) => void;
  } & HookOptions<T>
): MappedListStateReturnType<T, ADD>=> {
  const { loadQuery, addOne, addSome, updateOne, deleteOne } = apiCalls
  if (options?.refetchInMS !== undefined && options.refetchInMS < 5000) {
    throw new Error("refetchInMS must be greater than 5000")
  }

  const loadFilter = options?.loadFilter
  const socketConnection = options?.socketConnection ?? 'keys'

  const dispatch = useTellescopeDispatch()
  const { didFetch, setFetched } = useContext(FetchContext)

  const setLocalElementForKey = useCallback<MappedListUpdateMethods<T,ADD>['setLocalElementForKey']>((key, e)=> {
    dispatch(slice.actions.setForKey({ value: { key, data: e } }))
  }, [dispatch, slice])
  const addLocalElementForKey = useCallback((key: string, e: T, o?: AddOptions) => {
    dispatch(slice.actions.addElementsForKey({ value: { key, elements: [e] }, options: o }))
    options?.onAdd?.([e])
    return e
  }, [dispatch, slice, options]) 
  const addLocalElementsForKey = useCallback((key: string, es: T[], o?: AddOptions) => {
    dispatch(slice.actions.addElementsForKey({ value: { key, elements: es }, options: o }))
    options?.onAdd?.(es) 
    return es
  }, [dispatch, slice, options]) 
  const addLocalElement = useCallback((e: T, options?: AddOptions) => {
    const key = e[filterKey]
    if (typeof key !== 'string') throw new Error(`value for filterKey ${filterKey} must be a string`)

    addLocalElementForKey(key, e, options)
  }, [filterKey, addLocalElementForKey])
  const addLocalElements = useCallback((es: T[], options?: AddOptions) => {
    const key = es[0]?.[filterKey]
    if (typeof key !== 'string') throw new Error(`value for filterKey ${filterKey} must be a string`)

    addLocalElementsForKey(key, es, options)

  }, [filterKey, addLocalElementsForKey])

  const createElement = useCallback(async (e: ADD, options?: AddOptions) => {
    if (!addOne) throw new Error(`Add element by API is not supported`)

    const key = e[filterKey]
    if (typeof key !== 'string') throw new Error(`value for filterKey ${filterKey} must be a string`)

    return addLocalElementForKey(key, await addOne(e), options)
  }, [filterKey, addLocalElementForKey, addOne])

  const createElements = useCallback(async (es: ADD[], options?: AddOptions) => {
    if (!addSome) throw new Error(`Add elements by API is not supported`)

    const key = es[0]?.[filterKey]
    if (typeof key !== 'string') throw new Error(`value for filterKey ${filterKey} must be a string`)

    return addLocalElementsForKey(key, (await addSome(es)).created, options)
  }, [filterKey, addLocalElementsForKey, addSome])

  const load = useCallback(async (force: boolean) => {
    if (options?.dontFetch) return
    if (!key) return

    // same key might be used across different models!
    const fetchKey = loadFilter ? JSON.stringify(loadFilter) + key + modelName : key + modelName 
    if (didFetch(fetchKey, force, options?.refetchInMS)) return
    setFetched(fetchKey, true)

    const filter: Partial<T> = { ...loadFilter, [filterKey]: key } as any // we know [filterKey] is a keyof T
    const data = await toLoadedData(() => loadQuery({ filter }))
    dispatch(slice.actions.setForKey({ value: { key, data } }))
  }, [key, loadFilter, dispatch, didFetch, loadQuery, options?.dontFetch])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (!isModelName(modelName)) return // a custom extension without our socket support
    if (!key) return
    if (socketConnection === 'none') return
    if (didFetch(key + 'socket')) return
    setFetched(key + 'socket', true)

    // TODO: Add update and delete subscriptions
    session.subscribe({ [key]: modelName }, {
      [`created-${modelName}`]: (cs: T[]) => addLocalElementsForKey(key, cs, {})
    })

    return () => { 
      session.unsubscribe([key]) 
      setFetched(key + 'socket', false)
    }
  }, [modelName, isModelName, session, key, didFetch, socketConnection, addLocalElementForKey])

  const reload = useCallback(() => load(true), [load])

  return [state[key] ?? UNLOADED, {
    setLocalElementForKey,
    addLocalElement,
    addLocalElements,
    createElement,
    createElements,
    reload,
  }]
}

export interface MappedStateUpdateMethods <T, ADD>{
  setLocalElementForKey: (key: string, e: LoadedData<T[]>) => void,
  addLocalElement: (e: T, o?: AddOptions) => void,
  createElement:  (e: ADD, o?: AddOptions) => Promise<T>,
  reload: () => void;
}
export type MappedStateReturnType <T extends { id: string | number }, ADD=Partial<T>> = [
  LoadedData<T>,
  MappedStateUpdateMethods<T, ADD>
]
export const useMappedStateHook = <T extends { id: string | number }, ADD extends Partial<T>>(
  modelName: string,
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
): MappedStateReturnType<T, ADD>=> {
  // rely on mappedList state, using singleton lists, to avoid code duplication (minor(?) perf hit)
  const [data, { setLocalElementForKey, addLocalElement, createElement, reload }] = useMappedListStateHook<T, ADD>(modelName, filterKey, state, session, key, slice, apiCalls, options)

  // convert back from singleton list to individual element
  const parsedData = { status: data.status } as LoadedData<T>
  if (data.status === LoadingStatus.Loaded) {
    parsedData.value = data.value[0] // singleton list
  } else {
    parsedData.value = data.value // not a list anyway
  }

  return [
    parsedData,
    {
      setLocalElementForKey,
      addLocalElement,
      createElement,
      reload,
    }
  ]
}

// const useSocketConnectionForList = <T extends { id: string }>(session: Session | EnduserSession) => {}

export type HookOptions<T> = {
  loadFilter?: Partial<T>,
  refetchInMS?: number,
  dontFetch?: boolean,
  addTo?: AddOptions['addTo'],
}

export const useChatRoomDisplayInfo = (roomId: string, type: SessionType, options={} as HookOptions<ChatRoomDisplayInfo>) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chatRoomDisplayInfo)
  const toReturn = useMappedStateHook(
    'chat-room-display-info', 'id', state, session, roomId, 
    chatRoomDisplayInfoslice,
    { 
      loadQuery: async () => {
        const { id, display_info } = await session.api.chat_rooms.display_info({ id: roomId })
        return [{ id, ...display_info }] as ChatRoomDisplayInfo[]
      }
    },
    { ...options }
  ) 

  return toReturn
}

export const useCalendarEvents = (type: SessionType, options={} as HookOptions<CalendarEvent>) => {
  const session = useResolvedSession(type)

  return useListStateHook('calendar_events', useTypedSelector(s => s.calendar_events), session, calendarEventsSlice,
    { 
      loadQuery: session.api.calendar_events.getSome,
      addOne: session.api.calendar_events.createOne,
      addSome: session.api.calendar_events.createSome,
      deleteOne: session.api.calendar_events.deleteOne,
      updateOne: session.api.calendar_events.updateOne,
    },
    { 
      socketConnection: 'self',
      ...options,
    },
  )
}

export const useEngagementEvents = (type: SessionType, options={} as HookOptions<EngagementEvent>) => {
  const session = useResolvedSession(type)

  return useListStateHook('engagement_events', useTypedSelector(s => s.engagement_events), session, engagementEventsSlice,
    { 
      loadQuery: session.api.engagement_events.getSome,
      addOne: session.api.engagement_events.createOne,
      addSome: session.api.engagement_events.createSome,
      deleteOne: session.api.engagement_events.deleteOne,
      updateOne: session.api.engagement_events.updateOne,
    },
    { 
      ...options,
    },
  )
}

export const useChatRooms = (type: SessionType, options={} as HookOptions<ChatRoom>) => {
  const session = useResolvedSession(type)
  const dispatch = useTellescopeDispatch()

  const onUpdate = useCallback((updated: ({ id: string } & Partial<ChatRoom>)[]) => {
    for (const u of updated) {
      // fetch updated display info if enduserIds or userIds have changed
      if (u.enduserIds || u.userIds) {
        session.api.chat_rooms.display_info({ id: u.id })
        .then(({ id, display_info }) => {
          dispatch(chatRoomDisplayInfoslice.actions.setForKey({ value: { 
            key: u.id, 
            data: { status: LoadingStatus.Loaded, value: [{ id, ...display_info }] as ChatRoomDisplayInfo[] } 
          }}))
        })
        .catch(e => console.error('Error fetching chatRoomDisplayInfo in useChatRooms onUpdate', e))
      }
    }
  }, [session, dispatch])

  return useListStateHook('chat_rooms', useTypedSelector(s => s.chat_rooms), session, chatRoomsSlice,
    { 
      loadQuery: session.api.chat_rooms.getSome,
      addOne: session.api.chat_rooms.createOne,
      addSome: session.api.chat_rooms.createSome,
      deleteOne: session.api.chat_rooms.deleteOne,
      updateOne: session.api.chat_rooms.updateOne,
    },
    { 
      onUpdate, 
      socketConnection: 'self',
      ...options,
    },
  )
}

export const useChats = (roomId: string, type: SessionType, options={} as HookOptions<ChatMessage>) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chats)
  const [_, { updateLocalElement: updateLocalChatRoom }] = useChatRooms(type)  

  // don't rely on socket update for new messages
  const onAdd = useCallback((ms: ChatMessage[]) => {
    const newest = ms[0]
    updateLocalChatRoom(roomId, { recentMessage: newest.message, recentSender: newest.senderId ?? '' })
  }, [updateLocalChatRoom])

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
      onAdd,
    }
  ) 

  return toReturn
}