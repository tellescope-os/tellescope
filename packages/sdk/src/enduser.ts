import { io } from 'socket.io-client'

import { Session, SessionOptions, APIQuery } from "./session"
import { url_safe_path } from "@tellescope/utilities"

import { S3PresignedPost } from "@tellescope/types-utilities"
import {
  ClientModelForName,
  ClientModelForName_required,
  Enduser,
  File,
} from "@tellescope/types-client"
import { stringValidator } from "@tellescope/validation";

export interface EnduserSessionOptions extends SessionOptions {}

type EnduserAccessibleModels = "chat_rooms" | 'chats' | 'files'

export const defaultQueries = <N extends keyof ClientModelForName>(
  s: EnduserSession, n: keyof ClientModelForName_required
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

type EnduserQueries = { [K in EnduserAccessibleModels]: APIQuery<K> } & {
  endusers: {
    logout: () => Promise<void>;
  },
  users: {
    display_names: () => Promise<{ fname: string, lname: string, id: string }[]>
  },
  files: {
    prepare_file_upload: (args: { name: string, size: number, type: string }) => Promise<{ presignedUpload: S3PresignedPost, file: File }>,
    file_download_URL: (args: { secureName: string }) => Promise<{ downloadURL: string }>,
  },
}


const loadDefaultQueries = (s: EnduserSession): { [K in EnduserAccessibleModels] : APIQuery<K> } => ({
  chat_rooms: defaultQueries(s, 'chat_rooms'),
  chats: defaultQueries(s, 'chats'),
  files: defaultQueries(s, 'files'),
})


export class EnduserSession extends Session {
  userInfo!: Enduser; 
  api: EnduserQueries;

  constructor(o?: EnduserSessionOptions) {
    super({ ...o, cacheKey: o?.cacheKey || "tellescope_enduser" })
    
    this.api = loadDefaultQueries(this) as EnduserQueries 

    this.api.endusers = {
      logout: () => this._POST('/v1/logout-enduser'),
    }
    this.api.users = { 
      display_names: () => this._GET<{}, { fname: string, lname: string, id: string }[] >(`/v1/user-display-names`),
    }

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

  authenticate = async (email: string, password: string) => this.handle_new_session(
    await this.POST<{email: string, password: string }, { authToken: string, enduser: Enduser }>('/v1/login-enduser', { email, password })
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

  logout = async () => {
    this.clearState()
    await this.api.endusers.logout().catch(console.error)
  }
}