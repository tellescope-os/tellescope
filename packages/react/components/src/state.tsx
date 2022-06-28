import React, { useCallback, useContext, useEffect, createContext } from 'react'

import { TypedUseSelectorHook, createDispatchHook, createSelectorHook, ReactReduxContextValue } from 'react-redux'
import { createSlice, configureStore, PayloadAction, Slice, createAction } from '@reduxjs/toolkit'
 
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
  Email,
  SMSMessage,
  UserNotification,
} from "@tellescope/types-client"

import {
  useResolvedSession, 
  useSession,
} from "./index"
import { 
  LoadFunction,
  Session, 
  EnduserSession,
} from '@tellescope/sdk'
import { value_is_loaded } from './loading'

const RESET_CACHE_TYPE = "cache/reset" as const
export const resetStateAction = createAction(RESET_CACHE_TYPE)

export const TellescopeStoreContext = React.createContext<ReactReduxContextValue<AppDispatch>>(null as any);
export const createTellescopeSelector = () => createSelectorHook(TellescopeStoreContext)

type WithId = { id: string | number }

interface FetchContextValue {
  didFetch: (s: string, force?: boolean, refetchInMS?: number) => boolean,
  setFetched: (s: string, b: boolean, timestamp?: boolean) => void;
  reset: () => void;
}
const FetchContext = createContext({} as FetchContextValue)
export const WithFetchContext = ( { children } : { children: React.ReactNode }) => {
  const lookupRef = React.useRef({} as Indexable<{ lastFetch: number, status: boolean }>)  
  const reset = () => lookupRef.current = {}

  return (
    <FetchContext.Provider value={{
      didFetch: (s, force, refetchInMS=5000) => {
        const { status, lastFetch } = lookupRef.current[s] ?? {}
        if (lastFetch + refetchInMS >= Date.now()) return true // prevent more frequent reloads
        if (force) return false // trigger fetch when forced

        return status // return true status
      },
      setFetched: (s, b, timestamp=true) => {
        lookupRef.current[s] = lookupRef.current[s] ?? {}
        lookupRef.current[s].status = b
        lookupRef.current[s].lastFetch = timestamp ? Date.now() : 0
      },
      reset,
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
export const add_elements_to_array = <T extends WithId>(a: LoadedData<T[]>, elements: T[], options?: AddOptions) => {
  if (a.status !== LoadingStatus.Loaded) return { status: LoadingStatus.Loaded, value: elements }

  // original / default behavior
  if (!options?.replaceIfMatch) {
    const newValues = elements.filter(e => a.value.find(v => v.id === e.id) === undefined) 
    return { 
      status: LoadingStatus.Loaded, 
      value: options?.addTo === 'end' ? [...a.value, ...newValues] : [...newValues, ...a.value] 
    }
  }

  const newValues = elements.filter(e => a.value.find(v => v.id === e.id) === undefined) 
  const existingOrUpdatedValues = a.value.map(a => 
    elements.find(e => e.id === a.id) ?? a // return a match, deferring to the new element, or keep existing when no match
  )
  return { 
    status: LoadingStatus.Loaded, 
    value: options?.addTo === 'end' ? [...existingOrUpdatedValues, ...newValues] : [...newValues, ...existingOrUpdatedValues] 
  }
}

export const update_elements_in_array = <T extends WithId>(a: LoadedData<T[]>, updates: { [id: string]: Partial<T> }) => {
  if (a.status !== LoadingStatus.Loaded) return a

  return { status: LoadingStatus.Loaded, value: a.value.map(e => !!updates[e.id] ? { ...e, ...updates[e.id] } : e)}
}

export const replace_elements_in_array = <T extends WithId>(a: LoadedData<T[]>, updated: { [id: string]: Partial<T> }) => {
  if (a.status !== LoadingStatus.Loaded) return a

  return { status: LoadingStatus.Loaded, value: a.value.map(e => !!updated[e.id] ? updated[e.id] : e)}
}

export const remove_elements_in_array = <T extends WithId>(a: LoadedData<T[]>, ids: (string | number)[]) => {
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
  modifyElements: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ filter: (e: T) => boolean, modifier: (e: T) => T }>) => void;
  replace: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ id: string, updated: T}>) => void; 
  remove: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ id: string }>) => void; 
  removeSome: (state: LoadedData<T[]>, action: PayloadActionWithOptions<{ ids: string[] }>) => void; 
  [index: string]: any
}

