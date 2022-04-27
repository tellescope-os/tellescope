import React, { useState, CSSProperties, useEffect } from "react"

import {
  AsyncIconButton,
  DisplayPicture,
  IN_REACT_WEB,
  List,
  Flex,
  Badge,
  SendIcon,
  Styled,
  Typography,
  TextField,
  LoadingLinear,
  value_is_loaded,
  useSession,
  useEnduserSession,
  useResolvedSession,
  useChatRooms,
  useChats,
  useChatRoomDisplayInfo,
  ChatRoomDisplayInfo,
  SecureImage,
  ImageDimensions,
} from "@tellescope/react-components"

import {
  ChatRoom,
  ChatMessage,
  UserDisplayInfo,
} from "@tellescope/types-client"
import {
  UserActivityStatus,
  UserActivityInfo,
} from "@tellescope/types-models"

import {
  LoadedData, 
  SessionType,
} from "@tellescope/types-utilities"

import {
  ActivityOptions,
  user_display_name, user_is_active,
} from "@tellescope/utilities"

import {
  PRIMARY_HEX,
} from "@tellescope/constants"

import {
  Session,
  EnduserSession,
} from "@tellescope/sdk"

export {
  user_display_name, // for convenience
}

const MESSAGE_BORDER_RADIUS = 25

const baseMessageStyle: CSSProperties = {
  borderRadius: MESSAGE_BORDER_RADIUS,
  paddingRight: 10,
  paddingLeft: 10,
  paddingTop: 6,
  paddingBottom: 6,
}
const defaultSentStyle: CSSProperties = {
  ...baseMessageStyle,
  marginLeft: 'auto',
  marginRight: 5,
  backgroundColor: PRIMARY_HEX,
}
const defaultReceivedStyle: CSSProperties = {
  ...baseMessageStyle,
  marginRight: 'auto',
  marginLeft: 5,
  backgroundColor: "#444444",
}

const baseTextStyle = {
  color: "#ffffff",
}
const defaultSentTextStyle = {
  ...baseTextStyle,
  marginRight: 5,
  marginLeft: 5,
}
const defaultReceivedTextStyle = {
  ...baseTextStyle,
  marginRight: 5,
  marginLeft: 5,
}

export interface MessagesHeaderProps {
  room?: ChatRoom;
  resolveSenderName?: (room: ChatRoom) => React.ReactNode; 
  style?: CSSProperties;
}

const MessagesHeader = ({ room, resolveSenderName, ...p}: MessagesHeaderProps) => (
  <Flex>
    <Typography>
      {room &&  resolveSenderName?.(room)}
    </Typography>
  </Flex>
)

interface MessageStyles {
  receivedMessageContainerStyle?: CSSProperties,
  sentMessageContainerStyle?: CSSProperties,
  receivedMessageStyle?: CSSProperties,
  receivedMessageTextStyle?: CSSProperties,
  sentMessageStyle?: CSSProperties,
  sentMessageTextStyle?: CSSProperties,
}

interface MessageProps extends MessageStyles {
  message: ChatMessage,
  iconSize?: number,
  imageDimensions?: ImageDimensions,
}
export const Message = ({ 
  message, 
  iconSize=30,
  sentMessageStyle=defaultSentStyle,
  receivedMessageStyle=defaultReceivedStyle, 
  sentMessageTextStyle=defaultSentTextStyle,
  receivedMessageTextStyle=defaultReceivedTextStyle,
  imageDimensions,
}: MessageProps) => {
  const session = useResolvedSession()
  const chatUserId = session.userInfo.id

  const [displayInfo] = useChatRoomDisplayInfo(message.roomId, session.type)
  const displayInfoLookup = value_is_loaded(displayInfo) ? displayInfo.value : {} as ChatRoomDisplayInfo

  // deep copy so that the override of background color doesn't affect other messages
  const textBGStyle = { ...message.senderId === chatUserId ? sentMessageStyle : receivedMessageStyle }
  const textStyle = { ...message.senderId === chatUserId ? sentMessageTextStyle : receivedMessageTextStyle }

  if (!message.message) {
    textBGStyle.backgroundColor = undefined
  }

  const attachments = (
    !!message.attachments && message.attachments.length > 0 
      && <MessageAttachments message={message} chatUserId={chatUserId} imageDimensions={imageDimensions} />
  )

  const messageComponent = IN_REACT_WEB ? (
    <Typography component="div" style={{ ...textStyle, ...textBGStyle }}>
      {message.message}
      {attachments}
    </Typography>
  ) : (
    <Flex style={{ ...textBGStyle }}>
      <Typography component="div" style={{ ...textStyle }}>
        {message.message}
        {attachments}
      </Typography>   
    </Flex>
  )

  const displayPicture = (
    <DisplayPicture 
      style={{ maxWidth: '10%' }}
      user={displayInfoLookup[message.senderId ?? ''] ?? { id: message.senderId, avatar: '' }}
      size={iconSize}
    />
  )

  return (
    <Flex style={{ margin: 5, flexWrap: 'nowrap' }}> 
      {message.senderId !== chatUserId && displayPicture}
      {messageComponent}
      
      {message.senderId === chatUserId && displayPicture}
    </Flex>
  )
}

