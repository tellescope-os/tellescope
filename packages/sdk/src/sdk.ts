import {
  CustomActions,
  schema,
  extractFields,
  PublicActions,
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
import { CustomUpdateOptions, SortOption, S3PresignedPost, UserIdentity, FileDetails, ReactNativeFile, SessionType } from "@tellescope/types-utilities"
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
  forms: defaultQueries(s, 'forms'),
  form_responses: defaultQueries(s, 'form_responses'),
  calendar_events: defaultQueries(s, 'calendar_events'),
  event_automations: defaultQueries(s, 'event_automations'),
  sequence_automations: defaultQueries(s, 'sequence_automations'),
  automation_endusers: defaultQueries(s, 'automation_endusers'),
  webhooks: defaultQueries(s, 'webhooks')
})

type Queries = { [K in keyof ClientModelForName]: APIQuery<K> } & {
  journeys: {
    update_state: (args: extractFields<CustomActions['journeys']['update_state']['parameters']>) => 
                          Promise<extractFields<CustomActions['journeys']['update_state']['returns']>>,
    delete_states: (args: extractFields<CustomActions['journeys']['delete_states']['parameters']>) => 
                          Promise<extractFields<CustomActions['journeys']['delete_states']['returns']>>,
  },
  endusers: {
    set_password: (args: { id: string, password: string }) => Promise<void>,
    is_authenticated: (args: { id?: string, authToken: string }) => Promise<{ isAuthenticated: boolean, enduser: Enduser }>
    generate_auth_token: (args: extractFields<CustomActions['endusers']['generate_auth_token']['parameters']>) => 
                            Promise<extractFields<CustomActions['endusers']['generate_auth_token']['returns']>>,
  },
  users: {
    display_names: () => Promise<{ fname: string, lname: string, id: string }[]>,
    request_password_reset: (args: extractFields<PublicActions['users']['request_password_reset']['parameters']>) => 
                          Promise<extractFields<PublicActions['users']['request_password_reset']['returns']>>,
    reset_password: (args: extractFields<PublicActions['users']['reset_password']['parameters']>) => 
                          Promise<extractFields<PublicActions['users']['reset_password']['returns']>>,
  },
  files: {
    prepare_file_upload: (args: FileDetails) => Promise<{ presignedUpload: S3PresignedPost, file: File }>,
    file_download_URL: (args: extractFields<CustomActions['files']['file_download_URL']['parameters']>) => 
                          Promise<extractFields<CustomActions['files']['file_download_URL']['returns']>>,
  },
  form_responses: {
    submit_form_response: (args: extractFields<CustomActions['form_responses']['submit_form_response']['parameters']>) => (
      Promise<extractFields<CustomActions['form_responses']['submit_form_response']['returns']>>
    ),
    prepare_form_response: (args: extractFields<CustomActions['form_responses']['prepare_form_response']['parameters']>) => (
      Promise<extractFields<CustomActions['form_responses']['prepare_form_response']['returns']>>
    ),
  },
  meetings: {
    start_meeting: (args?: extractFields<CustomActions['meetings']['start_meeting']['parameters']>) => (
      Promise<extractFields<CustomActions['meetings']['start_meeting']['returns']>>
    ),
    end_meeting: (args: { id: string }) => Promise<void>, 
    add_attendees_to_meeting: (args: { id: string, attendees: UserIdentity[] }) => Promise<void>, 
    my_meetings: () => Promise<Meeting[]>,
    attendee_info: (args: { id: string }) => Promise<{ attendee: Attendee, others: UserIdentity[] }>,
    send_invite: (args: extractFields<CustomActions['meetings']['send_invite']['parameters']>) => 
                    Promise<extractFields<CustomActions['meetings']['send_invite']['returns']>>,
  },
  chat_rooms: {
    join_room: (args: { id: string }) => Promise<{ room: ChatRoom }>,
    display_info: (args: extractFields<CustomActions['chat_rooms']['display_info']['parameters']>) => 
                    Promise<extractFields<CustomActions['chat_rooms']['display_info']['returns']>>,
  },
  webhooks: {
    configure: (args: { url: string, secret: string, subscriptions?: WebhookSubscriptionsType }) => Promise<void>,
    update: (args: { url?: string, secret?: string, subscriptionUpdates?: WebhookSubscriptionsType }) => Promise<void>
    send_automation_webhook: (args: extractFields<CustomActions['webhooks']['send_automation_webhook']['parameters']>) => 
      Promise<extractFields<CustomActions['webhooks']['send_automation_webhook']['returns']>>,
    get_configuration: (args: extractFields<CustomActions['webhooks']['get_configuration']['parameters']>) => 
      Promise<extractFields<CustomActions['webhooks']['get_configuration']['returns']>>,
  },
}