export const createSliceForList = <T extends { id: string | number }, N extends string>(name: N) => createSlice<LoadedData<T[]>, ListReducers<T>, N>({
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
    modifyElements: (state, action) => {
      if (state.status !== LoadingStatus.Loaded) return state

      for (let i = 0; i < state.value.length; i++) {
        const element = state.value[i]
        if (action.payload.value.filter(element)) {
          state.value[i] = action.payload.value.modifier(element)
        }
      }

      return state
    },
    remove: (s, a) => remove_elements_in_array(s, [a.payload.value.id]),
    removeSome: (s, a) => remove_elements_in_array(s, a.payload.value.ids),
  },
  extraReducers: (builder) => {
    builder.addCase(resetStateAction, () => {
      return UNLOADED as LoadedData<T[]> 
    })
  },
})

export type ChatRoomDisplayInfo = { id: string } & { [index: string]: UserDisplayInfo }

const chatRoomsSlice = createSliceForList<ChatRoom, 'chat_rooms'>('chat_rooms')
const calendarEventsSlice = createSliceForList<CalendarEvent, 'calendar_events'>('calendar_events')
const chatsSlice = createSliceForList<ChatMessage, 'chats'>('chats')
const chatRoomDisplayInfoslice = createSliceForList<ChatRoomDisplayInfo, 'chat-room-display-info'>('chat-room-display-info')
const engagementEventsSlice = createSliceForList<EngagementEvent, 'engagement_events'>('engagement_events')
const emailsSlice = createSliceForList<Email, 'email'>('email')
const smsMessagesSlice = createSliceForList<SMSMessage, 'sms_messages'>('sms_messages')
const userNotifcationsSlice = createSliceForList<UserNotification, 'user_notifications'>('user_notifications')

export const sharedConfig = {
  reducer: { 
    chat_rooms: chatRoomsSlice.reducer,
    chats: chatsSlice.reducer,
    chatRoomDisplayInfo: chatRoomDisplayInfoslice.reducer,
    calendar_events: calendarEventsSlice.reducer,
    engagement_events: engagementEventsSlice.reducer,
    emails: emailsSlice.reducer,
    sms_messages: smsMessagesSlice.reducer,
    user_notifications: userNotifcationsSlice.reducer,
  },
}

const _store = configureStore(sharedConfig)
type RootState = ReturnType<typeof _store.getState>
type AppDispatch = typeof _store.dispatch

export const useResetState = () => {
  const dispatch = useTellescopeDispatch()
  const { reset: resetContext } = React.useContext(FetchContext) 

  
  return () => {
    resetContext() // resets fetch cache context
    dispatch({ type: RESET_CACHE_TYPE }) // resets Redux state
  }
  // _store.dispatch({ type: RESET_CACHE_TYPE })
}

const useTypedSelector = createTellescopeSelector() as any as TypedUseSelectorHook<RootState> 
const useTellescopeDispatch = createDispatchHook(TellescopeStoreContext) 

export type AddOptions = {
  addTo?: 'start' | 'end',
  replaceIfMatch?: boolean,
}

interface LoadMoreOptions {
  key?: string,
  limit?: number,
}

export interface LoadMoreFunctions {
  loadMore: (options?: LoadMoreOptions) => Promise<void>;
  doneLoading: (id?: string) => boolean,
}

const DEFAULT_FETCH_LIMIT = 250
const DONE_LOADING_TOKEN = 'doneLoading'

