import {
  CustomActions,
  schema,
  extractFields,
} from "@tellescope/schema"

import {
  JourneyState, 
  UserSession,
  MeetingInfo,
  ReadFilter,
  WebhookSubscriptionsType,
  Attendee,
} from "@tellescope/types-models"

import {
  ClientModelForName,
  ClientModelForName_readonly,
  ClientModelForName_required,
  ClientModelForName_updatesDisabled,
  ChatRoom,
  Enduser,
  File,
  Meeting,
} from "@tellescope/types-client"
import { CustomUpdateOptions, SortOption, S3PresignedPost, UserIdentity, FileBlob, FileBuffer, FileDetails, ReactNativeFile } from "@tellescope/types-utilities"
import { url_safe_path } from "@tellescope/utilities"

import { Session as SessionManager, SessionOptions } from "./session"

export * from "./public"
export * from "./enduser"

export type LoadFunction<T> = (o?: { 
    lastId?: string, 
    limit?: number, 
    sort?: SortOption, 
    threadKey?: string, 
    filter?: ReadFilter<T>,
  }) => Promise<T[]>

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
  getOne: (argument: string | ReadFilter<T>) => Promise<T>;
  getSome: LoadFunction<T>;
  updateOne: (id: string, updates: UPDATE, options?: CustomUpdateOptions) => Promise<T>;
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
    getOne: (argument) => typeof argument === 'string' ? s._GET(`/v1/${singularName}/${argument}`)
                                                       : s._GET(`/v1/${singularName}`, { filter: argument }),
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
  templates: defaultQueries(s, 'templates'),
  files: defaultQueries(s, 'files'),
  tickets: defaultQueries(s, 'tickets'),
  meetings: defaultQueries(s, 'meetings'),
  notes: defaultQueries(s, 'notes'),
  webhooks: defaultQueries(s, 'webhooks')
})

type Queries = { [K in keyof ClientModelForName]: APIQuery<K> } & {
  journeys: {
    update_state: (args: { id: string, name: string, updates: JourneyState }) => Promise<void>
  },
  endusers: {
    set_password: (args: { id: string, password: string }) => Promise<void>,
    is_authenticated: (args: { id?: string, authToken: string }) => Promise<{ isAuthenticated: boolean, enduser: Enduser }>
    generate_auth_token: (args: { id?: string, phone?: string, email?: string, externalId?: string }) => Promise<{ authToken: string, enduser: Enduser }>
  },
  users: {
    display_names: () => Promise<{ fname: string, lname: string, id: string }[]>,
  },
  files: {
    prepare_file_upload: (args: FileDetails) => Promise<{ presignedUpload: S3PresignedPost, file: File }>,
    file_download_URL: (args: { secureName: string }) => Promise<{ downloadURL: string }>,
  },
  meetings: {
    start_meeting: () => Promise<{ id: string, meeting: { Meeting: MeetingInfo }, host: Attendee }>, 
    end_meeting: (args: { id: string }) => Promise<void>, 
    add_attendees_to_meeting: (args: { id: string, attendees: UserIdentity[] }) => Promise<void>, 
    my_meetings: () => Promise<Meeting[]>,
    attendee_info: (args: { id: string }) => Promise<{ attendee: Attendee, others: UserIdentity[] }>,
  },
  chat_rooms: {
    join_room: (args: { id: string }) => Promise<{ room: ChatRoom }>,
    display_info: (args: extractFields<CustomActions['chat_rooms']['display_info']['parameters']>) => 
                    Promise<extractFields<CustomActions['chat_rooms']['display_info']['returns']>>,
  },
  webhooks: {
    configure: (args: { url: string, secret: string, subscriptions?: WebhookSubscriptionsType }) => Promise<void>,
    update: (args: { url?: string, secret?: string, subscriptionUpdates?: WebhookSubscriptionsType }) => Promise<void>
  },
}

export class Session extends SessionManager {
  api: Queries;
  userInfo!: UserSession;

  constructor(o?: SessionOptions & { userInfo?: UserSession }) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_user" })
    if (o?.userInfo) this.userInfo = o.userInfo

    const queries = loadDefaultQueries(this) as Queries

    queries.journeys.update_state = ({id, name, updates}) => this._PATCH(`/v1/journey/${id}/state/${name}`, { updates })
    queries.endusers.set_password = ({id, password}) => this._POST(`/v1/set-enduser-password`, { id, password })
    queries.endusers.is_authenticated = ({id, authToken}) => this._GET(`/v1/enduser-is-authenticated`, { id, authToken })
    queries.endusers.generate_auth_token = args => this._GET(`/v1/generate-enduser-auth-token`, args)
    queries.users.display_names = () => this._GET<{}, { fname: string, lname: string, id: string }[]>(`/v1/user-display-names`),
    queries.files.prepare_file_upload = (args) => this._POST(`/v1/prepare-file-upload`, args),
    queries.files.file_download_URL = a => this._GET('/v1/file-download-URL', a),
    queries.chat_rooms.join_room = a => this._POST('/v1/join-chat-room', a),
    queries.chat_rooms.display_info = a => this._GET(`/v1${schema.chat_rooms.customActions.display_info.path}`, a),

    queries.meetings.start_meeting = () => this._POST('/v1/start-meeting')
    queries.meetings.end_meeting = a => this._POST('/v1/end-meeting', a)
    queries.meetings.add_attendees_to_meeting = a => this._POST('/v1/add-attendees-to-meeting', a)
    queries.meetings.attendee_info = a => this._GET('/v1/attendee-info', a)
    queries.meetings.my_meetings = () => this._GET('/v1/my-meetings')

    queries.webhooks.configure = a => this._POST('/v1/configure-webhooks', a)
    queries.webhooks.update = a => this._PATCH('/v1/update-webhooks', a)

    this.api = queries
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

  authenticate = async (email: string, password: string, o?: { expirationInSeconds?: number }) => (
    this.handle_new_session(
      await this.POST<
        {email: string, password: string, expirationInSeconds?: number }, 
        UserSession & { authToken: string }
      >('/submit-login', { email, password, ...o })
    )
  ) 
  logout = async () => {
    this.clearState()
    await this.POST('/logout-api').catch(console.error)
  }

  prepare_and_upload_file = async (details: FileDetails, file: Blob | Buffer | ReactNativeFile) => {
    const { name, size, type } = details
    const { presignedUpload, file: { secureName } } = await this.api.files.prepare_file_upload({ name, size, type })
    await this.UPLOAD(presignedUpload, file)
    return { secureName }
  }

  reset_db = () => this.POST('/reset-demo')
  test_online = () => this.GET<{}, string>('/v1')
  test_authenticated = () => this.GET<{}, string>('/v1/test-authenticated')
}

export { SessionOptions }