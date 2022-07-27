import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import {
  Enduser, User,
} from "@tellescope/types-client"
import {
  SessionType,
  UserSession as UserSessionModel,
} from "@tellescope/types-models"
import {
  Session,
  SessionOptions,
  EnduserSession,
  EnduserSessionOptions,
} from "@tellescope/sdk"

import {
  emailInput,
  passwordInput,
  FormBuilder,
} from "./forms"
import {
  Styled,
} from "./mui"

type UserSession = Session
type UserSessionOptions = SessionOptions

export interface WithAnySession {
  session: UserSession | EnduserSession
}

interface SessionContext_T {
  session: UserSession,
  logout: () => Promise<void>,
  // setSession: React.Dispatch<React.SetStateAction<Session>>
  updateUserInfo: (updates: Parameters<Session['api']['users']['updateOne']>[1]) => Promise<void>,
  updateLocalSessionInfo: (u: Partial<User>, authToken?: string) => void
}
export const SessionContext = createContext({} as SessionContext_T)
export const WithSession = (p : { children: React.ReactNode, sessionOptions?: UserSessionOptions }) => {
  const [session, setSession] = useState(() => new Session(p.sessionOptions))

  const logout = () => {
    setSession(s => new Session(p.sessionOptions))
    return session.logout()
  }

  const updateLocalSessionInfo: SessionContext_T['updateLocalSessionInfo'] = (u, a) => setSession(s => new Session({ 
    ...s,
    handleUnauthenticated: s.handleUnauthenticated,
    host: s.host, apiKey: s.apiKey, authToken: a ?? s.authToken,  // preserve other important info
    userInfo: { ...s.userInfo, ...u }
  }))


  const updateUserInfo: SessionContext_T['updateUserInfo'] = async updates => {
    await session.api.users.updateOne(session.userInfo.id, updates)
    const { authToken, user } = await session.refresh_session()
    updateLocalSessionInfo(user, authToken)
  }

  return (
    <SessionContext.Provider value={{ 
      session, //setSession,
      logout,
      updateUserInfo,
      updateLocalSessionInfo,
    }}>
      {p.children}
    </SessionContext.Provider>
  )
}
export const useSessionContext = () => useContext(SessionContext)

interface EnduserSessionContext_T {
  enduserSession: EnduserSession,
  logout: () => Promise<void>,
  // setEnduserSession: React.Dispatch<React.SetStateAction<EnduserSession>>
  updateUserInfo: (updates: Parameters<EnduserSession['api']['endusers']['updateOne']>[1]) => Promise<void>,
  updateLocalSessionInfo: (u: Partial<Enduser>, authToken?: string) => void
}
export const EnduserSessionContext = createContext({} as EnduserSessionContext_T)
export const WithEnduserSession = (p : { children: React.ReactNode, sessionOptions: EnduserSessionOptions }) => {
  const [enduserSession, setEnduserSession] = useState(() => new EnduserSession(p.sessionOptions))

  const logout = () => {
    setEnduserSession(s => new EnduserSession(p.sessionOptions))
    return enduserSession.logout()
  }

  const updateLocalSessionInfo: EnduserSessionContext_T['updateLocalSessionInfo'] = (u, a) => {
    setEnduserSession(s => new EnduserSession({ 
      ...s,
      handleUnauthenticated: s.handleUnauthenticated,
      host: s.host, apiKey: s.apiKey, authToken: a ?? s.authToken, // preserve other important info
      businessId: u.businessId ?? s.businessId,
      enduser: { ...s.userInfo, ...u } 
    }))
  }

  const updateUserInfo: EnduserSessionContext_T['updateUserInfo'] = async updates => {
    await enduserSession.api.endusers.updateOne(enduserSession.userInfo.id, updates)
    const { enduser, authToken } = await enduserSession.refresh_session()
    updateLocalSessionInfo(enduser, authToken)
  }

  return (
    <EnduserSessionContext.Provider value={{ 
      enduserSession, 
      logout,
      updateUserInfo,
      updateLocalSessionInfo,
    }}>
      {p.children}
    </EnduserSessionContext.Provider>
  )
}
export const useEnduserSessionContext = () => useContext(EnduserSessionContext)