export interface ListUpdateMethods <T, ADD> extends LoadMoreFunctions {
  addLocalElement: (e: T, o?: AddOptions) => T,
  addLocalElements: (e: T[], o?: AddOptions) => T[],
  replaceLocalElement: (id: string, e: T) => T,
  createElement: (e: ADD, o?: AddOptions) => Promise<T>,
  createElements: (e: ADD[], o?: AddOptions) => Promise<T[]>,
  findById: (id: string | number) => T | undefined | null,
  searchLocalElements: (query: string) => T[],
  updateElement: (id: string, e: Partial<T>, o?: CustomUpdateOptions) => Promise<T>,
  updateLocalElement: (id: string, e: Partial<T>) => void,
  updateLocalElements: (updates: { [id: string]: Partial<T> }) => void,
  modifyLocalElements: (filter: (e: T) => boolean, modifier: (e: T) => T) => void,
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
    loadQuery?: LoadFunction<T>, 
    findOne?: (idOrFilter: string | Partial<T>) => Promise<T>,
    addOne?: (value: ADD) => Promise<T>,
    addSome?: (values: ADD[]) => Promise<{ created: T[], errors: any[] }>,
    updateOne?: (id: string, updates: Partial<T>, o?: CustomUpdateOptions) => Promise<T>,
    deleteOne?: (id: string) => Promise<void>,
  },
  options?: {
    onAdd?: (n: T[]) => void;
    onUpdate?: (n: ({ id: string } & Partial<T>)[]) => void;
    onDelete?: (id: string[]) => void;
  } & HookOptions<T>
): ListStateReturnType<T, ADD> => 
{
  const { loadQuery, findOne, addOne, addSome, updateOne, deleteOne } = apiCalls
  if (options?.refetchInMS !== undefined && options.refetchInMS < 5000) {
    throw new Error("refetchInMS must be greater than 5000")
  }

  const loadFilter = options?.loadFilter
  const returnFilter = options?.returnFilter

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

  const modifyLocalElements: ListUpdateMethods<T, ADD>['modifyLocalElements'] = useCallback((filter, modifier) => {
    dispatch(slice.actions.modifyElements({ value: { filter, modifier } }))
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

  const findById = useCallback((id: string | number) => {
    if (!id) return undefined

    if (didFetch('recordNotFound' + id)) { // return null if record not found for id
      return null
    }

    const value = (state.status === LoadingStatus.Loaded)
                ? state.value.find(v => v.id.toString() === id.toString())
                : undefined

    if (value === undefined && !didFetch('findById' + id)) {
      setFetched('findById' + id, true) // prevent multiple API calls

      findOne?.(id.toString())
      .then(addLocalElement)
      .catch(e => {
        setFetched('recordNotFound' + id, true) // mark record not found for id
        console.error(e) 
      })
    }

    return value
  }, [addLocalElement, state, setFetched, didFetch])

  // make consistent with search function in Webapp search.tsx
  const searchLocalElements: ListUpdateMethods<T, ADD>['searchLocalElements'] = useCallback(query => {
    const matches: T[] = []
    if (state.status !== LoadingStatus.Loaded) return matches

    const queryLC = query.toLowerCase()
    for (const element of state.value) {
      // todo: recursive search matches on array / object fields
      for (const field in element) {
        if (['createdAt', 'updatedAt', 'businessId', 'creator'].includes(field)) continue

        const value = element[field]

        if (field === 'id'){
          if ((value as any as string | number).toString().toLowerCase() === queryLC) {
            matches.push(element)
          } 
        } else if (typeof value === 'string' && value.toLowerCase().includes(queryLC)) {
          matches.push(element);
          break;
        }
      }
    }

    return matches
  }, [state])

  const load = useCallback((force: boolean) => {
    if (!loadQuery) return
    if (options?.dontFetch) return
    const fetchKey = loadFilter ? JSON.stringify(loadFilter) + modelName : modelName
    if (didFetch(fetchKey, force, options?.refetchInMS)) return
    setFetched(fetchKey, true)

    toLoadedData(() => loadQuery({ filter: loadFilter, limit: DEFAULT_FETCH_LIMIT })).then(
      es => {
        if (es.status === LoadingStatus.Loaded) {
          if (es.value.length < DEFAULT_FETCH_LIMIT) {
            setFetched('id' + modelName + DONE_LOADING_TOKEN, true) 
          }
          dispatch(slice.actions.addSome({ value: es.value, options: { replaceIfMatch: true } }))
        } else {
          dispatch(slice.actions.set({ value: es }))
        }
      }
    )
  }, [setFetched, didFetch, modelName, loadFilter, loadQuery, options?.dontFetch])

  const reload = useCallback(() => load(true), [load])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (options?.dontFetch) return
    if (didFetch(modelName + 'socket')) return
    setFetched(modelName + 'socket', true, false)

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

    // unneeded
    return () => { 
      // setFetched(modelName + 'socket', false, false)
      // session.removeAllSocketListeners(`created-${modelName}`)
      // session.removeAllSocketListeners(`updated-${modelName}`)
      // session.removeAllSocketListeners(`deleted-${modelName}`)
    }
  }, [session, didFetch, options])

  const loadMore = useCallback(async (options?: LoadMoreOptions) => {
    if (!loadQuery) return
    if (!value_is_loaded(state)) {
      console.warn("loadMore called before state is loaded. This is a no op")
      return
    }

    // todo: support for updatedAt as well, and more?
    const key = options?.key ?? 'id' 
    if (key !== 'id') console.warn("Unrecognized key provided")

    let oldestRecord = state.value[0]
    for (const record of state.value) {
      if (new Date((record as any).createdAt ?? 0).getTime() < new Date((oldestRecord as any).createdAt).getTime()) {
        oldestRecord = record
      }
    }

    const limit = options?.limit ?? DEFAULT_FETCH_LIMIT
    return toLoadedData(() => loadQuery({ lastId: oldestRecord.id.toString(), limit })).then(
      es => {
        if (es.status === LoadingStatus.Loaded) {
          if (es.value.length < limit) {
            setFetched(key + modelName + DONE_LOADING_TOKEN, true) 
          }

          dispatch(slice.actions.addSome({ value: es.value, options: { replaceIfMatch: true, addTo: 'end' } }))
        } 
      }
    )
  }, [state, modelName, loadQuery])
  const doneLoading = useCallback((key="id") => (
    didFetch(key + modelName + DONE_LOADING_TOKEN)
  ), [state])

  return [
    returnFilter && state.status === LoadingStatus.Loaded 
      ? { ...state, value: state.value.filter(returnFilter) } 
      : state, 
    {
      addLocalElement, addLocalElements, replaceLocalElement, modifyLocalElements, searchLocalElements,
      createElement, createElements, updateElement, updateLocalElement, updateLocalElements, findById, removeElement, removeLocalElements,
      reload, loadMore, doneLoading,
    }
  ]
}

