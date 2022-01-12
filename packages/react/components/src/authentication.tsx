import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import {
  Enduser,
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
  WithUserState,
} from "./user_state"
import {
  WithEnduserState,
} from "./enduser_state"

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
  setSession: React.Dispatch<React.SetStateAction<Session>>
}
export const SessionContext = createContext({} as SessionContext_T)
export const WithSession = (p : { children: React.ReactNode, sessionOptions?: UserSessionOptions }) => {
  const [session, setSession] = useState(() => new Session(p.sessionOptions))

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {p.children}
    </SessionContext.Provider>
  )
}

interface EnduserSessionContext_T {
  enduserSession: EnduserSession,
  setEnduserSession: React.Dispatch<React.SetStateAction<EnduserSession>>
}
export const EnduserSessionContext = createContext({} as EnduserSessionContext_T)
export const WithEnduserSession = (p : { children: React.ReactNode, sessionOptions?: EnduserSessionOptions }) => {
  const [enduserSession, setEnduserSession] = useState(() => new EnduserSession(p.sessionOptions))

  return (
    <EnduserSessionContext.Provider value={{ enduserSession, setEnduserSession }}>
      {p.children}
    </EnduserSessionContext.Provider>
  )
}

export const UserProvider = (props: { children: React.ReactNode }) => (
  <WithUserState>
      {props.children}
  </WithUserState>
)

export const EnduserProvider = (props: { children: React.ReactNode }) => (
  <WithEnduserState>
      {props.children}
  </WithEnduserState>
)

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

interface LoginData {
  email: string;
  password: string,
}
export const LoginForm = ({ onSubmit, style }: { onSubmit: (d: LoginData) => Promise<void> } & Styled) => (
  <FormBuilder<{ email: string, password: string }>
    style={style}
    fields={{
      email: emailInput({ id: 'email' }),
      password: passwordInput({ id: 'password' }),
    }}
    submitText="Login"
    submittingText="Logging in"
    onSubmit={onSubmit}
  />
)

interface LoginHandler <S extends { authToken: string }> {
  onLogin?: (sessionInfo: S) => void;
}

export const UserLogin = ({ onLogin, style }: LoginHandler<UserSessionModel & { authToken: string }> & Styled) => {
  const { session, setSession } = useContext(SessionContext)
  if (!(session && setSession)) throw new Error("UserLogin used outside of WithSession")

  return (
    <LoginForm style={style} onSubmit={async ({ email, password }) => {
      const { authToken, ...userInfo } = await session.authenticate(email, password)
      setSession?.(s => new Session({ host: s.host, authToken, userInfo: userInfo  }))
      onLogin?.({ authToken, ...userInfo })
    }}/>
  )
}

export const EnduserLogin = ({ onLogin }: LoginHandler<Enduser & { authToken: string }>) => {
  const { enduserSession, setEnduserSession } = useContext(EnduserSessionContext)
  if (!(enduserSession && setEnduserSession)) throw new Error("EnduserLogin used outside of WithEnduserSession")

  return (
    <LoginForm onSubmit={async ({ email, password }) => {
      const { authToken, enduser } = await enduserSession.authenticate(email, password)
      setEnduserSession?.(s => new EnduserSession({ host: s.host , authToken, enduser }))
      onLogin?.({ authToken, ...enduser })
    }}/>
  )
}

export const Logout = ({ onLogout, children } : { 
  children?: React.ReactNode, 
  onLogout?: () => void 
}) => {
  const { session, setSession } = useContext(SessionContext) ?? {}
  const { enduserSession, setEnduserSession } = useContext(EnduserSessionContext) ?? {}
  const loggedOut = useRef(false)


  useEffect(() => {
    if (loggedOut.current) return
    loggedOut.current = true

    const s = (session ?? enduserSession) as Session | EnduserSession
    if (!s) throw new Error("Missing SessionContext and EnduserSessionContext")
    
    s.logout()
    .finally(() => {
      if (session) { setSession(s => ({ ...s, authToken: '', userInfo: {} as any })) }
      else { setEnduserSession(s => ({ ...s, authToken: '', userInfo: {} as Enduser })) }
      onLogout?.()
    })
  }, [session, enduserSession, setSession, setEnduserSession, loggedOut])

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
