import { Session } from "./session"

export const PublicEndpoints = (o?: { host?: string }) => {
  const { GET, POST, PATCH, DELETE } = new Session({ ...o, type: 'public' }) // no need to authenticate 

  return {
    login_enduser: (a: { email?: string, id?: string, phone?: string, password: string }) => (
      POST<any, { authToken: string }>('/v1/login-enduser', a)
    ),
  }
}