import React, { useCallback, useEffect, useRef, useState } from 'react'

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

export const update_element_in_array = <T extends { id: string }>(a: LoadedData<T[]>, id: string, updates: Partial<T>): LoadedData<T[]>=> {
  if (a.status !== LoadingStatus.Loaded) return a
  if (a.value.find(a => a.id === id) === undefined) return a
 
  return { 
    status: LoadingStatus.Loaded, 
    value: a.value.map(e => e.id === id ? { ...e, ...updates } : e)
  }
}

export interface ListUpdates<T> {
  set: (value: LoadedData<T[]>) => void; 
  add: (item: T) => void; 
  update: (id: string, updates: Partial<T>) => void; 
}

export const useStateManagerForList = <T extends { id: string }>(loadQuery: () => Promise<T[]>): [
  LoadedData<T[]>, ListUpdates<T>
] => {
  const [state, setState] = useState(LOADING as LoadedData<T[]>) 

  const loadedRef = useRef(false)

  useEffect(() => {
    if (state !== LOADING || loadedRef.current === true) return

    loadedRef.current = true
    toLoadedData(loadQuery).then(setState)
  }, [state, loadedRef, loadQuery])

  return [
    state, 
    { 
      set: setState,
      add: item => setState(state => {
        if (state.status !== LoadingStatus.Loaded) {
          return { status: LoadingStatus.Loaded, value: [item] }
        }
        if (state.value.find(v => v.id === item.id) !== undefined) {
          return state
        }
        return { status: LoadingStatus.Loaded, value: [item, ...state.value] }
      }),
      update: (id, updates) => {
        const x =update_element_in_array(state, id, updates) 
        setState(state => 
        update_element_in_array(state, id, updates)
      ) }
    } 
  ]
} 

export interface MappedListReducers<T extends { id: string }> {
  setForKey: (key: string, value: LoadedData<T[]>) => void;
  addElementForKey: (key: string, e: T) => void; 
  addElementsForKey: (key: string, es: T[]) => void; 
}
export const useStateManagerForMappedList = <T extends { id: string }>(key: string, loadQuery: () => Promise<T[]>): [LoadedData<T[]>, MappedListReducers<T>]  => {
  const [state, setState] = useState({} as Indexable<LoadedData<T[]>>) 
  const loadedRef = useRef({ } as Indexable<boolean>)
 
  const setForKey = useCallback((k: string, v: LoadedData<T[]>) => setState(s => ({
    ...s, [k]: v
  })), [])
  
  const addElementForKey = useCallback((key: string, item: T) => setState(state => {
    if (state[key].status !== LoadingStatus.Loaded) {
      state[key] = { status: LoadingStatus.Loaded, value: [item] }
    }
    if ((state[key].value as T[]).find(v => v.id === item.id) !== undefined) {
      return state
    }

    return {
      ...state,
      [key]: { status: LoadingStatus.Loaded, value: [item, ...(state[key].value as T[])] }
    }
  }), [])

  useEffect(() => {
    if (loadedRef.current[key] === true) return 
    if (!key) return

    loadedRef.current[key] = true
    toLoadedData(loadQuery).then(s => setForKey(key, s))
  }, [key, loadedRef, loadQuery]) 

  return [
    state[key] ?? LOADING,
    {
      setForKey,
      addElementForKey, 
      addElementsForKey: (key, items) => {
        for (const i of items) { addElementForKey(key, i) }
      }
    }
  ]
}

const useResolvedSession = (type: SessionType) => {
  const u_session = useSession({ throwIfMissingContext: type === 'user' })
  const e_session = useEnduserSession({ throwIfMissingContext: type === 'enduser' })
  return type === 'user' ? u_session : e_session
}

export const useChatRooms = (type: SessionType) => {
  const session = useResolvedSession(type)
  return useStateManagerForList(session.api.chat_rooms.getSome)
}

export const useChats = (roomId: string, type: SessionType) => {
  const session = useResolvedSession(type)
  const toReturn = useStateManagerForMappedList(roomId, () => session.api.chats.getSome({}, { roomId }))
  const [_, { update: updateChatRoom }] = useChatRooms(type)  


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