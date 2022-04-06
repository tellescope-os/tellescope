import axios from "axios"
import NodeFormData from "form-data"
import { Socket, io } from 'socket.io-client'

import { 
  ReactNativeFile,
  S3PresignedPost,
} from "@tellescope/types-utilities"
import { 
  ClientModelForName,
} from "@tellescope/types-client"

export const DEFAULT_HOST = 'https://api.tellescope.com'

export interface SessionOptions {
  apiKey?: string;
  authToken?: string;
  host?: string;
  cacheKey?: string;
  expirationInSeconds?: number,
  enableSocketLogging?: boolean,
  handleUnauthenticated?: () => Promise<void>;
}

export const wait = (f?: Promise<void>, ms=1000) => new Promise<void>((resolve, reject) => {
  setTimeout(() => f ? f.then(resolve).catch(reject) : resolve(), ms)
})

interface RequestOptions {
  refresh_session?: () => Promise<any>,
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
const IN_BROWSER = typeof window !== 'undefined' 
const has_local_storage = () => typeof window !== 'undefined' && !!window.localStorage
const set_cache = (key: string, authToken: string) => has_local_storage() && (window.localStorage[key] = authToken)
const access_cache = (key=DEFAULT_AUTHTOKEN_KEY) => has_local_storage() ? window.localStorage[key] : undefined

export const SOCKET_POLLING_DELAY = 200

export class Session {
  host: string;
  authToken: string;
  cacheKey: string;
  apiKey?: string;
  socket?: Socket;
  type?: string
  enableSocketLogging?: boolean;
  handleUnauthenticated?: SessionOptions['handleUnauthenticated']
  expirationInSeconds?: number;
  socketAuthenticated: boolean;
  userInfo: { businessId?: string, id?: string };
  sessionStart = Date.now();
  AUTO_REFRESH_MS = 3600000 // 1hr elapsed

  config: { headers: { Authorization: string }};

  constructor(o={} as SessionOptions & RequestOptions & { type: string }) {
    this.host= o.host ?? DEFAULT_HOST
    this.apiKey = o.apiKey ?? '';
    this.expirationInSeconds = o.expirationInSeconds
    this.socket = undefined as Socket | undefined
    this.socketAuthenticated = false
    this.handleUnauthenticated = o.handleUnauthenticated
    this.enableSocketLogging = o.enableSocketLogging
    this.type = o.type

    this.cacheKey = o.cacheKey || DEFAULT_AUTHTOKEN_KEY

    // keep ?? over || to allow '' argument to avoid access_cache
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
      this.clearState()
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

  UPLOAD = async (presigned: S3PresignedPost, file: Blob | Buffer | ReactNativeFile) => {
    const formData = new NodeFormData();
    Object.keys(presigned.fields).forEach(key => {
      formData.append(key, presigned.fields[key as keyof S3PresignedPost['fields']]);
    });
    formData.append("file", file) // must be appended last

    const headers = formData.getHeaders ? { ...formData.getHeaders(), 'Content-Length' : (formData as any).maxDataSize  }
                  : { 'Content-Type': 'multipart/form-data' }

    await axios.post(presigned.url, formData,  { headers })
  }

  DOWNLOAD = async (downloadURL: string) => { 
    const content = await axios.get(downloadURL)
    return content.data
  }

  EMIT = async (route: string, args: object, authenticated=true, options={} as RequestOptions) => {
    if (!this.socket) {
      if (this.enableSocketLogging) { 
        console.log('attempted emit with !this.socket')
      }

      this.authenticate_socket() // sets namespace correctly
    }

    // @ts-ignore
    console.log(this.socket.nsp)

    this.socket?.emit(route, { ...args, ...authenticated ? { authToken: this.authToken } : {} } )
  }

  ON = <T={}>(s: string, callback: (a: T) => void) => this.socket?.on(s, callback)

  subscribe = (rooms: { [index: string]: keyof ClientModelForName }, handlers?: { [index: string]: (a: any) => void } ) => {
    if (this.enableSocketLogging) {
      console.log(`${this.type} ${this.userInfo.id} subscribing ${JSON.stringify(rooms)}, socket defined: ${!!this.socket}`)
    }

    if (!this.socket) {
      this.initialize_socket()
    }

    if (handlers) { 
      this.handle_events(handlers) 
    }
    
    this.EMIT(`join-rooms`, { rooms })
    .then(() => {
      if (this.enableSocketLogging) {
        console.log(`${this.type} ${this.userInfo.id} emitted ${JSON.stringify(rooms)}`)
      }
    })
    .catch(console.error)
  }

  handle_events = ( handlers: { [index: string]: (a: any) => void } ) => {
    for (const handler in handlers) this.ON(handler, handlers[handler])
  } 

  unsubscribe = (roomIds: string[]) => this.EMIT('leave-rooms', { roomIds })
  removeAllSocketListeners = (s: string) => this.socket?.removeAllListeners(s)

  socket_log = (message: string) => {
    console.log(`${this.type} ${this.userInfo.id} got socket message: ${message}`)
  }
  initialize_socket = () => {
    if (!this.userInfo?.businessId) {
      console.error("Attempting to initialize_socket without businessId set")
      return 
    }
    this.socket = io(`${this.host}/${this.userInfo.businessId}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
  }
  authenticate_socket = () => { 
    this.initialize_socket()
    if (!this.socket) return

    this.socket.on('disconnect', () => { 
      this.socketAuthenticated = false 
      if (this.enableSocketLogging) { this.socket_log("disconnect") }
    })
    this.socket.on('authenticated', () => { 
      this.socketAuthenticated = true 
      if (this.enableSocketLogging) { this.socket_log("authenticated") }
    })
    this.socket.on('joined-rooms', value => {
      this.socket_log(value)
    })

    this.socket.emit('authenticate', this.authToken)
  }

  connectSocket = async () => {
    let loopCount = 0
    await wait(undefined, SOCKET_POLLING_DELAY)
  
    while (!(this.socketAuthenticated && this.socketAuthenticated) && ++loopCount < 10) {
      this.authenticate_socket()
      await wait(undefined, SOCKET_POLLING_DELAY)
    }
    
    if (loopCount === 10) {
      console.log("Failed to authenticate after 10 attempts")
      process.exit(1)
    }
  
    if (this.enableSocketLogging) {
      console.log(`Authenticated ${this.type} ${this.userInfo.id} after ${loopCount} reconnection attempts`)
    }
  }
}