export const MessageAttachments = ({ message, chatUserId, imageDimensions } : { message: ChatMessage, chatUserId: string, imageDimensions?: ImageDimensions }) => {
  if (!message.attachments) return null
  if (message.attachments.length === 0) return null

  return (
    <Flex column alignSelf={message.senderId === chatUserId ? "flex-end" : "flex-start"}>
      {message.attachments.filter(a => a.type === 'image').map(a=> (
        <Flex key={a.secureName} style={{ margin: 10 }}>
          <SecureImage key={a.secureName} secureName={a.secureName} alt="image attachment" {...imageDimensions} />
        </Flex>
      ))}
    </Flex>
  )
}

interface Messages_T extends MessageStyles {
  resolveSenderName?: (room: ChatRoom) => React.ReactNode; 
  messages: LoadedData<ChatMessage[]>,
  chatUserId: string,
  Header?: React.JSXElementConstructor<MessagesHeaderProps>,
  headerProps?: MessagesHeaderProps,
  imageDimensions?: ImageDimensions,
}
export const Messages = ({ 
  resolveSenderName,
  messages, 
  chatUserId, 
  Header=MessagesHeader,
  headerProps,
  style,
  imageDimensions,
  ...messageStyles 
}: Messages_T & Styled) => (
  <LoadingLinear data={messages} render={messages => (
    <Flex column flex={1}>
      {Header && <Header {...headerProps}/>}
      <List reverse style={style} items={messages} render={(message, i) => (
        <Flex column>
          <Message message={message} imageDimensions={imageDimensions} {...messageStyles} />
        </Flex>
      )}/>    
    </Flex>
  )}/>
)