interface SessionHookOptions {
  throwIfMissingContext?: boolean,
}
export const useSession = (o={} as SessionHookOptions) => {
  const { session } = useContext(SessionContext)
  if (!session && o.throwIfMissingContext !== false) { 
    throw new Error("useSession used outside of WithSession") 
  }

  return session ?? null
}
export const useEnduserSession = (o={} as SessionHookOptions): EnduserSession => {
  const { enduserSession } = useContext(EnduserSessionContext)
  if (!enduserSession && o.throwIfMissingContext !== false) { 
    throw new Error("useEnduserSession used outside of WithEnduserSession") 
  }

  return enduserSession ?? null
}

interface AccountFill {
  fillEmail?: string;
  fillPassword?: string,
}

interface LoginData {
  email: string;
  password: string,
}
export const LoginForm = ({ onSubmit, style, fillEmail, fillPassword } : AccountFill & { onSubmit: (d: LoginData) => Promise<void> } & Styled) => (
  <FormBuilder<{ email: string, password: string }>
    disabledIfUnchanged={false}
    style={style}
    fields={{
      email: emailInput({ id: 'email', initialValue: fillEmail }),
      password: passwordInput({ id: 'password', initialValue: fillPassword }),
    }}
    submitText="Login"
    submittingText="Logging in"
    onSubmit={onSubmit}
  />
)

interface LoginHandler <S extends { authToken: string }> {
  onLogin?: (sessionInfo: S) => void;
}

export const UserLogin = ({ onLogin, ...props }: AccountFill & LoginHandler<UserSessionModel & { authToken: string }> & Styled) => {
  const { session, updateLocalSessionInfo } = useContext(SessionContext)
  if (!(session && updateLocalSessionInfo)) throw new Error("UserLogin used outside of WithSession")

  return (
    <LoginForm {...props} onSubmit={async ({ email, password }) => {
      const { authToken, ...userInfo } = await session.authenticate(email, password)
      updateLocalSessionInfo?.(userInfo, authToken)
      onLogin?.({ authToken, ...userInfo })
    }}/>
  )
}

export const EnduserLogin = ({ onLogin, ...props }: AccountFill & Styled & LoginHandler<Enduser & { authToken: string }>) => {
  const { enduserSession, updateLocalSessionInfo } = useContext(EnduserSessionContext)
  if (!(enduserSession && updateLocalSessionInfo)) throw new Error("EnduserLogin used outside of WithEnduserSession")

  return (
    <LoginForm {...props} onSubmit={async ({ email, password }) => {
      const { authToken, enduser } = await enduserSession.authenticate(email, password)
      updateLocalSessionInfo?.(enduser, authToken)
      onLogin?.({ authToken, ...enduser })
    }}/>
  )
}

export const Logout = ({ onLogout, children } : { 
  children?: React.ReactNode, 
  onLogout?: () => void 
}) => {
  const { session, updateLocalSessionInfo, logout: logoutUser } = useContext(SessionContext) ?? {}
  const { enduserSession, updateLocalSessionInfo: updateLocalEnduserSessionInfo, logout: logoutEnduser } = useContext(EnduserSessionContext) ?? {}
  const loggedOut = useRef(false)

  useEffect(() => {
    if (loggedOut.current) return
    loggedOut.current = true

    const s = (session ?? enduserSession) as Session | EnduserSession
    if (!s) throw new Error("Missing SessionContext and EnduserSessionContext")
    
    s.logout()
    .finally(() => {
      if (session) { logoutUser().catch(console.error) }
      else { logoutEnduser().catch(console.error) }
      onLogout?.()
    })
  }, [session, enduserSession, updateLocalSessionInfo, updateLocalEnduserSessionInfo, loggedOut])

  return <>{children}</>
}

export const useResolvedSession = (type?: SessionType) => {
  const u_session = useSession({ throwIfMissingContext: type === 'user' })
  const e_session = useEnduserSession({ throwIfMissingContext: type === 'enduser' })

  if (u_session === null && e_session === null) {
    throw new Error("Could not resolve session for user or enduser. Ensure you are using the proper WithSession or WithEnduserSession provider.")
  }

  return (
      type === 'user' ? u_session 
    : type === 'enduser' ? e_session
    : (u_session ?? e_session)
  )
}
