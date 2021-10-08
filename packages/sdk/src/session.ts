import "@tellescope/types"

import axios from "axios"
import { io, Socket } from 'socket.io-client'

export interface SessionOptions {
  apiKey?: string;
  authToken?: string;
  host?: string;
}

export const Session = (o={} as SessionOptions) => {
  let host= o.host ?? 'https://api.tellescope.com'
  let authToken = o.authToken ?? '';
  let userInfo = {} as ClientUserSession
  let apiKey = o.apiKey ?? '';
  let socket = undefined as Socket | undefined
  let socketAuthenticated = false

  const setUserInfo  = (s: ClientUserSession) => userInfo = s
  const setAuthToken = (a: string) => authToken = a
  // const setApiKey    = (k: string) => apiKey = k
  
  const get_authInfo = () => authToken ? { authToken } : { apiKey }
  const get_userInfo = () => userInfo

  const parseError = (err: any) => {
    if (err.response?.status === 413) return "Please try again with less data or a smaller file."
    if (err.response?.status === 500) return "Something went wrong on our end, and our team has been notified. Please try again later."
    if (err.response) return err.response.data
    if (err.request)  return "No response - please check your Internet connection and try again"
    if (err.message)  return err.message
    return err
  }

  const POST = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    try {
      return (await axios.post(host + endpoint, { ...args, ...authenticated ? get_authInfo() : {}  })).data as R
    } catch(err) { throw parseError(err) }
  }

  const GET = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    try {
      return (await axios.get(host + endpoint, { params: { ...params, ...authenticated ? get_authInfo() : {}  } })).data as R
    } catch(err) { throw parseError(err) }
  }

  const PATCH = async <A,R=void>(endpoint: string, params?: A, authenticated=true) => {
    try {
      return (await axios.patch(host + endpoint, { ...params, ...authenticated ? get_authInfo() : {}  } )).data as R
    } catch(err) { throw parseError(err) }
  }

  const DELETE = async <A,R=void>(endpoint: string, args?: A, authenticated=true) => {
    try {
      return (await axios.delete(host + endpoint, { data: { ...args, ...authenticated ? get_authInfo() : {}  } })).data as R
    } catch(err) { throw parseError(err) }
  }

  const EMIT = async (route: string, args: object, authenticated=true) => {
    socket?.emit(route, { ...args, ...authenticated ? get_authInfo() : {}  } )
  }

  const ON = <T={}>(s: string, callback: (a: T) => void) => socket?.on(s, callback)

  const handle_new_session = async ({ authToken, ...userInfo }: ClientUserSession & { authToken: string }) => {
    setAuthToken(authToken)
    setUserInfo(userInfo)

    socket = io(`${host}/${userInfo.organization}`, { transports: ['websocket'] }); // supporting polling requires sticky session at load balancer
    socket.on('disconnect', () => { socketAuthenticated = false })
    socket.on('authenticated', () => { socketAuthenticated = true })

    socket.emit('authenticate', authToken)

    return userInfo
  }

  const refresh_session = async () => {
    const { userInfo, authToken } = await GET<{}, { userInfo: ClientUserSession } & { authToken: string }>('/refresh-session')
    await handle_new_session({ ...userInfo, authToken })
  }

  const authenticate = async (email: string, password: string, url?: string) => {
    if (url) host = url

    return handle_new_session(
      await POST<{email: string, password: string }, ClientUserSession & { authToken: string }>('/submit-login', { email, password })
    ) 
  }

  const socket_is_authenticated = () => socketAuthenticated

  const authenticate_socket = () => !!socket?.emit('authenticate', authToken)
  

  return { 
    authenticate, refresh_session, authenticate_socket, socket_is_authenticated, get_authInfo, get_userInfo,
    EMIT, ON,
    POST, GET, PATCH, DELETE
  }
}