const defaultSidebarStyle: CSSProperties  = {
  borderRadius: 5,
  backgroundColor: 'gray',
  overflowY: 'auto',
}
const defaultSidebarItemStyle: CSSProperties  = {
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

export interface ConversationPreviewProps {
  room: ChatRoom;
  displayInfo: { [index: string]: UserDisplayInfo };
  onClick?: (room: ChatRoom) => void;
  selected?: boolean;
  style?: CSSProperties;
  selectedStyle?: CSSProperties;
}

export const resolve_chat_room_name = (room: ChatRoom, displayInfo: { [index: string]: UserDisplayInfo }, userType: SessionType, currentUserId: string) => {
  if (room.recentSender !== currentUserId) {
    return user_display_name(displayInfo[room.recentSender ?? ''])
  }
  if (userType === 'user') {
    return user_display_name(displayInfo[room?.enduserIds?.[0] ?? room.creator ?? ''])
  }
  if (userType === 'enduser') {
    console.log(room.recentSender, room.creator, displayInfo[room.creator])
    return user_display_name(displayInfo[room?.userIds?.[0] ?? room.creator ?? ''])
  }
  return ''
}

export type PreviewComponentType = React.JSXElementConstructor<ConversationPreviewProps> 

interface SidebarInfo {
  selectedRoom?: string;
  onRoomSelect: (roomId: string) => void;
  style?: CSSProperties;
  selectedItemStyle?: CSSProperties;
  itemStyle?: CSSProperties;
  nameStyle?: CSSProperties;
  PreviewComponent?: PreviewComponentType,
  previewStyle?: CSSProperties;
}

const ConversationPreview = ({ onClick, selected, room, style, displayInfo, selectedStyle }: ConversationPreviewProps) => {
  const session = useResolvedSession()

  return (
    <Flex flex={1} column onClick={() => !selected && onClick?.(room)} 
      style={selected ? (selectedStyle ?? defaultSidebarItemStyleSelected) : (style ?? defaultSidebarItemStyle) }
    >
      <Typography style={defaultMessageNameStyle}>
        {resolve_chat_room_name(room, displayInfo, session.type, session.userInfo.id)}
      </Typography>

      <Typography style={defaultMessagePreviewStyle}>
        {room.recentMessage ?? room.title}
      </Typography>
    </Flex>
  )
}

const PreviewWithData = ({ PreviewComponent=ConversationPreview, ...props }: Omit<ConversationPreviewProps, 'displayInfo'> & Pick<SidebarInfo, 'PreviewComponent'>) => {
  const session = useResolvedSession()
  const [displayInfo] = useChatRoomDisplayInfo(props.room.id, session.type)

  return (
    <PreviewComponent displayInfo={value_is_loaded(displayInfo) ? displayInfo.value : {} } 
      {...props} 
    />
  )
}

interface ConversationsProps extends SidebarInfo {
  rooms: LoadedData<ChatRoom[]>;
}
export const Conversations = ({ rooms, selectedRoom, onRoomSelect, PreviewComponent=ConversationPreview, style, selectedItemStyle, itemStyle } : ConversationsProps) => {

  return ( 
    <LoadingLinear data={rooms} render={rooms =>
      <List style={style ?? defaultSidebarStyle} items={rooms} onClick={r => onRoomSelect(r.id)} render={(room, { onClick, index }) => 
        <PreviewWithData key={room.id} room={room} onClick={onClick} selected={selectedRoom === room.id} 
          selectedStyle={selectedItemStyle} style={itemStyle} PreviewComponent={PreviewComponent}
        />
      }/>    
    }/>
  )
}


// deprecated while Conversations relies on useResolvedSession
export const EndusersConversations = ({ enduserId, ...p } : SidebarInfo & { enduserId: string }) => <Conversations {...p} rooms={useChatRooms('enduser')[0]} />

// deprecated while Conversations relies on useResolvedSession
export const UsersConversations = ({ userId, ...p } : SidebarInfo & { userId: string }) => <Conversations {...p} rooms={useChatRooms('user')[0]}/>

interface SendMessage_T {
  type: SessionType,
  roomId: string,
  onNewMessage?: (m: ChatMessage) => void;
  placeholderText?: string;
  Icon?: React.ElementType<any>;
  style?: CSSProperties;

  // web only
  sendOnEnterPress?: boolean,
}
export const SendMessage = ({ 
  roomId, 
  type,
  Icon=SendIcon, 
  onNewMessage, 
  placeholderText="Enter a message", 
  style={},
  sendOnEnterPress,
}: SendMessage_T) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const [disabled, setDisabled] = useState(false)
  const [chatFocused, setChatFocused] = React.useState(false)
  
  const [, { createElement: createMessage }] = useChats(roomId, type)

  useEffect(() => {
    if (!chatFocused) return
    if (!sendOnEnterPress) return
    if (typeof window === 'undefined') return

    const handleSend = (e: any) => {
      if (e.key !== 'Enter') return
      setDisabled(true)

      createMessage({ message, roomId })
      .then(m => {
        setMessage('')
        onNewMessage?.(m)
      })
      .catch(console.error)
      .finally(() => setDisabled(false))
    }    

    window.addEventListener('keypress', handleSend)
    return () => { window.removeEventListener('keypress', handleSend) }
  }, [sendOnEnterPress, chatFocused, message, roomId])

  return (
    <Flex row flex={1} alignContent="center" style={style}>
      <Flex column flex={1}>
        <TextField variant="outlined" value={message} onChange={setMessage} disabled={sending}
          aria-label="Enter a message" 
          placeholder={placeholderText} 
          onFocus={() => setChatFocused(true)}
          onBlur={() => setChatFocused(false)}
        />
      </Flex>
      <Flex column alignSelf="center">
        <AsyncIconButton label="send" Icon={Icon} 
          disabled={message === '' || disabled}  
          action={() => createMessage({ message, roomId })}
          onSuccess={m => {
            setMessage('')
            onNewMessage?.(m)
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
  const [selectedRoom, setSelectedRoom] = useState('')
  const [messages] = useChats(selectedRoom, type)

  return (
    <Flex row style={style} flex={1}>
      <Flex column flex={1}>
        {type === 'user'
          ? <UsersConversations userId={session.userInfo.id} selectedRoom={selectedRoom} onRoomSelect={setSelectedRoom}/>
          : <EndusersConversations selectedRoom={selectedRoom} enduserId={session.userInfo.id} onRoomSelect={setSelectedRoom}/>
        }
      </Flex>

      <Flex column flex={2} style={{ borderRadius: 5 }}>
        {selectedRoom && 
          <>
          <Flex row flex={8}>
            <Messages messages={messages} chatUserId={session.userInfo.id}
              headerProps={{

              }}
            />
          </Flex>

          <Flex row flex={1} style={{ marginLeft: 10, marginRight: 10 }}>
            <SendMessage type={type} roomId={selectedRoom}/> 
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

const defaultColorForStatus: { [K in UserActivityStatus]: CSSProperties['color'] } = {
  Active: '#15ba11',
  Away: '#FFD125',
  Unavailable: '#DC1717'
}
export const UserActiveBadge = ({ user, style, size, activeThresholdMS, inactiveThresholdMS }: { 
  user?: UserActivityInfo, 
  size?: number,
} & ActivityOptions & Styled) => {
  const status = user_is_active(user, { activeThresholdMS, inactiveThresholdMS }) 
  if (status === null || status === 'Unavailable') return null
 
  return (
    <Badge color={defaultColorForStatus[status]} size={size} style={style}/>
  )
}