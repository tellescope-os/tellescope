import { io } from 'socket.io-client'

import { Session, SessionOptions, APIQuery, defaultQueries } from "./session"
import {
  PublicEndpoints,
} from "./public"

import {
  ClientModelForName,
  Enduser,
} from "@tellescope/types-client"
import { stringValidator } from "@tellescope/validation";

export interface EnduserSessionOptions extends SessionOptions {}

type EnduserAccessibleModels = "chat_rooms" | 'chats' 

type Queries = { [K in EnduserAccessibleModels]: APIQuery<K> }

const loadDefaultQueries = (s: Session): { [K in EnduserAccessibleModels] : APIQuery<K> } => ({
  chat_rooms: defaultQueries(s, 'chat_rooms'),
  chats: defaultQueries(s, 'chats'),
})


export class EnduserSession extends Session {
  session = new Session();
  enduser: Enduser; 
  api: Queries;

  constructor(o?: EnduserSessionOptions) {
    super(o)
    this.enduser = {} as Enduser

    this.api = loadDefaultQueries(this) as Queries
  }

  handle_new_session = async ({ authToken, enduser }: { authToken: string, enduser: Enduser }) => {
    this.setAuthToken(authToken)
    this.enduser = enduser

    this.socket = io(`${this.host}/${enduser.businessId}/${enduser.id}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    this.socket.on('disconnect', () => { this.socketAuthenticated = false })
    this.socket.on('authenticated', () => { this.socketAuthenticated = true })

    this.socket.emit('authenticate', authToken)

    return { authToken, enduser }
  }

  authenticate = async (email: string, password: string) => this.handle_new_session(
    await this.POST<{email: string, password: string }, { authToken: string, enduser: Enduser }>('/v1/login-enduser', { email, password })
  )

  subscribe = (rooms: { [index: string]: keyof ClientModelForName } ) => this.EMIT('join-rooms', { rooms })

  handle_events = ( handlers: { [index: string]: (a: any) => void } ) => {
    for (const handler in handlers) this.ON(handler, handlers[handler])
  } 

  unsubscribe = (roomIds: string[]) => this.EMIT('leave-rooms', { roomIds })
}