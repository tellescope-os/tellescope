import {
  assert,
  async_test,
  log_header,
  objects_equivalent,
  wait,
} from "@tellescope/testing"
import { Session, /* APIQuery */ } from "../sdk"
import { PublicEndpoints } from "../public"

const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]

const sdk = new Session({ host })
const sdkPub = PublicEndpoints({ host })

if (!(email && password)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit()
}

const enduser_login_tests = async () => {
  const e = await sdk.api.endusers.createOne({ email: "test@tellescope.com" })
  const password = 'testpassword'

  await async_test(
    'login-enduser (no password set)', 
    () => sdkPub.login_enduser({ id: e.id, password }),
    { shouldError: true, onError: _ => true }
  )
  await async_test(
    'setPassword', 
    () => sdk.api.endusers.setPassword(e.id, password),
    { onResult: _ => true }
  )

  let authToken = 'placeholder'
  await async_test(
    'isAuthenticated (no)', 
    () => sdk.api.endusers.isAuthenticated(e.id, authToken),
    { onResult: ({ isAuthenticated, enduser }) => isAuthenticated === false && enduser === null }
  )
  await async_test(
    'login-enduser', 
    () => sdkPub.login_enduser({ id: e.id, password }),
    { onResult: r => !!(authToken = r.authToken) }
  )
  await async_test(
    'isAuthenticated (yes)', 
    () => sdk.api.endusers.isAuthenticated(e.id, authToken),
    { onResult: ({ isAuthenticated, enduser }) => isAuthenticated === true && enduser?.id === e.id }
  )
}

(async () => {
  log_header("Public Endpoints")

  try {
    await sdk.authenticate(email, password, host)
    await sdk.reset_db()

    await enduser_login_tests()
  } catch(err) {
    console.error(err)
  }

  process.exit()
})()