export class Session extends SessionManager {
  api: Queries;
  userInfo!: UserSession;
  type: SessionType = 'user';

  constructor(o?: SessionOptions & { userInfo?: UserSession }) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_user", type: 'user' })
    if (o?.userInfo) this.userInfo = o.userInfo

    const queries = loadDefaultQueries(this) as Queries


    queries.journeys.update_state = ({id, name, updates}) => this._PATCH(`/v1/journey/${id}/state/${name}`, { updates })
    queries.journeys.delete_states = ({ id, states }) => this._DELETE(`/v1/journey/${id}/states`, { states })

    queries.endusers.set_password = ({id, password}) => this._POST(`/v1/set-enduser-password`, { id, password })
    queries.endusers.is_authenticated = ({id, authToken}) => this._GET(`/v1/enduser-is-authenticated`, { id, authToken })
    queries.endusers.generate_auth_token = args => this._GET(`/v1/generate-enduser-auth-token`, args)

    queries.users.display_names = () => this._GET<{}, { fname: string, lname: string, id: string }[]>(`/v1/user-display-names`),
    
    queries.users.request_password_reset = (args) => this._POST(`/v1${schema.users.publicActions.request_password_reset.path}`, args),
    queries.users.reset_password = (args) => this._POST(`/v1${schema.users.publicActions.reset_password.path}`, args),

    queries.form_responses.prepare_form_response = (args) => this._POST(`/v1${schema.form_responses.customActions.prepare_form_response.path}`, args),
    queries.form_responses.submit_form_response = (args) => this._PATCH(`/v1${schema.form_responses.customActions.submit_form_response.path}`, args),

    queries.files.prepare_file_upload = (args) => this._POST(`/v1/prepare-file-upload`, args),
    queries.files.file_download_URL = a => this._GET('/v1/file-download-URL', a),
    queries.chat_rooms.join_room = a => this._POST('/v1/join-chat-room', a),
    queries.chat_rooms.display_info = a => this._GET(`/v1${schema.chat_rooms.customActions.display_info.path}`, a),

    queries.meetings.start_meeting = () => this._POST('/v1/start-meeting')
    queries.meetings.end_meeting = a => this._POST('/v1/end-meeting', a)
    queries.meetings.add_attendees_to_meeting = a => this._POST('/v1/add-attendees-to-meeting', a)
    queries.meetings.attendee_info = a => this._GET('/v1/attendee-info', a)
    queries.meetings.my_meetings = () => this._GET('/v1/my-meetings')
    queries.meetings.send_invite = a => this._POST(`/v1${schema.meetings.customActions.send_invite.path}`, a),

    queries.webhooks.configure = a => this._POST('/v1/configure-webhooks', a)
    queries.webhooks.update = a => this._PATCH('/v1/update-webhooks', a)
    queries.webhooks.send_automation_webhook = a => this._POST(`/v1${schema.webhooks.customActions.send_automation_webhook.path}`, a),
    queries.webhooks.get_configuration = a => this._GET(`/v1${schema.webhooks.customActions.get_configuration.path}`, a),

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
    const { name, size, type, enduserId } = details
    const { presignedUpload, file: createdFile } = await this.api.files.prepare_file_upload({ name, size, type, enduserId })
    await this.UPLOAD(presignedUpload, file)
    return createdFile
  }

  reset_db = () => this.POST('/reset-demo')
  test_online = () => this.GET<{}, string>('/v1')
  test_authenticated = () => this.GET<{}, string>('/v1/test-authenticated')
}

export { SessionOptions }