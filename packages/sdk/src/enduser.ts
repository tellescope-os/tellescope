import { io } from 'socket.io-client'

import { Session, SessionOptions } from "./session"
import { APIQuery } from "./sdk"
import { url_safe_path } from "@tellescope/utilities"

import { FileDetails, ReactNativeFile, S3PresignedPost, SessionType, UserIdentity } from "@tellescope/types-utilities"
import { 
  Attendee,
} from "@tellescope/types-models"
import {
  ClientModelForName,
  ClientModelForName_required,
  Enduser,
  File,
  Meeting,
  UserDisplayInfo,
} from "@tellescope/types-client"
import { schema, CustomActions, extractFields, PublicActions } from '@tellescope/schema'

export interface EnduserSessionOptions extends SessionOptions { enduser?: Enduser, businessId: string }

type EnduserAccessibleModels = 'endusers' | 'form_responses' | "chat_rooms" | 'chats' | 'files' | 'tickets' | 'calendar_events' | 'engagement_events'

export const defaultQueries = <N extends keyof ClientModelForName>(
  s: EnduserSession, n: keyof ClientModelForName_required
): APIQuery<N> => {

  const safeName = url_safe_path(n)
  const singularName = (safeName).substring(0, safeName.length - 1)

  return {
    createOne: o => s._POST(`/v1/${singularName}`, o),
    createSome: os => s._POST(`/v1/${safeName}`, { create: os }),
    getOne: (argument) => typeof argument === 'string' ? s._GET(`/v1/${singularName}/${argument}`)
                                                       : s._GET(`/v1/${singularName}`, { filter: argument}),
    getSome: o => s._GET(`/v1/${safeName}`, o),
    updateOne: (id, updates, options) => s._PATCH(`/v1/${singularName}/${id}`, { updates, options }),
    deleteOne: id => s._DELETE(`/v1/${singularName}/${id}`),
  }
}

type EnduserQueries = { [K in EnduserAccessibleModels]: APIQuery<K> } & {
  endusers: {
    logout: () => Promise<void>;
    current_session_info: () => Promise<extractFields<CustomActions['endusers']['current_session_info']['returns']>>,
  },
  users: {
    display_info: () => Promise<UserDisplayInfo[]>
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
    attendee_info: (args: { id: string }) => Promise<{ attendee: Attendee, others: UserIdentity[] }>,
    my_meetings: () => Promise<Meeting[]>,
  },
  chat_rooms: {
    display_info: (args: extractFields<CustomActions['chat_rooms']['display_info']['parameters']>) => 
                    Promise<extractFields<CustomActions['chat_rooms']['display_info']['returns']>>,
  }
}


const loadDefaultQueries = (s: EnduserSession): { [K in EnduserAccessibleModels] : APIQuery<K> } => ({
  chat_rooms: defaultQueries(s, 'chat_rooms'),
  chats: defaultQueries(s, 'chats'),
  endusers: defaultQueries(s, 'endusers'),
  calendar_events: defaultQueries(s, 'calendar_events'),
  engagement_events: defaultQueries(s, 'engagement_events'),
  files: defaultQueries(s, 'files'),
  tickets: defaultQueries(s, 'tickets'),
  form_responses: defaultQueries(s, 'form_responses'),
})


export class EnduserSession extends Session {
  userInfo!: Enduser; 
  api: EnduserQueries;
  businessId: string;
  type: SessionType = 'enduser';

  constructor(o: EnduserSessionOptions) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_enduser", type: 'enduser' })
    if (o?.enduser) this.userInfo = o.enduser
    
    this.businessId = o?.businessId

    this.api = loadDefaultQueries(this) as EnduserQueries 
    this.api.chat_rooms.display_info = a => this._GET(`/v1${schema.chat_rooms.customActions.display_info.path}`, a)

    this.api.endusers.logout = () => this._POST('/v1/logout-enduser')
    this.api.endusers.current_session_info = () => this._GET(`/v1${schema.endusers.customActions.current_session_info.path}`)

    this.api.users = { 
      display_info: () => this._GET<{}, UserDisplayInfo[] >(`/v1/user-display-info`),
    }
    this.api.meetings = { 
      attendee_info: a => this._GET('/v1/attendee-info', a),
      my_meetings: () => this._GET('/v1/my-meetings')
    }

    this.api.form_responses.prepare_form_response = args => this._POST(`/v1${schema.form_responses.customActions.prepare_form_response.path}`, args)
    this.api.form_responses.submit_form_response  = args => this._PATCH(`/v1${schema.form_responses.customActions.submit_form_response.path}`, args)

    // files have defaultQueries
    this.api.files.prepare_file_upload = a => this._POST(`/v1/prepare-file-upload`, a)
    this.api.files.file_download_URL = a => this._GET('/v1/file-download-URL', a)

    // if (this.authToken) this.refresh_session()
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

  prepare_and_upload_file = async (details: FileDetails, file: Blob | Buffer | ReactNativeFile) => {
    const { name, size, type, enduserId } = details
    const { presignedUpload, file: createdFile } = await this.api.files.prepare_file_upload({ name, size, type, enduserId })
    await this.UPLOAD(presignedUpload, file)
    return createdFile
  }

  handle_new_session = async ({ authToken, enduser }: { authToken: string, enduser: Enduser }) => {
    this.sessionStart = Date.now()
    this.setAuthToken(authToken)
    this.setUserInfo(enduser)

    this.socket = io(`${this.host}/${enduser.businessId}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    this.socket.on('disconnect', () => { this.socketAuthenticated = false })
    this.socket.on('authenticated', () => { this.socketAuthenticated = true })

    this.socket.emit('authenticate', authToken)

    return { authToken, enduser }
  }

  authenticate = async (email: string, password: string, o?: { durationInSeconds?: number }) => this.handle_new_session(
    await this.POST<
      { email: string, password: string, businessId: string, durationInSeconds?: number }, 
      { authToken: string, enduser: Enduser }
    >('/v1/login-enduser', { email, password, businessId: this.businessId, ...o })
  )

  register = async (args: extractFields<PublicActions['endusers']['register']['parameters']>) => (
    this.POST<typeof args & { businessId: string }, Promise<extractFields<PublicActions['endusers']['register']['returns']>>>(
      `/v1${schema.endusers.publicActions.register.path}`, { ...args, businessId: this.businessId }
    )
  )

  refresh_session = async () => {
    const { enduser, authToken } = await this.POST<{}, { enduser: Enduser } & { authToken: string }>('/v1/refresh-enduser-session')
    return this.handle_new_session({ authToken, enduser })
  }

  refresh_session_if_expiring_soon = async () => {
    const elapsedSessionMS =  Date.now() - (this.sessionStart || Date.now())
    
    if (this.AUTO_REFRESH_MS < elapsedSessionMS) { 
      return await this.refresh_session()
    }
  }

  logout = () => {
    this.clearState()
    return this.api.endusers.logout()
  }
}