import React, { useCallback, useState, CSSProperties } from "react"

import {
  List,
  Flex,
} from "@tellescope/react-components/lib/esm/layout"
import {
  AsyncIconButton,
} from "@tellescope/react-components/lib/esm/controls"
import {
  SendIcon,
  Styled,
  Typography,
  TextField,
} from "@tellescope/react-components/lib/esm/mui"
import {
  LoadingLinear,
  Resolver,
} from "@tellescope/react-components/lib/esm/loading"
import {
  useSession,
  useEnduserSession,
} from "@tellescope/react-components/lib/esm/authentication"
import {
  useChatRooms,
  useChats,
} from "@tellescope/react-components/lib/esm/state"
import {
  useEndusers,
} from "@tellescope/react-components/lib/esm/user_state"
import {
  useUserDisplayNames,
} from "@tellescope/react-components/lib/esm/enduser_state"

import {
  ChatRoom,
  ChatMessage,
} from "@tellescope/types-client"

import {
  LoadedData, 
  LoadingStatus,
  SessionType,
} from "@tellescope/types-utilities"

import {
  user_display_name,
} from "@tellescope/utilities"

import {
  PRIMARY_HEX,
} from "@tellescope/constants"

import {
  Session,
  EnduserSession,
} from "@tellescope/sdk"

const defaultMessagesStyle: CSSProperties = {
  borderRadius: 5,
}
const baseMessageStyle = {
  borderRadius: 25,
  paddingRight: 10,
  paddingLeft: 10,
  margin: 5,
  maxWidth: '80%',
}
const defaultSentStyle: CSSProperties = {
  ...baseMessageStyle,
  justifyContent: 'flex-end',
  marginLeft: 'auto',
  backgroundColor: PRIMARY_HEX,
}
const defaultReceivedStyle: CSSProperties = {
  ...baseMessageStyle,
  justifyContent: 'flex-start',
  marginRight: 'auto',
  backgroundColor: "#444444",
}
const baseTextStyle = {
  color: "#ffffff",
  padding: 4,
}
const defaultTextSentStyle: CSSProperties = {
  ...baseTextStyle,
  textAlign: 'right',
}
const defaultTextReceivedStyle: CSSProperties = {
  ...baseTextStyle,
  textAlign: 'left',
}

interface Messages_T {
  messages: LoadedData<ChatMessage[]>,
  chatUserId: string,
  receivedMessageStyle?: CSSProperties,
  receivedMessageTextStyle?: CSSProperties,
  sentMessageStyle?: CSSProperties,
  sentMessageTextStyle?: CSSProperties,
}
export const Messages = ({ 
  messages, 
  chatUserId, 
  style=defaultMessagesStyle,
  receivedMessageStyle=defaultReceivedStyle, 
  receivedMessageTextStyle=defaultTextReceivedStyle, 
  sentMessageStyle=defaultSentStyle,
  sentMessageTextStyle=defaultTextSentStyle,
}: Messages_T & Styled) => (
  <LoadingLinear data={messages} render={messages => (
    <List reverse style={style} items={messages} render={(message) => (
      <Flex key={message.id} style={message.senderId === chatUserId ? sentMessageStyle : receivedMessageStyle}>
        <Typography style={message.senderId === chatUserId ? sentMessageTextStyle : receivedMessageTextStyle}>
          {message.message}
        </Typography>    
      </Flex>
    )}/>    
  )}/>
)


const defaultSidebarStyle: CSSProperties  = {
  backgroundColor: "#858585",
  borderRadius: 5,
  overflowY: 'auto',
}
const defaultSidebarItemStyle: CSSProperties  = {
  backgroundColor: "#454545",
  color: "#ffffff",
  borderRadius: 5,
  cursor: 'pointer',
  maxHeight: 60,
  justifyContent: 'center',
}
const defaultSidebarItemStyleSelected = { 
  ...defaultSidebarItemStyle,
  backgroundColor: PRIMARY_HEX,
  cursor: "default",
}
const defaultMessageNameStyle: CSSProperties = {
  textAlign: 'right',
}
const defaultMessagePreviewStyle: CSSProperties = {
  textAlign: 'right',
}

interface SidebarInfo {
  selectedRoom?: string;
  onRoomSelect: (roomId: string) => void;
  style?: CSSProperties;
  selectedItemStyle?: CSSProperties;
  itemStyle?: CSSProperties;
  nameStyle?: CSSProperties;
  previewStyle?: CSSProperties;
}

