import "@tellescope/types"

import { Session, SessionOptions } from "./session"
import { url_safe_path } from "@tellescope/utilities"

type Filter<T> = { [K in keyof T]: T[K] }
type Session_T = ReturnType<typeof Session>

export interface APIQuery<
  N extends ModelName, 
  T=ModelForName[N], 
  Req=ModelForName_required[N], 
  CREATE=Omit<Req & Partial<T>, keyof ModelForName_readonly[N]>, 
  UPDATE=Omit<Partial<T>, keyof (ModelForName_readonly[N] & ModelForName_updatesDisabled[N])>,
  RETURN=ToClient<T>
> 
{
  createOne: (t: CREATE) => Promise<RETURN>;
  createSome: (ts: CREATE[]) => Promise<{ created: RETURN[], errors: object[] }>;
  getOne: (id: string, filter?: Filter<Partial<T>>) => Promise<RETURN>;
  getSome: (o?: { lastId?: string, limit?: number, sort?: SortOption, threadKey?: string }, f?: Filter<Partial<T>>) => Promise<RETURN[]>
  updateOne: (id: string, updates: UPDATE, options?: CustomUpdateOptions) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
}

const defaultQueries = <N extends ModelName>(
  s: Session_T, n: keyof ModelForName_required
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

const loadDefaultQueries = (s: Session_T): { [K in keyof ModelForName] : APIQuery<K> } => ({
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

type Queries = { [K in ModelName]: APIQuery<K> } & {
  journeys: {
    updateState: (id: string, name: string, updates: JourneyState) => Promise<void>
  }
}

export const createSession = (o?: SessionOptions) => {
  const s = Session(o)

  const queries = loadDefaultQueries(s) as Queries
  queries.journeys.updateState = (id, name, updates) => s.PATCH(`/v1/journey/${id}/state/${name}`, { updates })

  const subscribe = (rooms: { [index: string]: ModelName } ) => s.EMIT('join-rooms', { rooms })

  const handle_events = ( handlers: { [index: string]: (a: any) => void } ) => {
    for (const handler in handlers) s.ON(handler, handlers[handler])
  } 

  const unsubscribe = (roomIds: string[]) => s.EMIT('leave-rooms', { roomIds })

  return {
    get_userInfo: s.get_userInfo,
    authenticate: s.authenticate,
    refresh_session: s.refresh_session,
    socket_is_authenticated: s.socket_is_authenticated,
    authenticate_socket: s.authenticate_socket,
    logout: () => s.POST('/logout-api'),
    reset_db: () => s.POST('/reset-demo'),
    test_online: () => s.GET<{}, string>('/v1'),
    test_authenticated: () => s.GET<{}, string>('/v1/test-authenticated'),
    subscribe, handle_events, unsubscribe,
    ...queries
  }
}

// initialize queries for every model defined in the schema
// requires casting as is, but avoids needing to manually define every new type when added
// let n: keyof ModelForName;
// for (n in schema) {
//   (queries as Indexable)[n] = defaultQueries(n, (schema as Indexable)[n])
// }