export type HookOptions<T> = {
  loadFilter?: Partial<T>,
  returnFilter?: (t: T) => boolean,
  refetchInMS?: number,
  dontFetch?: boolean,
  addTo?: AddOptions['addTo'],
}

export const useChatRoomDisplayInfo = (roomId: string, type: SessionType, options={} as HookOptions<ChatRoomDisplayInfo>) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chatRoomDisplayInfo)
  const [lookup] = useListStateHook(
    'chat-room-display-info', state, session, chatRoomDisplayInfoslice,
    { 
      loadQuery: async () => {
        const { id, display_info } = await session.api.chat_rooms.display_info({ id: roomId })
        return [{ id, ...display_info }] as ChatRoomDisplayInfo[]
      }
    },
    { ...options }
  ) 

  return (
    value_is_loaded(lookup) 
      ? [{ status: LoadingStatus.Loaded, value: lookup.value.find(v => v.id === roomId) ?? {} }] 
      : [{ status: lookup.status, value: {} }]
  ) as [LoadedData<{ [index: string]: UserDisplayInfo }>]
}

export const useCalendarEvents = (type: SessionType, options={} as HookOptions<CalendarEvent>) => {
  const session = useResolvedSession(type)

  return useListStateHook('calendar_events', useTypedSelector(s => s.calendar_events), session, calendarEventsSlice,
    { 
      loadQuery: session.api.calendar_events.getSome,
      findOne: session.api.calendar_events.getOne,
      addOne: session.api.calendar_events.createOne,
      addSome: session.api.calendar_events.createSome,
      deleteOne: session.api.calendar_events.deleteOne,
      updateOne: session.api.calendar_events.updateOne,
    },
    { 
      ...options,
    },
  )
}

