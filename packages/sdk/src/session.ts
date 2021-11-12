import axios from "axios"
import { Socket, io } from 'socket.io-client'

import {  } from "@tellescope/types-models"
import { ClientModelForName_required, ClientModelForName_readonly, ClientModelForName_updatesDisabled } from "@tellescope/types-client"
import { url_safe_path } from "@tellescope/utilities"

export const DEFAULT_HOST = 'https://api.tellescope.com'

export interface SessionOptions {
  apiKey?: string;
  authToken?: string;
  host?: string;
  cacheKey?: string;
  handleUnauthenticated?: () => Promise<void>;
}

export type Filter<T> = { [K in keyof T]: T[K] }

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
  s: Session, n: keyof ClientModelForName_required
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

const generateBearer = (authToken: string) => `Bearer ${authToken}`

const parseError = (err: any) => {
  if (err.response?.status === 413) return "Please try again with less data or a smaller file."
  if (err.response?.status === 500) return "Something went wrong on our end, and our team has been notified. Please try again later."
  if (err.response) return err.response.data
  if (err.request)  return "No response - please check your Internet connection and try again"
  if (err.message)  return err.message
  return err
}

const DEFAULT_AUTHTOKEN_KEY = 'tellescope_authToken'
const has_local_storage = () => typeof window !== 'undefined' && !!window.localStorage
const set_cache = (key: string, authToken: string) => has_local_storage() && (window.localStorage[key] = authToken)
const access_cache = (key=DEFAULT_AUTHTOKEN_KEY) => has_local_storage() ? window.localStorage[key] : undefined

export class Session {
  host: string;
  authToken: string;
  cacheKey: string;
  apiKey?: string;
  socket?: Socket;
  handleUnauthenticated?: SessionOptions['handleUnauthenticated']
  socketAuthenticated: boolean;
  userInfo: { businessId?: string };

  config: { headers: { Authorization: string }};

  constructor(o={} as SessionOptions) {
    this.host= o.host ?? DEFAULT_HOST
    this.apiKey = o.apiKey ?? '';
    this.socket = undefined as Socket | undefined
    this.socketAuthenticated = false
    this.handleUnauthenticated = o.handleUnauthenticated

    this.cacheKey = o.cacheKey || DEFAULT_AUTHTOKEN_KEY
    this.authToken = o.authToken ?? access_cache(o.cacheKey) ?? '';
    this.userInfo = JSON.parse(access_cache(o.cacheKey + 'userInfo') || '{}');
    if (this.authToken) { 
      set_cache(this.cacheKey, this.authToken)
      this.authenticate_socket()
    }
    this.config = { headers: { Authorization: generateBearer(this.authToken ?? '') } } // initialize after authToken
  }
  
  resolve_field = async <T>(p: () => Promise<T>, field: keyof T) => (await p())[field]

  setAuthToken = (a: string) => { 
    this.authToken = a; 
    this.config.headers.Authorization = generateBearer(a);
    set_cache(this.cacheKey, a)
  }

  setUserInfo = (u: { businessId: string }) => { 
    this.userInfo = u; 
    set_cache(this.cacheKey + 'userInfo', JSON.stringify(u))
  }
  
  clearCache = () => {
    set_cache(this.cacheKey, '')
    set_cache(this.cacheKey + 'userInfo', '')
  }

  clearState = () => {
    this.apiKey = ''
    this.authToken = ''
    this.userInfo = { }
    this.clearCache()
  }

  getAuthInfo = (requiresAuth?: boolean) => requiresAuth && this.apiKey ? { apiKey: this.apiKey } : { }
  
  errorHandler = async (_err: any) => {
    const err = parseError(_err)
    if (err === 'Unauthenticated') {
      this.authToken = ''
      this.clearCache()
      await this.handleUnauthenticated?.()
    }

    return err
  }

  POST = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    try {
      return (await axios.post(
        this.host + endpoint, 
        { ...args, ...this.getAuthInfo(authenticated) }, 
        this.config)
      ).data as R
    } catch(err) { throw await this.errorHandler(err) }
  }

  GET = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    try {
      return (await axios.get(
        this.host + endpoint, 
        { params: { ...params, ...this.getAuthInfo(authenticated)  }, 
        headers: this.config.headers })
      ).data as R
    } catch(err) { throw await this.errorHandler(err) }
  }

  PATCH = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    try {
      return (await axios.patch(
        this.host + endpoint, 
        { ...params, ...this.getAuthInfo(authenticated)  }, 
        this.config)
      ).data as R
    } catch(err) { throw await this.errorHandler(err) }
  }

  DELETE = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    try {
      return (await axios.delete(
        this.host + endpoint, 
        { data: { ...args, ...this.getAuthInfo(authenticated)  }, 
        headers: this.config.headers })
      ).data as R
    } catch(err) { throw await this.errorHandler(err) }
  }

  EMIT = async (route: string, args: object, authenticated=true) => {
    this.socket?.emit(route, { ...args, ...authenticated ? { authToken: this.authToken } : {} } )
  }

  ON = <T={}>(s: string, callback: (a: T) => void) => this.socket?.on(s, callback)

  subscribe = (rooms: { [index: string]: keyof ClientModelForName }, handlers?: { [index: string]: (a: any) => void } ) => {
    if (handlers) { this.handle_events(handlers) }
    this.EMIT('join-rooms', { rooms })
  }

  handle_events = ( handlers: { [index: string]: (a: any) => void } ) => {
    for (const handler in handlers) this.ON(handler, handlers[handler])
  } 

  unsubscribe = (roomIds: string[]) => this.EMIT('leave-rooms', { roomIds })
  removeAllSocketListeners = (s: string) => this.socket?.removeAllListeners(s)

  authenticate_socket = () => {
    this.socket = io(`${this.host}/${this.userInfo.businessId}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    this.socket.on('disconnect', () => { this.socketAuthenticated = false })
    this.socket.on('authenticated', () => { this.socketAuthenticated = true })

    this.socket.emit('authenticate', this.authToken)
  }
}