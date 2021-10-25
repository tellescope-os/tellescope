import { io } from 'socket.io-client'

import {
  JourneyState, 
  UserSession,
} from "@tellescope/types-models"

import {
  ClientModelForName,
  ClientModelForName_readonly,
  ClientModelForName_required,
  ClientModelForName_updatesDisabled,
  Enduser,
} from "@tellescope/types-client"
import { url_safe_path } from "@tellescope/utilities"

import { Session as SessionManager, SessionOptions, Filter } from "./session"

export * from "./public"
export * from "./enduser"

export interface APIQuery<
  N extends keyof ClientModelForName, 
  T=ClientModelForName[N], 
  Req=ClientModelForName_required[N], 
  CREATE=Omit<Req & Partial<T>, keyof ClientModelForName_readonly[N]>, 
  UPDATE=Omit<Partial<T>, keyof (ClientModelForName_readonly[N] & ClientModelForName_updatesDisabled[N])>,
> 
{
  createOne: (t: CREATE) => Promise<T>;
  createSome: (ts: CREATE[]) => Promise<{ created: T[], errors: object[] }>;
  getOne: (id: string, filter?: Filter<Partial<T>>) => Promise<T>;
  getSome: (o?: { lastId?: string, limit?: number, sort?: SortOption, threadKey?: string }, f?: Filter<Partial<T>>) => Promise<T[]>
  updateOne: (id: string, updates: UPDATE, options?: CustomUpdateOptions) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
}

export const defaultQueries = <N extends keyof ClientModelForName>(
  s: SessionManager, n: keyof ClientModelForName_required
): APIQuery<N> => {

  const safeName = url_safe_path(n)
  const singularName = (safeName).substring(0, safeName.length - 1)

  return {
    createOne: o => s.POST(`/v1/${singularName}`, o),
    createSome: os => s.POST(`/v1/${safeName}`, { create: os }),
    getOne: (id, filter) => s.GET(`/v1/${singularName}/${id}`, { filter }),
    getSome: (o, filter) => s.GET(`/v1/${safeName}`, { ...o, filter }),
    updateOne: (id, updates, options) => s.PATCH(`/v1/${singularName}/${id}`, { updates, options }),
    deleteOne: id => s.DELETE(`/v1/${singularName}/${id}`),
  }
}

const loadDefaultQueries = (s: SessionManager): { [K in keyof ClientModelForName] : APIQuery<K> } => ({
  endusers: defaultQueries(s, 'endusers'),
  engagement_events: defaultQueries(s, 'engagement_events'),
  journeys: defaultQueries(s, 'journeys'),
  api_keys: defaultQueries(s, 'api_keys'),
  tasks: defaultQueries(s, 'tasks'),
  emails: defaultQueries(s, 'emails'),
  sms_messages: defaultQueries(s, 'sms_messages'),
  chat_rooms: defaultQueries(s, 'chat_rooms'),
  chats: defaultQueries(s, 'chats'),
  users: defaultQueries(s, 'users'),
  templates: defaultQueries(s, 'templates') ,
})

type Queries = { [K in keyof ClientModelForName]: APIQuery<K> } & {
  journeys: {
    updateState: (id: string, name: string, updates: JourneyState) => Promise<void>
  },
  endusers: {
    setPassword: (id: string, password: string) => Promise<void>,
    isAuthenticated: (id: string, authToken: string) => Promise<{ isAuthenticated: boolean, enduser: Enduser }>
  }
}

export class Session extends SessionManager{
  api: Queries;
  userInfo: UserSession;

  constructor(o?: SessionOptions) {
    super(o)
    this.userInfo = {} as UserSession
    const queries = loadDefaultQueries(this) as Queries

    queries.journeys.updateState = (id, name, updates) => this.PATCH(`/v1/journey/${id}/state/${name}`, { updates })
    queries.endusers.setPassword = (id, password) => this.POST(`/v1/set-enduser-password`, { id, password })
    queries.endusers.isAuthenticated = (id, authToken) => this.GET(`/v1/enduser-is-authenticated`, { id, authToken })

    this.api = queries
  }


  handle_new_session = async ({ authToken, ...userInfo }:   UserSession & { authToken: string }) => {
    this.setAuthToken(authToken)
    this.userInfo = userInfo

    this.socket = io(`${this.host}/${userInfo.organization}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    this.socket.on('disconnect', () => { this.socketAuthenticated = false })
    this.socket.on('authenticated', () => { this.socketAuthenticated = true })

    this.socket.emit('authenticate', authToken)

    return { authToken, ...userInfo }
  }

  refresh_session = async () => {
    const { userInfo, authToken } = await this.GET<{}, { userInfo: UserSession } & { authToken: string }>('/refresh-session')
    await this.handle_new_session({ ...userInfo, authToken })
  }

  authenticate = async (email: string, password: string, url?: string) => {
    if (url) this.host = url

    return this.handle_new_session(
      await this.POST<{email: string, password: string },  UserSession & { authToken: string }>('/submit-login', { email, password })
    ) 
  }

  subscribe = (rooms: { [index: string]: keyof ClientModelForName } ) => this.EMIT('join-rooms', { rooms })

  handle_events = ( handlers: { [index: string]: (a: any) => void } ) => {
    for (const handler in handlers) this.ON(handler, handlers[handler])
  } 

  unsubscribe = (roomIds: string[]) => this.EMIT('leave-rooms', { roomIds })

  socket_is_authenticated = () => this.socketAuthenticated
  logout = () => this.POST('/logout-api')
  reset_db = () => this.POST('/reset-demo')
  test_online = () => this.GET<{}, string>('/v1')
  test_authenticated = () => this.GET<{}, string>('/v1/test-authenticated')
}

export { SessionOptions }