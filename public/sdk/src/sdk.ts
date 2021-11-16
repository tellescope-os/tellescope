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
import { SortOption } from "@tellescope/types-utilities"
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
  getSome: (o?: { lastId?: string, limit?: number, sort?: SortOption, threadKey?: string, filter?: Filter<Partial<T>> }) => Promise<T[]>
  updateOne: (id: string, updates: UPDATE, options?: CustomUpdateOptions) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
}

export const defaultQueries = <N extends keyof ClientModelForName>(
  s: Session, n: keyof ClientModelForName_required
): APIQuery<N> => {

  const safeName = url_safe_path(n)
  const singularName = (safeName).substring(0, safeName.length - 1)

  return {
    createOne: o => s._POST(`/v1/${singularName}`, o),
    createSome: os => s._POST(`/v1/${safeName}`, { create: os }),
    getOne: (id, filter) => s._GET(`/v1/${singularName}/${id}`, { filter }),
    getSome: (o) => s._GET(`/v1/${safeName}`, o),
    updateOne: (id, updates, options) => s._PATCH(`/v1/${singularName}/${id}`, { updates, options }),
    deleteOne: id => s._DELETE(`/v1/${singularName}/${id}`),
  }
}

const loadDefaultQueries = (s: Session): { [K in keyof ClientModelForName] : APIQuery<K> } => ({
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
  },
  users: {
    display_names: () => Promise<{ fname: string, lname: string, id: string }[]>,
  },
}

export class Session extends SessionManager {
  api: Queries;
  userInfo!: UserSession;

  constructor(o?: SessionOptions) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_user" })
    const queries = loadDefaultQueries(this) as Queries

    queries.journeys.updateState = (id, name, updates) => this._PATCH(`/v1/journey/${id}/state/${name}`, { updates })
    queries.endusers.setPassword = (id, password) => this._POST(`/v1/set-enduser-password`, { id, password })
    queries.endusers.isAuthenticated = (id, authToken) => this._GET(`/v1/enduser-is-authenticated`, { id, authToken })
    queries.users.display_names = () => this._GET<{}, { fname: string, lname: string, id: string }[]>(`/v1/user-display-names`),

    this.api = queries

    if (this.authToken) this.refresh_session()
  }

  _POST = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    await this.refresh_session_if_expiring_soon()
    return await this.POST<A,R>(endpoint, args, authenticated)
  }

  _GET = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    await this.refresh_session_if_expiring_soon()
    return await this.GET<A,R>(endpoint, params, authenticated)
  }

  _PATCH = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    await this.refresh_session_if_expiring_soon()
    return await this.PATCH<A,R>(endpoint, params, authenticated)
  }

  _DELETE = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    await this.refresh_session_if_expiring_soon()
    return await this.DELETE<A,R>(endpoint, args, authenticated)
  }
 
  handle_new_session = async ({ authToken, ...userInfo }:   UserSession & { authToken: string }) => {
    this.sessionStart = Date.now()
    this.setAuthToken(authToken)
    this.setUserInfo(userInfo)
    this.authenticate_socket()

    return { authToken, ...userInfo }
  }

  refresh_session = async () => {
    const { user, authToken } = await this.POST<{}, { user: UserSession } & { authToken: string }>('/v1/refresh-session')
    await this.handle_new_session({ ...user, authToken })
    return { user, authToken }
  }
  refresh_session_if_expiring_soon = async () => {
    const elapsedSessionMS =  Date.now() - (this.sessionStart || Date.now())
    
    if (this.AUTO_REFRESH_MS < elapsedSessionMS) { return await this.refresh_session()}
  }

  authenticate = async (email: string, password: string, url?: string) => {
    if (url) this.host = url

    return this.handle_new_session(
      await this.POST<{email: string, password: string },  UserSession & { authToken: string }>('/submit-login', { email, password })
    ) 
  }
  logout = async () => {
    this.clearState()
    this.POST('/logout-api').catch(console.error)
  }

  reset_db = () => this.POST('/reset-demo')
  test_online = () => this.GET<{}, string>('/v1')
  test_authenticated = () => this.GET<{}, string>('/v1/test-authenticated')
}

export { SessionOptions }