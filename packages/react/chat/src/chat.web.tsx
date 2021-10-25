import React, { HTMLInputTypeAttribute, CSSProperties } from "react"

import LinearProgress from '@mui/material/LinearProgress';

import {
  List,
  LoadingLinear,
  useLoadedState,
} from "@tellescope/react-components"

import {
  useSession,
  useEnduserSession,
} from "@tellescope/authentication"

import {
  ChatRoom,
  ChatMessage,
} from "@tellescope/types-client"

import {
  LoadedData,
} from "@tellescope/types-utilities"

interface Sidebar_T {
  rooms: LoadedData<ChatRoom[]>,
}
const Sidebar = ({ rooms }: Sidebar_T) => (
  <LoadingLinear data={rooms} render={rooms => {
    return <List items={rooms}/>    
  }}/>
)

export const ChatsFromEndusersSidebar = () => {
  const session = useSession()
  const [rooms, setRooms] = useLoadedState(() => session.api.chat_rooms.getSome())

  return <Sidebar rooms={rooms}/>
}

export const ChatsFromUsersSidebar = () => {
  const session = useEnduserSession()
  const [rooms, setRooms] = useLoadedState<ChatRoom[]>()

  return <Sidebar rooms={rooms}/>
}