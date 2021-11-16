import React, { createContext, useContext, useEffect, useState } from "react";

import {
  Enduser,
} from "@tellescope/types-client"
import {
  UserSession as UserSessionModel,
} from "@tellescope/types-models"
import {
  WithUserState,
} from "./user_state"
import {
  WithEnduserState,
} from "./enduser_state"

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


type UserSession = Session
type UserSessionOptions = SessionOptions

interface SessionContext_T {
  session: UserSession,
  setSession: (s: UserSession) => void;
}
export const SessionContext = createContext({} as SessionContext_T)
export const WithSession = (p : { children: React.ReactNode, sessionOptions?: UserSessionOptions }) => {
  const [session, setSession] = useState(new Session(p.sessionOptions))

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {p.children}
    </SessionContext.Provider>
  )
}

interface EnduserSessionContext_T {
  enduserSession: EnduserSession,
  setEnduserSession: (s: EnduserSession) => void;
}
export const EnduserSessionContext = createContext({} as EnduserSessionContext_T)
export const WithEnduserSession = (p : { children: React.ReactNode, sessionOptions?: EnduserSessionOptions }) => {
  const [enduserSession, setEnduserSession] = useState(new EnduserSession(p.sessionOptions))

  return (
    <EnduserSessionContext.Provider value={{ enduserSession, setEnduserSession }}>
      {p.children}
    </EnduserSessionContext.Provider>
  )
}

export const UserProvider = (props: { sessionOptions?: SessionOptions, children: React.ReactNode }) => (
  <WithUserState sessionOptions={props.sessionOptions}>
      {props.children}
  </WithUserState>
)

export const EnduserProvider = (props: { sessionOptions?: SessionOptions, children: React.ReactNode }) => (
  <WithEnduserState sessionOptions={props.sessionOptions}>
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

  return session ?? {}
}
export const useEnduserSession = (o={} as SessionHookOptions): EnduserSession => {
  const { enduserSession } = useContext(EnduserSessionContext)
  if (!enduserSession && o.throwIfMissingContext !== false) { 
    throw new Error("useEnduserSession used outside of WithEnduserSession") 
  }

  return enduserSession ?? {}
}

interface LoginData {
  email: string;
  password: string,
}
export const LoginForm = ({ onSubmit }: { onSubmit: (d: LoginData) => Promise<void> }) => (
  <FormBuilder<{ email: string, password: string }>
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

export const UserLogin = ({ onLogin }: LoginHandler<UserSessionModel & { authToken: string }>) => {
  const { session, setSession } = useContext(SessionContext)
  if (!(session && setSession)) throw new Error("UserLogin used outside of WithSession")

  return (
    <LoginForm onSubmit={async ({ email, password }) => {
      const result = await session.authenticate(email, password)
      setSession?.({ ...session })
      onLogin?.(result)
    }}/>
  )
}

export const EnduserLogin = ({ onLogin }: LoginHandler<Enduser & { authToken: string }>) => {
  const { enduserSession, setEnduserSession } = useContext(EnduserSessionContext)
  if (!(enduserSession && setEnduserSession)) throw new Error("EnduserLogin used outside of WithEnduserSession")

  return (
    <LoginForm onSubmit={async ({ email, password }) => {
      const { authToken, enduser } = await enduserSession.authenticate(email, password)
      setEnduserSession?.({ ...enduserSession })
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

  useEffect(() => {
    const s = (session ?? enduserSession) as Session | EnduserSession
    if (!s) throw new Error("Missing SessionContext and EnduserSessionContext")
    
    s.logout()
    .then(() => {
      if (session) { setSession({ ...s as Session}) }
      else { setEnduserSession({ ...s as EnduserSession }) }
      onLogout?.()
    })
  }, [session, enduserSession, enduserSession, setSession, setEnduserSession])

  return <>{children}</>
}