interface Sidebar_T extends SidebarInfo {
  resolveChatName: (r: ChatRoom) => string;
  rooms: LoadedData<ChatRoom[]>;
}
export const Conversations = ({ rooms, selectedRoom, onRoomSelect, resolveChatName, style, selectedItemStyle, itemStyle, nameStyle, previewStyle } : Sidebar_T) => ( 
  <LoadingLinear data={rooms} render={rooms =>
    <List style={style ?? defaultSidebarStyle} items={rooms} onClick={onRoomSelect} render={(room, { onClick, index }) => 
      <Flex key={room.id} flex={1} column onClick={() => selectedRoom !== room.id && onClick?.(room.id ?? index)} 
        style={selectedRoom === room.id ? (selectedItemStyle ?? defaultSidebarItemStyleSelected) : (itemStyle ?? defaultSidebarItemStyle) }
      >
        <Typography style={nameStyle ?? defaultMessageNameStyle}>
          <Resolver item={room} resolver={resolveChatName}/>
        </Typography>

        <Typography style={previewStyle ?? defaultMessagePreviewStyle}>
          {room.recentMessage}
        </Typography>
      </Flex>
    }/>    
  }/>
)


export const EndusersConversations = ({ enduserId, ...p } : SidebarInfo & { enduserId: string }) => {
  const [rooms] = useChatRooms('enduser')
  const [displayNames] = useUserDisplayNames()

  const resolveChatName = useCallback((r: ChatRoom) => {
    if (r.title) return r.title

    if (displayNames.status === LoadingStatus.Loaded) {
      const user = displayNames.value.find(u => u.id === r.userIds?.[0])
      if (user) return user_display_name(user)
    }
    return ''
  }, [displayNames])

  return <Conversations {...p} rooms={rooms} resolveChatName={resolveChatName}/>

}

export const UsersConversations = ({ userId, ...p } : SidebarInfo & { userId: string }) => {
  const [rooms] = useChatRooms('user')
  const [endusers] = useEndusers()

  const resolveChatName = useCallback((r: ChatRoom) => {
    if (r.title) return r.title
    
    if (endusers.status === LoadingStatus.Loaded) {
      const enduser = endusers.value.find(e => e.id ===  r.enduserIds?.[0])   
      if (enduser) return user_display_name(enduser)
    }

    return ''
  }, [endusers])

  return <Conversations {...p} rooms={rooms} resolveChatName={resolveChatName}/>
}

interface SendMessage_T {
  session: Session | EnduserSession,
  roomId: string,
  onNewMessage: (m: ChatMessage) => void;
  Icon?: React.ElementType<any>;
}
export const SendMessage = ({ session, roomId, Icon=SendIcon, onNewMessage }: SendMessage_T) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  return (
    <Flex row flex={1} alignContent="center">
      <Flex column flex={1}>
        <TextField variant="outlined" value={message} onChange={setMessage} disabled={sending}
          aria-label="Enter a message" placeholder="Enter a message" size="small"
        />
      </Flex>
      <Flex column alignSelf="center">
        <AsyncIconButton label="send" Icon={Icon} disabled={message === ''}
          action={() => session.api.chats.createOne({ message, roomId })}
          onSuccess={m => {
            setMessage('')
            onNewMessage(m)
          }}
          onChange={setSending}
        />
      </Flex>
    </Flex>
  )
}

const defaultSplitChatStyle: CSSProperties = {}
interface SplitChat_T {
  session: EnduserSession | Session,
  type: SessionType,
}
export const SplitChat = ({ session, type, style=defaultSplitChatStyle } : SplitChat_T & Styled) => {
  const [, { update: updateRoom }] = useChatRooms(type)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [messages, { addElementForKey: addMessage }] = useChats(selectedRoom, type)

  return (
    <Flex row style={style} flex={1}>
      <Flex column flex={1}>
        {type === 'user'
          ? <UsersConversations userId={session.userInfo.id} selectedRoom={selectedRoom} onRoomSelect={setSelectedRoom}/>
          : <EndusersConversations selectedRoom={selectedRoom} enduserId={session.userInfo.id} onRoomSelect={setSelectedRoom}/>
        }
      </Flex>

      <Flex column flex={2} style={{ backgroundColor: '#cccccc', borderRadius: 5 }}>
        {selectedRoom && 
          <>
          <Flex row flex={8}>
            <Messages messages={messages} chatUserId={session.userInfo.id}/>
          </Flex>

          <Flex row flex={1} style={{ marginLeft: 10, marginRight: 10 }}>
            <SendMessage session={session} roomId={selectedRoom}
              onNewMessage={m => { 
                addMessage(selectedRoom, m)
                updateRoom(selectedRoom, { recentMessage: m.message, recentSender: m.senderId ?? '' })
              }}
            /> 
          </Flex>
          </>
        }
      </Flex>
    </Flex>
  )
}

export const UserChatSplit = ({ style=defaultSplitChatStyle } : Styled) => {
  const session = useSession()
  return (
    <SplitChat session={session} type="user" style={style}/>
  )
}

export const EnduserChatSplit = ({ style=defaultSplitChatStyle } : Styled) => {
  const session = useEnduserSession()
  return (
    <SplitChat session={session} type="enduser" style={style}/>
  )
}