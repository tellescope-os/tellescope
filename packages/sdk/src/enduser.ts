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

type Queries = { [K in EnduserAccessibleModels]: APIQuery<K> } & {
  endusers: {
    logout: () => Promise<void>;
  },
  users: {
    display_names: () => Promise<{ fname: string, lname: string, id: string }[]>
  },
}

const loadDefaultQueries = (s: Session): { [K in EnduserAccessibleModels] : APIQuery<K> } => ({
  chat_rooms: defaultQueries(s, 'chat_rooms'),
  chats: defaultQueries(s, 'chats'),
})


export class EnduserSession extends Session {
  userInfo!: Enduser; 
  api: Queries;

  constructor(o?: EnduserSessionOptions) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_enduser" })
    
    this.api = loadDefaultQueries(this) as Queries

    this.api.endusers = {
      logout: () => this.POST('/v1/logout-enduser')
    }
    this.api.users = { 
      display_names: () => this.GET<{}, { fname: string, lname: string, id: string }[] >(`/v1/user-display-names`),
    }
  }

  handle_new_session = async ({ authToken, enduser }: { authToken: string, enduser: Enduser }) => {
    this.setAuthToken(authToken)
    this.setUserInfo(enduser)

    this.socket = io(`${this.host}/${enduser.businessId}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    this.socket.on('disconnect', () => { this.socketAuthenticated = false })
    this.socket.on('authenticated', () => { this.socketAuthenticated = true })

    this.socket.emit('authenticate', authToken)

    return { authToken, enduser }
  }

  authenticate = async (email: string, password: string) => this.handle_new_session(
    await this.POST<{email: string, password: string }, { authToken: string, enduser: Enduser }>('/v1/login-enduser', { email, password })
  )
  logout = async () => {
    this.clearState()
    this.api.endusers.logout().catch(console.error)
  }
}