export const useEngagementEvents = (type: SessionType, options={} as HookOptions<EngagementEvent>) => {
  const session = useResolvedSession(type)

  return useListStateHook('engagement_events', useTypedSelector(s => s.engagement_events), session, engagementEventsSlice,
    { 
      loadQuery: session.api.engagement_events.getSome,
      findOne: session.api.engagement_events.getOne,
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

export const useEmails = (options={} as HookOptions<Email>) => {
  const session = useSession() // endusers cannot send emails for now

  return useListStateHook('emails', useTypedSelector(s => s.emails), session, emailsSlice,
    { 
      loadQuery: session.api.emails.getSome,
      findOne: session.api.emails.getOne,
      addOne: session.api.emails.createOne,
      addSome: session.api.emails.createSome,
      deleteOne: session.api.emails.deleteOne,
      updateOne: session.api.emails.updateOne,
    },
    { 
      ...options,
    },
  )
}
export const useSmsMessages = (options={} as HookOptions<SMSMessage>) => {
  const session = useSession() // endusers cannot send sms messages for now

  return useListStateHook('sms_messages', useTypedSelector(s => s.sms_messages), session, smsMessagesSlice,
    { 
      loadQuery: session.api.sms_messages.getSome,
      findOne: session.api.sms_messages.getOne,
      addOne: session.api.sms_messages.createOne,
      addSome: session.api.sms_messages.createSome,
      deleteOne: session.api.sms_messages.deleteOne,
      updateOne: session.api.sms_messages.updateOne,
    },
    { 
      ...options,
    },
  )
}
export const useNotifications = (options={} as HookOptions<UserNotification>) => {
  const session = useSession() // endusers do not have notifications

  return useListStateHook('user_notifications', useTypedSelector(s => s.user_notifications), session, userNotifcationsSlice,
    { 
      loadQuery: session.api.user_notifications.getSome,
      findOne: session.api.user_notifications.getOne,
      addOne: session.api.user_notifications.createOne,
      addSome: session.api.user_notifications.createSome,
      deleteOne: session.api.user_notifications.deleteOne,
      updateOne: session.api.user_notifications.updateOne,
    },
    { 
      ...options,
    },
  )
}

export const useChatRooms = (type?: SessionType, options={} as HookOptions<ChatRoom>) => {
  const session = useResolvedSession(type)
  const dispatch = useTellescopeDispatch()
  const rooms = useTypedSelector(s => s.chat_rooms)

  const onUpdate = useCallback((updated: ({ id: string | number } & Partial<ChatRoom>)[]) => {
    for (const u of updated) {
      // fetch updated display info if enduserIds or userIds have changed
      if (!(value_is_loaded(rooms) && rooms.value.find(v => v.id === u.id && v.updatedAt === u.updatedAt))) {
        session.api.chat_rooms.display_info({ id: u.id })
        .then(({ id, display_info }) => {
          dispatch(chatRoomDisplayInfoslice.actions.update({ value: { id, updates: display_info }}))
        })
        .catch(e => console.error('Error fetching chatRoomDisplayInfo in useChatRooms onUpdate', e))
      }
    }
  }, [session, dispatch])

  return useListStateHook('chat_rooms', rooms, session, chatRoomsSlice,
    { 
      loadQuery: session.api.chat_rooms.getSome,
      findOne: session.api.chat_rooms.getOne,
      addOne: session.api.chat_rooms.createOne,
      addSome: session.api.chat_rooms.createSome,
      deleteOne: session.api.chat_rooms.deleteOne,
      updateOne: session.api.chat_rooms.updateOne,
    },
    { 
      onUpdate, 
      ...options,
    },
  )
}

export const useChats = (roomId?: string, type?: SessionType, options={} as HookOptions<ChatMessage>) => {
  const session = useResolvedSession(type)
  const state = useTypedSelector(s => s.chats)
  const [_, { updateLocalElement: updateLocalChatRoom }] = useChatRooms(type)  

  // don't rely on socket update for new messages
  const onAdd = useCallback((ms: ChatMessage[]) => {
    const newest = ms[0]
    updateLocalChatRoom(newest.roomId, { 
      recentMessage: newest.message, 
      recentSender: newest.senderId ?? '',
      recentMessageSentAt: Date.now(),
    })
  }, [updateLocalChatRoom])

  const toReturn = useListStateHook(
    'chats', state, session, chatsSlice,
    { 
      loadQuery: !roomId ? undefined : session.api.chats.getSome,
      findOne: session.api.chats.getOne,
      addOne: session.api.chats.createOne,
      addSome: session.api.chats.createSome,
      deleteOne: session.api.chats.deleteOne,
      updateOne: session.api.chats.updateOne,
    }, 
    {
      ...options,
      loadFilter: { ...options.loadFilter, roomId },
      returnFilter: v => (options.returnFilter ? options.returnFilter(v) : true)
                      && (roomId ? v.roomId === roomId : true),
      // returnFilter: v => (options.returnFilter ?? (v => true))(v) && v.roomId === roomId,
      onAdd,
    }
  ) 

  return toReturn
}