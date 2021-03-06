require('source-map-support').install();
import crypto from "crypto"
import * as buffer from "buffer" // only node >=15.7.0

import {
  Enduser,
  ClientModelForName,
  ClientModelForName_required,
  UserDisplayInfo,
} from "@tellescope/types-client"
import { 
  AutomationAction,
  ModelName,
} from "@tellescope/types-models"

import {
  Indexable,
  Operation,
} from "@tellescope/types-utilities"

import {
  fieldsToValidation,
  mongoIdValidator,

  InputValidation,
} from "@tellescope/validation"

import { Session, APIQuery, EnduserSession } from "../sdk"
import {  } from "@tellescope/utilities"
import { DEFAULT_OPERATIONS, PLACEHOLDER_ID } from "@tellescope/constants"
import { 
  schema, 
  Model, 
  ModelFields,
} from "@tellescope/schema"

import {
  assert,
  async_test,
  log_header,
  wait,
} from "@tellescope/testing"

import {
  objects_equivalent,
  url_safe_path,
} from "@tellescope/utilities"

const UniquenessViolationMessage = 'Uniqueness Violation'

const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]
const [nonAdminEmail, nonAdminPassword] = [process.env.NON_ADMIN_EMAIL, process.env.NON_ADMIN_PASSWORD]

const userId = '60398b0231a295e64f084fd9'
const businessId = '60398b1131a295e64f084ff6'

// const example_SDK_usage = async () => {
//   // initialize SDK and authenticate a user
//   const sdk = new Session()
//   await sdk.authenticate("user-email", 'user-password')

//   // create a record, using Enduser model as example
//   const enduser = await sdk.api.endusers.createOne({ email: "enduser1@tellescope.com" })

//   // update an existing record
//   await sdk.api.endusers.updateOne(enduser.id, { phone: "+15555555555" })

//   // fetch a record by id, or a list of recent records
//   const existingEnduser: Enduser = await sdk.api.endusers.getOne(enduser.id)  
//   const existingEndusers: Enduser[] = await sdk.api.endusers.getSome({ limit: 5, lastId: enduser.id })  

//   // delete an individual record
//   await sdk.api.endusers.deleteOne(enduser.id)
// }

const sdk = new Session({ host })
const sdkOther = new Session({ host, apiKey: "ba745e25162bb95a795c5fa1af70df188d93c4d3aac9c48b34a5c8c9dd7b80f7" })
const sdkNonAdmin = new Session({ host })
const enduserSDK = new EnduserSession({ host, businessId })
const enduserSDKDifferentBusinessId = new EnduserSession({ host, businessId: '80398b1131a295e64f084ff6' })
// const sdkOtherEmail = "sebass@tellescope.com"

if (!(email && password && email2 && password2 && nonAdminEmail && nonAdminPassword)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit()
}

const recordNotFound =  { shouldError: true, onError: (e: { message: string }) => e.message === 'Could not find a record for the given id' } 
const voidResult = () => true
const passOnVoid = { shouldError: false, onResult: voidResult }
// const isNull = (d: any) => d === null

const setup_tests = async () => {
  log_header("Setup")
  await async_test('test_online', sdk.test_online, { expectedResult: 'API V1 Online' })
  await async_test('test_authenticated', sdk.test_authenticated, { expectedResult: 'Authenticated!' })

  await async_test(
    'test_authenticated (with API Key)', 
    (new Session({ host, apiKey: '3n5q0SCBT_iUvZz-b9BJtX7o7HQUVJ9v132PgHJNJsg.' /* local test key */  })).test_authenticated, 
    { expectedResult: 'Authenticated!' }
  )

  await sdk.logout()
  await async_test<string, string>('test_authenticated - (logout invalidates jwt)', sdk.test_authenticated, { shouldError: true, onError: e => e === 'Unauthenticated' })
  await sdk.authenticate(email, password)
  await async_test('test_authenticated (re-authenticated)', sdk.test_authenticated, { expectedResult: 'Authenticated!' })

  const uInfo = sdk.userInfo
  const originalAuthToken = sdk.authToken
  await sdk.refresh_session()
  assert(uInfo.id === sdk.userInfo.id, 'userInfo mismatch', 'userInfo id preserved after refresh') 
  assert(
    !!originalAuthToken && !!sdk.authToken && sdk.authToken !== originalAuthToken, 
    'same authToken after refresh', 
    'authToken refresh'
  ) 

  await async_test('reset_db', () => sdk.reset_db(), passOnVoid)
}

const multi_tenant_tests = async () => {
  log_header("Multi Tenant")
  const e2 = await sdkOther.api.endusers.createOne({ email: "hi@tellescope.com" }).catch(console.error)
  const e1 = await sdk.api.endusers.createOne({ email: "hi@tellescope.com" }).catch(console.error)
  if (!e1) process.exit()
  if (!e2) process.exit()

  /* Test global uniqueness, create must be enabled for users model */
  // await sdk.api.users.createOne({ email }).catch(console.error)
  // await sdk.api.users.createSome([{ email }, { email }]).catch(console.error)
  // await sdkOther.users.createOne({ email }).catch(console.error)
  // await sdkOther.users.createSome([{ email }, { email }]).catch(console.error)
  // await sdk.api.users.updateOne(userId, { email: sdkOtherEmail }).catch(console.error)

  await async_test(
    "o1 get o2", () => sdk.api.endusers.getOne(e2.id), recordNotFound
  )
  await async_test(
    "o2 get o1", () => sdkOther.api.endusers.getOne(e1.id), recordNotFound
  )

  await async_test(
    "o1 get many", () => sdk.api.endusers.getSome(), { onResult: es => es.length === 1 }
  )
  await async_test(
    "o2 get many", () => sdkOther.api.endusers.getSome(), { onResult: es => es.length === 1 }
  ) 

  const update = { fname: "billy" }
  await async_test(
    "o1 update o2", () => sdk.api.endusers.updateOne(e2.id, update), recordNotFound
  )
  await async_test(
    "o2 update o1", () => sdkOther.api.endusers.updateOne(e1.id, update), recordNotFound
  )

  await async_test(
    "o1 delete o2", () => sdk.api.endusers.deleteOne(e2.id), recordNotFound
  )
  await async_test(
    "o2 delete o1", () => sdkOther.api.endusers.deleteOne(e1.id), recordNotFound
  )

  await sdk.api.endusers.deleteOne(e1.id)
  await sdkOther.api.endusers.deleteOne(e2.id)
}

const threadKeyTests = async () => {
  log_header("threadKey")
  const enduser = await sdk.api.endusers.createOne({ email: 'threadkeytests@tellescope.com' })
  const [e1, e2, e3] = await Promise.all([
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 1', significance: 5 }),
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 2', significance: 5 }),
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 3', significance: 5 }),
  ])
  await wait(undefined, 1000) // sort struggles when all 6 documents created in the same second
  const [e4, e5, e6] = await Promise.all([
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 1', significance: 5 }),
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 2', significance: 5 }),
    sdk.api.engagement_events.createOne({ enduserId: enduser.id, type: 'Type 3', significance: 5 }),
  ])

  let es = await sdk.api.engagement_events.getSome({ threadKey: 'type', sort: 'oldFirst' })
  assert(es.length === 3, 'threadKey got duplicates', 'threadKey no duplicates (length, old)')
  assert(new Set(es.map(e => e.type)).size === 3, 'threadKey got duplicates', 'threadKey no duplicates explicit')
  assert(es.find(e => e.id === e1.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 1, old)')
  assert(es.find(e => e.id === e2.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 2, old)')
  assert(es.find(e => e.id === e3.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 3, old)')

  es = await sdk.api.engagement_events.getSome({ threadKey: 'type', sort: 'newFirst' })
  assert(es.length === 3, 'threadKey got duplicates', 'threadKey no duplicates (length, new)')
  assert(new Set(es.map(e => e.type)).size === 3, 'threadKey got duplicates', 'threadKey no duplicates explicit')
  assert(es.find(e => e.id === e4.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 1, new)')
  assert(es.find(e => e.id === e5.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 2, new)')
  assert(es.find(e => e.id === e6.id) !== undefined, 'threadKey got duplicates', 'threadKey no duplicates (key 3, new)')

  // cleanup
  await sdk.api.endusers.deleteOne(enduser.id) // cleans up automatin events too
}

const badInputTests = async () => {
  log_header("Bad Input")
  await async_test(
    `_-prefixed fields are not allowed`, 
    () => sdk.api.endusers.createOne({ email: 'failure@tellescope.com', fields: { "_notallowed": 'hello' } }), 
    { shouldError: true, onError: e => e.message === "Error parsing field fields: Fields that start with '_' are not allowed" },
  )
  await async_test(
    `_-prefixed fields are not allowed`, 
    () => sdk.api.notes.createOne({ enduserId: PLACEHOLDER_ID, fields: { "_notallowed": 'hello' } }), 
    { shouldError: true, onError: e => e.message === "Error parsing field fields: Fields that start with '_' are not allowed" },
  )
}

const filterTests = async () => {
  log_header("Filter Tests")
  const enduser = await sdk.api.endusers.createOne({ email: 'filtertests@tellescope.com', fname: 'test', fields: { field1: 'value1', field2: 'value2' } })
  const otherEnduser = await sdk.api.endusers.createOne({ email: 'other@tellescope.com' })
  await async_test(
    `find enduser by filter`, 
    () => sdk.api.endusers.getSome({ filter: { email: 'filtertests@tellescope.com' }}), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `find enduser by _exists filter`, 
    () => sdk.api.endusers.getSome({ filter: { fname: { _exists: true } }}), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `find enduser by _exists filter (findOne)`, 
    // () => sdk.api.endusers.getOne({ fname: { _exists: true } }), 
    () => sdk.api.endusers.getOne({ fname: { _exists: true } }), 
    { onResult: e => e.id === enduser.id },
  )
  await async_test(
    `find enduser by compound filter`, 
    () => sdk.api.endusers.getSome({ filter: { email: 'filtertests@tellescope.com', fname: 'test' }}), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `nothing found by invalid compound filter`, 
    () => sdk.api.endusers.getSome({ filter: { email: 'filtertests@tellescope.com', fname: 'nottest' }}), 
    { onResult: es => es.length === 0 },
  )
  await async_test(
    `nothing found for invalid filter`, 
    () => sdk.api.endusers.getSome({ filter: { email: 'doesnotexist@tellescope.com' }}), 
    { onResult: es => es.length === 0 },
  )
  await async_test(
    `find enduser by nested filter`, 
    () => sdk.api.endusers.getSome({ filter: { fields: { field1: 'value1' } } }), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `nothing found by invalid nested filter`, 
    () => sdk.api.endusers.getSome({ filter: { fields: { field1: 'not a nested field value' } }}), 
    { onResult: es => es.length === 0 },
  )
  await async_test(
    `find enduser by compound nested filter`, 
    () => sdk.api.endusers.getSome({ filter: { fields: { field1: 'value1', field2: 'value2' } } }), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `nothing found by compound invalid nested filter`, 
    () => sdk.api.endusers.getSome({ filter: { fields: { field1: 'not a nested field value', field2: 'value2' } }}), 
    { onResult: es => es.length === 0 },
  )
  await async_test(
    `find enduser by compound nested filter with non-nested field as well`, 
    () => sdk.api.endusers.getSome({ filter: {email: 'filtertests@tellescope.com', fields: { field1: 'value1', field2: 'value2' } } }), 
    { onResult: es => es.length === 1 && es[0].id === enduser.id },
  )
  await async_test(
    `nothing found for compound nested filter with non-nested field as well`, 
    () => sdk.api.endusers.getSome({ filter: {email: 'doesnotexist@tellescope.com', fields: { field1: 'value1', field2: 'value2' } } }), 
    { onResult: es => es.length === 0 },
  )

  await sdk.api.endusers.deleteOne(enduser.id)
  await sdk.api.endusers.deleteOne(otherEnduser.id)
}

const updatesTests = async () => {
  log_header("Updates Tests")
  const enduser = await sdk.api.endusers.createOne({ email: 'test@tellescope.com', phone: '+15555555555' })
  await sdk.api.endusers.updateOne(enduser.id, { phone: '+15555555552' }) // update to new phone number 
  await sdk.api.endusers.updateOne(enduser.id, { phone: '+15555555552' }) // update to same phone number
  assert(!!enduser, '', 'Updated phone number')

  const task = await sdk.api.tasks.createOne({ text: "do the thing", completed: false })
  await sdk.api.tasks.updateOne(task.id, { completed: false }) // test setting false (falsey value) on update
  assert(!!task, '', 'Set completed false')

  await sdk.api.tasks.deleteOne(task.id)
  await sdk.api.endusers.deleteOne(enduser.id)
}

const generateEnduserAuthTests = async () => {
  log_header("Generated Enduser authToken")
  const externalId = '1029f9v9sjd0as'
  const e = await sdk.api.endusers.createOne({ email: 'generated@tellescope.com', phone: '+15555555555', externalId })

  const { authToken, enduser } = await sdk.api.endusers.generate_auth_token({ id: e.id })
  assert(!!authToken && !!enduser, 'invalid returned values', 'Generate authToken and get enduser')
  let { isAuthenticated } = await sdk.api.endusers.is_authenticated({ id: enduser.id, authToken })
  assert(isAuthenticated, 'invalid authToken generated for enduser', 'Generate authToken for enduser is valid')
  assert(
    (await sdk.api.endusers.is_authenticated({ authToken })).isAuthenticated,
    'id omitted results in failed authentication',
    'id optional for is_authenticated'
  )
  let withDurationResult = await sdk.api.endusers.generate_auth_token({ id: e.id, durationInSeconds: 1000 })
  assert(!!withDurationResult, 'no result for id with duration', 'id with duration')

  const { authToken: authTokenUID, enduser: enduser2 } = await sdk.api.endusers.generate_auth_token({ externalId })
  assert(!!authTokenUID && !!enduser2, 'invalid returned values eid', 'Generate authToken and get enduser eid')
  assert((
    await sdk.api.endusers.is_authenticated({ id: enduser2.id, authToken: authTokenUID })).isAuthenticated, 
    'invalid authToken generated for enduser', 'Generate authToken for enduser is valid'
  )
  withDurationResult = await sdk.api.endusers.generate_auth_token({ externalId, durationInSeconds: 1000  })
  assert(!!withDurationResult, 'no result for externalId with duration', 'externalId with duration')

  await async_test(
    `auth by externalId`, () => sdk.api.endusers.generate_auth_token({ externalId: e.externalId }), passOnVoid,
  ) 
  await async_test(
    `auth by email`, () => sdk.api.endusers.generate_auth_token({ email: e.email }), passOnVoid,
  ) 
  await async_test(
    `auth by phone`, () => sdk.api.endusers.generate_auth_token({ phone: e.phone }), passOnVoid,
  ) 
  await async_test(
    `auth by nothing throws error`, () => sdk.api.endusers.generate_auth_token({ phone: undefined }), 
    { shouldError: true, onError: e => e.message === "One of id, externalId, email, or phone is required" },
  ) 
  await async_test(
    `auth by bad field throws error`, () => sdk.api.endusers.generate_auth_token({ email: "notavalidemail@tellescope.com" }), 
    { shouldError: true, onError: e => e.message === "Could not find a corresponding enduser" },
  ) 

  await sdk.api.endusers.deleteOne(enduser.id)
}

const instanceForModel = <N extends ModelName, T=ClientModelForName[N], REQ=ClientModelForName_required[N]>(model: Model<T, N>, i=0) => {
  const instance = {} as Indexable
  const updates = {} as Indexable
  const filter = {} as Indexable

  for (const k in model.fields) {
    if (model.fields[k].readonly) continue

    if ((model.fields[k]?.examples?.length ?? 0) > i) {
      instance[k] = model.fields[k]?.examples?.[i]

      if (model?.readFilter?.[k]) {
        filter[k] = model.fields[k]?.examples?.[i]
      }

      if (model?.fields?.[k].updatesDisabled !== true) {
        updates[k] = model.fields[k]?.examples?.[i]
      }
    }
  }
  return { instance, updates, filter } as { instance: REQ & Partial<T>, updates: Partial<T>, filter: Partial<T> }
}

const has_required_field = <T>(fields: ModelFields<T>) => Object.values(fields).find((f: any) => f.required === true) !== undefined

interface GeneratedTest <N extends ModelName, T = ClientModelForName[N]> {
  queries: APIQuery<N>,
  model: Model<T, N>, 
  name: ModelName,
  returns: {
    create?: ModelFields<T>,
  }
}

const verify_missing_defaults = async <N extends ModelName>({ queries, model, name }: GeneratedTest<N>) => {
  const queryForOperation: { [O in Operation]: () => Promise<any> } = {
    create: () => queries.createOne({} as any),
    createMany: () => queries.createSome([{} as any, {} as any]),
    read: () => queries.getOne('fakeid'),
    readMany: () => queries.getSome(),
    update: () => queries.updateOne('fakeid', {} as any),
    delete: () => queries.deleteOne('fakeid'),
  }

  let o: Operation
  for (o in DEFAULT_OPERATIONS) {
    if (Object.keys(model.defaultActions).includes(o) || model.customActions[o]) continue // action is implemented

    await async_test(
      `${o} unavailable for ${name}`,
      () => queryForOperation[o](), 
      { shouldError: true, onError: e => e.message === 'This action is not allowed' || e.message === 'Inaccessible' },
    )
  }
}

// const validator_to_boolean = <T>(v: EscapeFunction<T>) => (i: JSONType) => {
//   try {
//     v(i)
//     return true
//   } catch(err) {
//     console.error(err)
//     return false
//   }
// }
// const isMongoId = validator_to_boolean(mongoIdValidator())

type DefaultValidation = InputValidation<{ _default: boolean, id: string }>
const validateReturnType = <N extends ModelName, T=ClientModelForName[N]>(fs: ModelFields<T> | undefined, r: T, d: DefaultValidation) => {
  const validation = fieldsToValidation(fs ?? {} as Indexable)

  try {
    for (const f in r) {
      (validation[f] || d._default)(r[f as keyof typeof r] as any)
    }
    return true
  } catch(err) {
    console.error(err)
    return false
  }
}

let defaultEnduser = undefined as Enduser | undefined
const run_generated_tests = async <N extends ModelName>({ queries, model, name, returns } : GeneratedTest<N>) => {
  if (name === 'post_likes') return // all custom
  if (!defaultEnduser) defaultEnduser = await sdk.api.endusers.createOne({ email: 'default@tellescope.com', phone: "5555555555"  })

  const { instance, updates, filter } = instanceForModel(model) 
  if ((instance as Indexable).enduserId) (instance as Indexable).enduserId = (defaultEnduser as Indexable).id
  if ((updates as Indexable).enduserId) (updates as Indexable).enduserId = (defaultEnduser as Indexable).id

  let _id = ''
  const safeName = url_safe_path(name)
  const singularName = safeName.substring(0, safeName.length - 1)

  await verify_missing_defaults({ queries, model, name, returns })

  // only validate id for general objects, for now
  const defaultValidation: DefaultValidation = { 
    id: mongoIdValidator(), _default: (x: any) => x
  }
                   

  // If no create, cannot test get, update, or delete
  if (!(model.defaultActions.create || model.customActions.create)) return
  
  if (has_required_field(model.fields)) {
    await async_test(
      `create-${singularName} (missing a required field)`,
      () => queries.createOne({} as any), 
      { shouldError: true, onError: e => e.message.endsWith('is required') || e.message.includes('Value not provided') },
    )
  }
  
  await async_test(
    `create-${singularName}`, 
    () => queries.createOne(instance), 
    { onResult: r => !!(_id = r.id) && (name === 'api_keys' || !!r.creator) && validateReturnType(returns.create, r, defaultValidation) }
  )
  await async_test(
    `log-${singularName} create`, 
    () => sdk.api.user_logs.getOne({ resourceId: _id, resource: name, action: 'create' }), 
    { onResult: r => r && r.userId === sdk.userInfo.id }
  )

  if (model.defaultActions.update) {
    await async_test(
      `update-${singularName}`, 
      () => queries.updateOne(_id, updates, { replaceObjectFields: true }), 
      { onResult: u => typeof u === 'object' && u.id === _id }
    )
    await async_test(
      `log-${singularName} update`, 
      () => sdk.api.user_logs.getOne({ resourceId: _id, resource: name, action: 'update' }), 
      { onResult: r => r && r.userId === sdk.userInfo.id }
    )
  }
  await async_test(
    `get-${singularName}`, 
    () => queries.getOne(_id), 
    { onResult: d => {
        if (!d?.id) return false

        for (const k in instance) {
          if (!objects_equivalent(instance[k], d[k as keyof typeof d])) return false
        }
        return true
      }
    } 
  )
  await async_test(
    `get-${safeName}`, 
    () => queries.getSome({ filter }), 
    { onResult: ([d, /*...others */]) => {
        // if (others.length !== 0) return false // some collections are not reset during testing, like API keys
        if (!d?.id) return false

        for (const k in instance) {
          if (!objects_equivalent(instance[k], d[k as keyof typeof d])) return false
        }
        return true
      }
    } 
  )

  await async_test(
    `delete-${singularName}`, 
    () => queries.deleteOne(_id), 
    passOnVoid
  )
  await async_test(
    `get-${singularName} (verify delete)`, 
    () => queries.getOne(_id), 
    { shouldError: true, onError: e => e.message === 'Could not find a record for the given id' } 
  )

  await wait(undefined, 25)
  await async_test(
    `log-${singularName} delete`, 
    () => sdk.api.user_logs.getOne({ resourceId: _id, resource: name, action: 'delete' }), 
    { onResult: r => r && r.userId === sdk.userInfo.id }
  )
}

const enduser_tests = async (queries=sdk.api.endusers) => {
  log_header("Enduser")
  
  const e1 = await queries.createOne({ email: 'test1@gmail.com', phone: '+14155555500' })
  const e2 = await queries.createOne({ email: 'test2@gmail.com', phone: '+14155555501' })

  await enduserSDK.register({ email: 'test3@gmail.com', password: "testenduserpassword" })
  await async_test(
    `get-enduser registered`,
    () => queries.getOne({ email: 'test3@gmail.com' }), 
    { onResult: e => !!e },
  )
  await async_test(
    `enduser registered can log in`,
    () => enduserSDK.authenticate('test3@gmail.com', 'testenduserpassword'), 
    { onResult: e => !!e.authToken && e.enduser.email === 'test3@gmail.com' },
  )

  await async_test(
    `update-enduser email conflict`, 
    () => queries.updateOne(e1.id ?? '', { email: e2.email }), 
    { shouldError: true, onError: () => true }
  )
  await async_test(
    `update-enduser phone conflict`, 
    () => queries.updateOne(e1.id ?? '', { phone: e2.phone }), 
    { shouldError: true, onError: () => true }
  )
  await async_test(
    `update-enduser email and phone conflict`, 
    () => queries.updateOne(e1.id ?? '', { email: e2.email, phone: e2.phone }), 
    { shouldError: true, onError: () => true }
  )
  await async_test(
    `update-enduser working`, 
    () => queries.updateOne(e1.id ?? '', { email: 'edited' + e1.email }), 
    passOnVoid,
  )

  await async_test(
    `update-enduser test replaceObjectFields 1`,
    () => queries.updateOne(e1.id ?? '', { fields: { field1: '1'} }), 
    passOnVoid,
  )
  await async_test(
    `get-enduser test replaceObjectFields verify 1`,
    () => queries.getOne(e1.id ?? ''), 
    { onResult: e => e.fields?.field1 === '1' },
  )
  
  await async_test(
    `update-enduser test replaceObjectFields 2`,
    () => queries.updateOne(e1.id ?? '', { fields: { field2: '2'} }), 
    passOnVoid,
  )
  await async_test(
    `get-enduser test replaceObjectFields verify 2`,
    () => queries.getOne(e1.id ?? ''), 
    { onResult: e => e.fields?.field1 === '1' && e.fields?.field2 === '2' },
  )

  await async_test(
    `update-enduser test replaceObjectFields true 1`,
    () => queries.updateOne(e1.id ?? '', { fields: { field2: '_2'} }, { replaceObjectFields: true }), 
    passOnVoid,
  )
  await async_test(
    `get-enduser test replaceObjectFields verify true 1`,
    () => queries.getOne(e1.id ?? ''), 
    { onResult: e => e.fields?.field1 === undefined && e.fields?.field2 === '_2' },
  )

  await async_test(
    `update-enduser test replaceObjectFields true unset`,
    () => queries.updateOne(e1.id ?? '', { fields: { } }, { replaceObjectFields: true }), 
    passOnVoid,
  )
  await async_test(
    `get-enduser test replaceObjectFields verify true unset`,
    () => queries.getOne(e1.id ?? ''), 
    { onResult: e => objects_equivalent(e.fields, {}) },
  )

  const eToDup1: Partial<Enduser> = { email: 'dup1@tellescope.com' }
  const eToDup2: Partial<Enduser> = { email: 'dup2@tellescope.com' }
  await queries.createOne(eToDup1)
  await queries.createOne(eToDup2)
  await async_test(
    `create-many-endusers - all conflict (1)`, 
    () => queries.createSome([eToDup1]), 
    { shouldError: true, onError: e => e.message === 'Uniqueness Violation' }
  )
  await async_test(
    `create-many-endusers - all conflict (2)`, 
    () => queries.createSome([eToDup1, eToDup2]), 
    { shouldError: true, onError: e => e.message === 'Uniqueness Violation' }
  )
  await async_test(
    `create-many-endusers - multiple email conflict`,
    () => queries.createSome([eToDup1, eToDup2, { email: "unique@tellescope.com"}]), 
    { onResult: ({ created, errors }) => created.length === 1 && errors.length === 2 }
  )
  await async_test(
    `create-many-endusers - create conflict, one unique`, 
    () => queries.createSome([{ email: 'd1@tellescope.com'}, { email: 'd1@tellescope.com'}, { email: 'd1@tellescope.com'}]), 
    { onResult: ({ created, errors }) => created.length === 1 && errors.length === 2 }
  )
  await async_test(
    `create-many-endusers - create conflict, two unique`, 
    () => queries.createSome([{ email: 'd2@tellescope.com'}, { email: 'd2@tellescope.com'}, { email: 'createme@tellescope.com' }]), 
    { onResult: ({ created, errors }) => created.length === 2 && errors.length === 1 }
  )
}

const api_key_tests = async () => { }
const engagement_tests = async () => { }
const journey_tests = async (queries=sdk.api.journeys) => { 
  await async_test(
    `create-journey - states missing defaultState`, 
    () => queries.createOne({ title: 'Error', defaultState: 'default', states: [{ name: 'not-default', priority: 'N/A' }]  }), 
    { shouldError: true, onError: e => e.message === 'defaultState does not exist in states' }
  )
  await async_test(
    `create-journey - duplicate states`, 
    () => queries.createOne({ title: 'Error', defaultState: 'default', states: [{ name: 'default', priority: 'N/A' }, { name: 'default', priority: 'N/A' }] }), 
    { shouldError: true, onError: e => e.message === 'Uniqueness Violation' }
  )

  const journey = await sdk.api.journeys.createOne({ title: 'Test Journey' })
  const journey2 = await sdk.api.journeys.createOne({ title: 'Test Journey 2' })

  await sdk.api.journeys.updateOne(journey.id, { 
    states: [
      { name: 'Delete Me 1', priority: 'N/A' },
      { name: 'Delete Me 2', priority: 'N/A' },
    ] 
  })
  const updated = (await sdk.api.journeys.delete_states({ id: journey.id, states: ['Delete Me 1', 'Delete Me 2']})).updated
  assert(!!updated.id && updated.states.length === 1 && updated.states[0].name === 'New', 'delete states fail on returned update', 'delete states returns updated value')

  const fetchAfterDeletion = await sdk.api.journeys.getOne(journey.id)
  assert(fetchAfterDeletion.states.length === 1 && fetchAfterDeletion.states[0].name === 'New', 'delete states fail', 'delete states worked')

  assert(journey.defaultState === 'New', 'defaultState not set on create', 'journey-create - defaultState initialized')
  assert(journey.states[0].name === 'New', 'defaultState not set on create', 'journey-create - states initialized')

  await sdk.api.journeys.updateOne(journey.id, { states: [{ name: 'ToDuplicate', priority: "N/A" }] })
  let withAddedState = await sdk.api.journeys.getOne(journey.id)
  assert(
    withAddedState.states.length === 2 && withAddedState.states.find(s => s.name === 'ToDuplicate') !== undefined, 
    'new state added', 'journey-update - push state change'
  )

  await async_test(
    `create-journey - add duplicate state`, 
    () => sdk.api.journeys.updateOne(journey.id, { states: [{ name: 'ToDuplicate', priority: "N/A" }] }), 
    { shouldError: true, onError: e => e.message === 'Uniqueness Violation' }
  )
  await async_test(
    `create-journey - add duplicate states in update`, 
    () => sdk.api.journeys.updateOne(journey.id, { states: [{ name: 'DuplicateUpdate', priority: "N/A" }, { name: 'DuplicateUpdate', priority: "N/A" }] }), 
    { shouldError: true, onError: e => e.message === 'Uniqueness Violation' }
  )
  
  await sdk.api.journeys.updateOne(journey.id, { defaultState: 'Added', states: [{ name: 'Added', priority: "N/A" }, { name: "Other", priority: "N/A" }] }, { replaceObjectFields: true })
  withAddedState = await sdk.api.journeys.getOne(journey.id)
  assert(
    withAddedState.states.length === 2 && withAddedState.states.find(s => s.name === 'Added') !== undefined
      && withAddedState.defaultState === 'Added',
    'duplicate state not added', 'journey-update - replace states'
  )

  await async_test(
    `journey-update - states replace with missing default`, 
    () => queries.updateOne(journey.id, { states: [{ name: 'Not Default', priority: "N/A" }]  }, { replaceObjectFields: true }), 
    { shouldError: true, onError: e => e.message === 'defaultState does not exist in states' }
  )

  const e1 = await sdk.api.endusers.createOne({ email: 'journeyunset1@tellescope.com', journeys: { [journey.id]: 'Added' } })
  const e2 = await sdk.api.endusers.createOne({ email: 'journeyunset2@tellescope.com', journeys: { [journey.id]: 'Added', [journey2.id]: 'New' } })

  await async_test(
    `create-enduser - invalid journey id`, 
    () => sdk.api.endusers.createOne({ email: 'journeyunset3@tellescope.com', journeys: { [e1.id]: 'Added' } }), 
    { shouldError: true, onError: e => e.message === 'Could not find a related record for the given id(s)' }
  )
  await async_test(
    `update-enduser - invalid journey id`, 
    () => sdk.api.endusers.updateOne(e1.id, { journeys: { [e1.id]: 'Added' } }), 
    { shouldError: true, onError: e => e.message === 'Could not find a related record for the given id(s)' }
  )
  await async_test(
    `update-enduser - one invalid journey id`, 
    () => sdk.api.endusers.updateOne(e1.id, { journeys: { [journey.id]: 'Added', [e1.id]: 'Added' } }), 
    { shouldError: true, onError: e => e.message === 'Could not find a related record for the given id(s)' }
  )

  await sdk.api.endusers.updateOne(e1.id, { journeys: { [journey.id]: 'Other' } }) // valid state change
  await sdk.api.endusers.updateOne(e1.id, { journeys: { [journey.id]: 'Added' } }) // change back
  await wait(undefined, 25) // wait for side effects to add engagement
  let engagement = await sdk.api.engagement_events.getSome()
  assert(engagement.filter(e => e.enduserId === e1.id && e.type === "STATE_CHANGE").length === 2, 
    'STATE_CHANGE engagement not tracked', 
    'Update enduser tracks state changes'
  )

  const es = (
    await sdk.api.endusers.createSome([ { email: "1@tellescope.com", journeys: { [journey.id]: 'Added' } }, { email: "2@tellescope.com", journeys: { [journey.id]: 'Added' } } ])
  ).created
  engagement = await sdk.api.engagement_events.getSome()
  assert(engagement.filter(e => e.enduserId === es[0].id && e.type === "JOURNEY_SET").length === 1, 
    'JOURNEY_SET engagement not tracked', 
    'Create endusers tracks engagement events (1)'
  )
  assert(engagement.filter(e => e.enduserId === es[1].id && e.type === "JOURNEY_SET").length === 1, 
    'JOURNEY_SET engagement not tracked', 
    'Create endusers tracks engagement events (2)'
  )
  

  await queries.updateOne(journey.id, { states: [{ name: 'First', priority: "N/A" }, { name: 'Added', priority: "N/A" }]  }, { replaceObjectFields: true })
  await async_test(
    `journey-update - insert new state at front`, 
    () => queries.getOne(journey.id), 
    { onResult: j => objects_equivalent(j.states, [{ name: 'First', priority: "N/A" }, { name: 'Added', priority: "N/A" }])}
  )

  await async_test(
    `journey-updateState`, 
    () => queries.update_state({ id: journey.id, name: 'Added', updates: { name: 'Updated', priority: 'N/A' }}),
    passOnVoid,
  )
  await wait(undefined, 25) // wait for side effects to update endusers
  await async_test(
    `journey-updateState verify propagation to enduser 1`, 
    () => sdk.api.endusers.getOne(e1.id),
    { onResult: e => objects_equivalent(e.journeys, { [journey.id]: 'Updated' })},
  )
  await async_test(
    `journey-updateState verify propagation to enduser 2`, 
    () => sdk.api.endusers.getOne(e2.id),
    { onResult: e => objects_equivalent(e.journeys, { [journey.id]: 'Updated', [journey2.id]: 'New' })},
  )


  await queries.deleteOne(journey.id)
  await wait(undefined, 25) // wait for side effects to update endusers
  await async_test(
    `journey-delete - corresponding enduser journeys are unset 1`, 
    () => sdk.api.endusers.getOne(e1.id), 
    { onResult: e => objects_equivalent(e.journeys, {}) }
  )
  await async_test(
    `journey-delete - corresponding enduser journeys are unset, others left`, 
    () => sdk.api.endusers.getOne(e2.id), 
    { onResult: e => objects_equivalent(e.journeys, { [journey2.id]: 'New' }) }
  )
}

const tasks_tests = async (queries=sdk.api.tasks) => {
  const e = await sdk.api.endusers.createOne({ email: "fortask@tellescope.com" })
  const t = await queries.createOne({ text: "Enduser Task", enduserId: e.id })
  assert(!!t.enduserId, 'enduserId not assigned to task', 'enduserId exists for created task')

  await sdk.api.endusers.deleteOne(e.id)
  await wait(undefined, 100) // allow dependency updates to fire in background (there are a lot for endusers)
  await async_test(
    `get-task - enduserId unset on enduser deletion`, 
    () => queries.getOne(t.id), 
    { onResult: t => t.enduserId === undefined }
  )
}

const email_tests = async (queries=sdk.api.emails) => { 
  const me = await sdk.api.endusers.createOne({ email: 'sebass@tellescope.com' })
  const meNoEmail = await sdk.api.endusers.createOne({ phone: "4444444444" })
  const meNoConsent = await sdk.api.endusers.createOne({ email: 'sebass22@tellescope.com', emailConsent: false })

  const testEmail = {
    logOnly: true, // change to false to test real email sending
    enduserId: me.id,
    subject: "Test Email",
    textContent: "This is at est email"
  }

  await async_test(
    `send-email - missing email`, 
    () => queries.createOne({ ...testEmail, enduserId: meNoEmail.id, logOnly: false }), // constraint ignored when logOnly is true
    { shouldError: true, onError: e => e.message === "Missing email" }
  )
  await async_test(
    `send-email - missing consent`, 
    () => queries.createOne({ ...testEmail, enduserId: meNoConsent.id, logOnly: false }), // constraint ignored when logOnly is true
    { shouldError: true, onError: e => e.message === "Missing email consent" }
  )
  await async_test(
    `send-email - missing consent (multiple)`, 
    () => queries.createSome([{ ...testEmail, enduserId: meNoConsent.id, logOnly: false }, { ...testEmail, enduserId: meNoConsent.id, logOnly: false }]), // constraint ignored when logOnly is true
    { shouldError: true, onError: e => e.message === "Missing email consent" }
  )


  await async_test(
    `send-email`, 
    () => queries.createOne(testEmail), 
    { onResult: t => !!t }
  )
  testEmail.subject = "Test Email (Multi-Send)"
  testEmail.textContent = "Multiple content"
  await async_test(
    `send-email (multiple)`, 
    () => queries.createSome([ testEmail, testEmail, testEmail ]), 
    { onResult: t => !!t }
  )

  await sdk.api.endusers.deleteOne(me.id)
  await sdk.api.endusers.deleteOne(meNoEmail.id)
  await sdk.api.endusers.deleteOne(meNoConsent.id)
}

const sms_tests = async (queries=sdk.api.sms_messages) => { 
  const me = await sdk.api.endusers.createOne({ phone: '14152618149' })
  const meNoPhone = await sdk.api.endusers.createOne({ email: "sebassss@tellescope.com" })
  const meNoConsent = await sdk.api.endusers.createOne({ phone: '4444444444', phoneConsent: false })
  
  const testSMS = {
    logOnly: true, // change to false to test real email sending
    enduserId: me.id,
    message: "Test SMS",
  }

  await async_test(
    `send-sms - missing phone`, 
    () => queries.createOne({ ...testSMS, enduserId: meNoPhone.id, logOnly: false }), // constraint ignored when logOnly is true
    { shouldError: true, onError: e => e.message === "Missing phone" }
  )
  await async_test(
    `send-sms - missing phone consent`, 
    () => queries.createOne({ ...testSMS, enduserId: meNoConsent.id, logOnly: false }), // constraint ignored when logOnly is true
    { shouldError: true, onError: e => e.message === "Missing phone consent" }
  )
  await async_test(
    `send-sms - missing phone (multiple)`, 
    () => queries.createSome([{ ...testSMS, enduserId: meNoPhone.id, logOnly: false }, { ...testSMS, enduserId: meNoPhone.id, logOnly: false }]),
    { shouldError: true, onError: e => e.message === "Missing phone" }
  )

  await async_test(
    `send-sms`, 
    () => queries.createOne(testSMS), 
    { onResult: t => !!t }
  )
  testSMS.message = "(Multi-Send)"
  await async_test(
    `send-sms (multiple)`, 
    () => queries.createSome([ testSMS, testSMS, testSMS ]), 
    { onResult: t => !!t }
  )

  await sdk.api.endusers.deleteOne(me.id)
  await sdk.api.endusers.deleteOne(meNoPhone.id)
  await sdk.api.endusers.deleteOne(meNoConsent.id)
}

const chat_room_tests = async () => {
  log_header("Chat Room Tests")
  const sdk2 = new Session({ host })
  await sdk2.authenticate(nonAdminEmail, nonAdminPassword) // non-admin has access restrictions we want to test 

  const email='enduser@tellescope.com', password='enduserPassword!';
  const enduser = await sdk.api.endusers.createOne({ email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error) 

  const enduserLoggedIn = await sdk.api.endusers.getOne(enduser.id)
  assert(new Date(enduserLoggedIn.lastActive).getTime() > Date.now() - 100, 'lastActive fail for enduser', 'lastActive for enduser')

  const room = await sdk.api.chat_rooms.createOne({ type: 'internal', userIds: [userId], enduserIds: [enduserSDK.userInfo.id] })
  assert(room.numMessages === 0, 'num mesages no update', 'num messages on creation')
  await async_test(
    `get-chat-room (not a user)`, 
    () => sdk2.api.chat_rooms.getOne(room.id), 
    { shouldError: true, onError: e => e.message === "Could not find a record for the given id" }
  )
  await async_test(
    `user_display_info for room (not a user)`, 
    () => sdk2.api.chat_rooms.display_info({ id: room.id }), 
    { shouldError: true, onError: e => e.message === "Could not find a record for the given id" }
  )

  await sdk.api.chats.createOne({ roomId: room.id, message: 'test message', attachments: [{ type: 'file', secureName: 'testsecurename'}] })
  let roomWithMessage = await sdk.api.chat_rooms.getOne(room.id)
  assert(roomWithMessage.numMessages === 1, 'num mesages no update', 'num messages on send message')
  assert((roomWithMessage?.recentMessageSentAt ?? 0) > Date.now() - 1000, 'recent message timestamp bad', 'recent message timestamp')
  assert(roomWithMessage?.infoForUser?.[userId]?.unreadCount === undefined, 'bad unread count for user', 'unread count for user')
  assert(roomWithMessage?.infoForUser?.[enduserSDK.userInfo.id]?.unreadCount === 1, 'bad unread count for enduser', 'unread count for enduser')

  roomWithMessage = await sdk.api.chat_rooms.updateOne(roomWithMessage.id, { infoForUser: { [userId]: { unreadCount: 0 }}})
  assert(roomWithMessage?.infoForUser?.[userId]?.unreadCount === 0, 'bad reset unread count for user', 'reset unread count for user')

  // todo: enable this test when createMany allowed for messages
  // await sdk.api.chats.createSome([{ roomId: room.id, message: 'test message 3' }, { roomId: room.id, message: 'test message 3' }])
  // roomWithMessage = await sdk.api.chat_rooms.getOne(room.id)
  // assert(roomWithMessage.numMessages === 3, 'num mesages no update', 'num messages on send messages')

  const verifyRoomDisplayInfo = (info: Indexable<UserDisplayInfo>) => {
    if (!info) return false
    if (typeof info !== 'object') return false
    if (Object.keys(info).length !== 2) return false
    if (!info[sdk.userInfo.id]) return false
    if (!info[enduserSDK.userInfo.id]) return false
    const [user, enduser] = [info[sdk.userInfo.id], info[enduserSDK.userInfo.id]]
    if (!(
      user.id === sdk.userInfo.id &&
      user.fname === sdk.userInfo.fname &&
      user.lname === sdk.userInfo.lname &&
      user.avatar === sdk.userInfo.avatar &&
      !!user.createdAt &&
      !!user.lastActive &&
      !!user.lastLogout 
    )) return false
    if (!(
      enduser.id === enduserSDK.userInfo.id &&
      enduser.fname === enduserSDK.userInfo.fname &&
      enduser.lname === enduserSDK.userInfo.lname &&
      enduser.avatar === enduserSDK.userInfo.avatar &&
      !!enduser.createdAt &&
      !!enduser.lastActive &&
      !!enduser.lastLogout 
    )) return false
    return true
  }
  await async_test(
    `user_display_info for room (for user)`, 
    () => sdk.api.chat_rooms.display_info({ id: room.id }), 
    { onResult: r => r.id === room.id && verifyRoomDisplayInfo(r.display_info) }
  )
  await async_test(
    `user_display_info for room (for enduser)`, 
    () => enduserSDK.api.chat_rooms.display_info({ id: room.id }), 
    { onResult: r => r.id === room.id && verifyRoomDisplayInfo(r.display_info) }
  )
  await sdk.api.chat_rooms.deleteOne(room.id)

  
  const emptyRoom = await sdk.api.chat_rooms.createOne({ })
  await async_test(
    `get-chat-room (creator can access, even when not in userIds)`, 
    () => sdk.api.chat_rooms.getOne(emptyRoom.id), 
    { onResult: r => r.id === emptyRoom.id }
  ) 
  await async_test(
    `get-chat-room (not in empty room)`, 
    () => sdk2.api.chat_rooms.getOne(emptyRoom.id), 
    { shouldError: true, onError: e => e.message === "Could not find a record for the given id" }
  ) 
  await async_test(
    `join-room`, 
    () => sdk2.api.chat_rooms.join_room({ id: emptyRoom.id }), 
    { onResult: ({ room }) => room.id === emptyRoom.id }
  ) 
  await async_test(
    `get-chat-room (join successful)`, 
    () => sdk2.api.chat_rooms.getOne(emptyRoom.id), 
    { onResult: r => r.id === emptyRoom.id }
  ) 

  await enduserSDK.logout()
  const loggedOutEnduser = await sdk.api.endusers.getOne(enduser.id)
  assert(new Date(loggedOutEnduser.lastLogout).getTime() > Date.now() - 100, 'lastLogout fail for enduser', 'lastLogout for enduser')

  await sdk.api.endusers.deleteOne(enduser.id)
  await sdk.api.chat_rooms.deleteOne(emptyRoom.id)

}

const chat_tests = async() => {
  const sdk2 = new Session({ host })
  await sdk2.authenticate(nonAdminEmail, nonAdminPassword) // non-admin has access restrictions we want to test 

  const room  = await sdk.api.chat_rooms.createOne({ type: 'internal', userIds: [userId] })
  const chat  = await sdk.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  const chat2 = await sdk.api.chats.createOne({ roomId: room.id, message: "Hello..." })

  // await async_test(
  //   `get-chat (without filter)`, 
  //   () => sdk.api.chats.getOne(chat.id), 
  //   { shouldError: true, onError: () => true }
  // )
  await async_test(
    `get-chats (without filter)`, 
    () => sdk.api.chats.getSome({}), 
    { shouldError: true, onError: () => true }
  )
  await async_test(
    `get-chats (with filter)`, 
    () => sdk.api.chats.getSome({ filter: { roomId: room.id } }), 
    { onResult: c => c?.length === 2 }
  )

  await async_test(
    `get-chats not allowed`, 
    () => sdk2.api.chats.getSome({ filter: { roomId: room.id } }), 
    { shouldError: true, onError: e => e.message === 'You do not have permission to access this resource' }
  )
  await async_test(
    `get-chats admin`, 
    () => sdk.api.chats.getSome({ filter: { roomId: room.id } }), 
    { onResult: () => true }
  )
  // currently disabled endpoint altogether
  // await async_test(
  //   `update-chat not allowed`, 
  //   () => sdk2.api.chats.updateOne(chat.id, { message: 'Hi' }), 
  //   { shouldError: true, onError: e => e.message === 'You do not have permission to access this resource' }
  // )
  await async_test(
    `delete-chat not allowed`, 
    () => sdk2.api.chats.deleteOne(chat.id), 
    { shouldError: true, onError: e => e.message === 'Inaccessible' }
  )

  // currently disabled endpoint altogether
  // await async_test(
  //   `update-chat can't update roomId`, 
  //   () => sdk.api.chats.updateOne(chat.id, { roomId: room.id } as any), // cast to any to allow calling with bad argument, but typing should catch this too
  //   { shouldError: true, onError: e => e.message === 'Error parsing field updates: roomId is not valid for updates' }
  // )

  await sdk.api.chat_rooms.deleteOne(room.id)
  await wait(undefined, 25)
  await async_test(
    `get-chat (deleted as dependency of room 1)`,
    () => sdk.api.chats.getOne(chat.id), 
    { shouldError: true, onError: e => e.message === 'Could not find a record for the given id' }
  )
  await async_test(
    `get-chat (deleted as dependency of room 2)`,
    () => sdk.api.chats.getOne(chat2.id), 
    { shouldError: true, onError: e => e.message === 'Could not find a record for the given id' }
  )

  const sharedRoom  = await sdk.api.chat_rooms.createOne({ type: 'internal', userIds: [userId, sdk2.userInfo.id] })
  const sharedChat  = await sdk.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello!", })
  const sharedChat2 = await sdk2.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello there!", })
  await async_test(
    `get-chat (shared, user1)`,
    () => sdk.api.chats.getOne(sharedChat.id), 
    { onResult: r => r.id === sharedChat.id }
  )
  await async_test(
    `get-chat (shared, user2)`,
    () => sdk2.api.chats.getOne(sharedChat.id), 
    { onResult: r => r.id === sharedChat.id }
  )
  await async_test(
    `get-chats (shared, user1)`,
    () => sdk.api.chats.getSome({ filter: { roomId: sharedRoom.id } }, ), 
    { onResult: cs => cs.length === 2 && !!cs.find(c => c.id === sharedChat.id) && !!cs.find(c => c.id === sharedChat2.id) }
  )
  await async_test(
    `get-chats (shared, user2)`,
    () => sdk2.api.chats.getSome({ filter: { roomId: sharedRoom.id } }), 
    { onResult: cs => cs.length === 2 && !!cs.find(c => c.id === sharedChat.id) && !!cs.find(c => c.id === sharedChat2.id) }
  )


  // test setNull dependency
  const roomNull  = await sdk.api.chat_rooms.createOne({ type: 'internal', userIds: [userId] })
  const chatNull  = await sdk.api.chats.createOne({ roomId: roomNull.id, message: "Hello!" })
  const chat2Null = await sdk.api.chats.createOne({ roomId: roomNull.id, message: "Hello...", replyId: chatNull.id })
  
  await sdk.api.chats.deleteOne(chatNull.id)
  await wait(undefined, 250)
  await async_test(
    `get-chat (setNull working)`,
    () => sdk.api.chats.getOne(chat2Null.id), 
    { onResult: c => c.replyId === null }
  )
}

const enduserAccessTests = async () => {
  log_header("Enduser Access")
  const email = 'enduser@tellescope.com'
  const password = 'testpassword'

  const enduser = await sdk.api.endusers.createOne({ email })
  const enduser2 = await sdk.api.endusers.createOne({ email: 'hi' + email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error)

  await wait(undefined, 1000) // wait so that refresh_session generates a new authToken (different timestamp)

  const uInfo = enduserSDK.userInfo
  const originalAuthToken = enduserSDK.authToken
  await enduserSDK.refresh_session()
  assert(uInfo.id === enduserSDK.userInfo.id, 'userInfo mismatch', 'userInfo id preserved after refresh') 
  assert(
    !!originalAuthToken && !!enduserSDK.authToken && enduserSDK.authToken !== originalAuthToken, 
    'same authToken after refresh', 
    'authToken refresh'
  ) 

  await async_test(
    `no-enduser-access for different businessId`,
    () => enduserSDKDifferentBusinessId.authenticate(email, password), 
    { shouldError: true, onError: (e: any) => e?.message === "Could not find a corresponding account" }
  )

  for (const n in schema) {
    const endpoint = url_safe_path(n)
    const model = schema[n as keyof typeof schema]
    if (n === 'webhooks') continue // no default endpoints implemented

    //@ts-ignore
    if (!model?.enduserActions?.read && (model.defaultActions.read || model.customActions.read)) {
      await async_test(
        `no-enduser-access getOne (${endpoint})`,
        () => enduserSDK.GET(`/v1/${endpoint.substring(0, endpoint.length - 1)}/:id`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
    //@ts-ignore
    if (!model.enduserActions?.readMany && (model.defaultActions.readMany || model.customActions.readMany)) {
      await async_test(
        `no-enduser-access getSome (${endpoint})`,
        () => enduserSDK.GET(`/v1/${endpoint}`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
    //@ts-ignore
    if (!model.enduserActions?.create && (model.defaultActions.create || model.customActions.create)) {
      await async_test(
        `no-enduser-access createOne (${endpoint})`,
        () => enduserSDK.POST(`/v1/${endpoint.substring(0, endpoint.length - 1)}`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
    //@ts-ignore
    if (!model.enduserActions?.createMany && (model.defaultActions.createMany || model.customActions.createMany)) {
      await async_test(
        `no-enduser-access createMany (${endpoint})`,
        () => enduserSDK.POST(`/v1/${endpoint}`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
    //@ts-ignore
    if (!model.enduserActions?.update && (model.defaultActions.update || model.customActions.update)) {
      await async_test(
        `no-enduser-access update (${endpoint})`,
        () => enduserSDK.PATCH(`/v1/${endpoint.substring(0, endpoint.length - 1)}/:id`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
    //@ts-ignore
    if (!model.enduserActions?.delete && (model.defaultActions.delete || model.customActions.delete)) {
      await async_test(
        `no-enduser-access delete (${endpoint})`,
        () => enduserSDK.DELETE(`/v1/${endpoint.substring(0, endpoint.length - 1)}/:id`), 
        { shouldError: true, onError: (e: any) => e === 'Unauthenticated' || e?.message === 'This action is not allowed' }
      )
    } 
  }

  await async_test(
    `enduser can update self`,
    () => enduserSDK.api.endusers.updateOne(enduser.id, { fname: "Sebastian", lname: "Coates" }), 
    { onResult: e => e.id === enduser.id && e.fname === 'Sebastian' && e.lname === "Coates" }
  )
  await async_test(
    `enduser can't update other enduser`,
    () => enduserSDK.api.endusers.updateOne(enduser2.id, { fname: "Shouldn't Work"}), 
    { shouldError: true, onError: e => e.message === "Could not find a record for the given id" }
  )

  const ticketAccessible = await sdk.api.tickets.createOne({ enduserId: enduser.id, title: "Accessible ticket" })
  const ticketInaccessible = await sdk.api.tickets.createOne({ enduserId: PLACEHOLDER_ID, title: "Inaccessible ticket" })
  await async_test(
    `enduser cannot create ticket for another enduser`,
    () => enduserSDK.api.tickets.createOne({ enduserId: sdk.userInfo.id, title: "Error on Creation" }),
    { shouldError: true, onError: e => !!e.message }
  )
  await async_test(
    `enduser-access default, no access constraints, matching enduserId`,
    () => enduserSDK.api.tickets.getOne(ticketAccessible.id),
    { onResult: t => t.id === ticketAccessible.id }
  )
  await async_test(
    `no-enduser-access default, no access constraints, non-matching enduserId`,
    () => enduserSDK.api.tickets.getOne(ticketInaccessible.id),
    { shouldError: true, onError: e => e.message.startsWith("Could not find")}
  )
  await async_test(
    `no-enduser-access default, no access constraints, get many`,
    () => enduserSDK.api.tickets.getSome(),
    { onResult: ts => ts.length === 1 }
  )

  await sdk.api.tickets.deleteOne(ticketAccessible.id)
  await sdk.api.tickets.deleteOne(ticketInaccessible.id)
  await sdk.api.endusers.deleteOne(enduser.id)
  await sdk.api.endusers.deleteOne(enduser2.id)
}

const files_tests = async () => {
  const enduser = await sdk.api.endusers.createOne({ email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error)

  const buff = buffer.Buffer.from('test file data')

  await async_test(
    `non admin can prepare file upload`,
    () => sdkNonAdmin.api.files.prepare_file_upload({ 
      name: 'Test File', size: buff.byteLength, type: 'text/plain' 
    }),
    { onResult: t => true }
  )

  const { presignedUpload, file } = await sdk.api.files.prepare_file_upload({ 
    name: 'Test File', size: buff.byteLength, type: 'text/plain' 
  })
  await sdk.UPLOAD(presignedUpload, buff)

  const { downloadURL } = await sdk.api.files.file_download_URL({ secureName: file.secureName })
  const downloaded: string = await sdk.DOWNLOAD(downloadURL)

  assert(downloaded === buff.toString(), 'downloaded file does not match uploaded file', 'upload, download comparison') 

  const { downloadURL: cachedURL } = await sdk.api.files.file_download_URL({ secureName: file.secureName })
  assert(downloadURL === cachedURL, 'cache download url failed', 'download url cache')

  const { downloadURL: urlForEnduser } = await enduserSDK.api.files.file_download_URL({ secureName: file.secureName })
  assert(downloadURL === urlForEnduser, 'failed to get download url for enduser', 'download url for enduser')

  await sdk.api.endusers.deleteOne(enduser.id)
}

const enduser_session_tests = async () => {
  log_header("Enduser Session")
  const email = 'enduser@tellescope.com'
  const password = 'testpassword'

  const enduser = await sdk.api.endusers.createOne({ email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error)

  const users = await enduserSDK.api.users.display_info()
  assert(users && users.length > 0, 'No users returned', 'Get user display info for enduser')

  await sdk.api.endusers.deleteOne(enduser.id)
}

const users_tests = async () => {
  log_header("Users Tests")
  const randomFieldValue = crypto.randomBytes(32).toString('hex').toUpperCase() // uppercase so name parsing doesn't cause case change
  const randomFieldNumber = Math.random()

  /* Update user tests */
  await async_test(
    `update user (non-admin, other user)`,
    () => sdkNonAdmin.api.users.updateOne(sdk.userInfo.id, { fname: randomFieldValue }),
    { shouldError: true, onError: e => e.message === "Only admin users can update others' profiles" }
  )
  await async_test(
    `verify no update`,
    () => sdk.api.users.getOne(sdk.userInfo.id),
    { onResult: u => u.fname !== randomFieldValue }
  )
  await async_test(
    `update user (non-admin, self)`,
    () => sdkNonAdmin.api.users.updateOne(sdkNonAdmin.userInfo.id, { fname: 'Updated' }),
    { onResult: u => u.id === sdkNonAdmin.userInfo.id && u.fname === "Updated" }
  )
  await async_test(
    `verify user update with admin get`,
    () => sdk.api.users.getOne(sdkNonAdmin.userInfo.id), 
    { onResult: u => u.id === sdkNonAdmin.userInfo.id && u.fname === "Updated" }
  )

  // reset fname to "Non" if this test throws, otherwise will falsely pass on next run
  // NOT Supported behavior any more
  // assert(sdkNonAdmin.userInfo.fname === 'Updated', 'refresh_session not called on self after update', 'sdk updated on user update')

  await async_test(
    `update user (admin, other user)`,
    () => sdk.api.users.updateOne(sdkNonAdmin.userInfo.id, { fname: 'Non' }), // change back
    { onResult: u => u.id === sdkNonAdmin.userInfo.id && u.fname === "Non" }
  )
  // sdkNonAdmin.userInfo.fname = 'Non' // update back in sdk instance as well

  await async_test(
    `verify user update with admin get`,
    () => sdk.api.users.getOne(sdkNonAdmin.userInfo.id), 
    { onResult: u => u.id === sdkNonAdmin.userInfo.id && u.fname === "Non" }
  )

  await async_test(
    `update user (custom fields)`,
    () => sdk.api.users.updateOne(sdk.userInfo.id, { fields: { boolean: true, f1: randomFieldValue, f2: randomFieldNumber, f3: { object: randomFieldValue } } }), // change back
    { onResult: u => u.id === sdk.userInfo.id && u.fields?.f1 === randomFieldValue && u.fields?.f2 === randomFieldNumber && (u.fields?.f3 as any).object == randomFieldValue }
  )
  // sdkNonAdmin.userInfo.fname = 'Non' // update back in sdk instance as well

  await async_test(
    `verify user update (custom fields)`,
    () => sdk.api.users.getOne(sdk.userInfo.id), 
    { onResult: u => u.id === sdk.userInfo.id && u.fields?.f1 === randomFieldValue && u.fields?.f2 === randomFieldNumber && (u.fields?.f3 as any).object == randomFieldValue }
  )
}

const calendar_events_tests = async () => {
  log_header("Calendar Events")

  const { id } = await sdk.api.endusers.createOne({ email })
  const { authToken, enduser } = await sdk.api.endusers.generate_auth_token({ id })
  const enduserSDK = new EnduserSession({ host, authToken, enduser, businessId: sdk.userInfo.businessId })

  const event = await sdk.api.calendar_events.createOne({ 
    title: "Event", durationInMinutes: 30, startTimeInMS: Date.now()
  })
  const eventWithEnduser = await sdk.api.calendar_events.createOne({ 
    title: "Event with Enduser", durationInMinutes: 30, startTimeInMS: Date.now(), attendees: [{ id, type: 'enduser' }]
  })
  const publicEvent = await sdk.api.calendar_events.createOne({ 
    title: "Event", durationInMinutes: 30, startTimeInMS: Date.now(), publicRead: true,
  })

  await async_test(
    `user can access own event`,
    () => sdk.api.calendar_events.getOne(event.id),
    { onResult: e => e && e.id === event.id }
  ) 
  await async_test(
    `user can access public event`,
    () => sdk.api.calendar_events.getOne(publicEvent.id),
    { onResult: e => e && e.id === publicEvent.id }
  ) 
  // TODO: implement support for publicRead for users, 
  // await async_test(
  //   `non-creator, non-admin user can access public event`,
  //   () => sdkNonAdmin.api.calendar_events.getOne(publicEvent.id),
  //   { onResult: e => e && e.id === event.id }
  // ) 
  await async_test(
    `user can access own events and public events`,
    () => sdk.api.calendar_events.getSome(),
    { onResult: es => es && es.length === 3 }
  ) 
  await async_test(
    `user can access own event with enduser attendee`,
    () => sdk.api.calendar_events.getOne(eventWithEnduser.id),
    { onResult: e => e && e.id === eventWithEnduser.id }
  ) 

  await async_test(
    `enduser can't access uninvited event`,
    () => enduserSDK.api.calendar_events.getOne(event.id),
    { shouldError: true, onError: e => e.message === "Could not find a record for the given id" }
  ) 
  await async_test(
    `enduser can access event as attendee`,
    () => enduserSDK.api.calendar_events.getOne(eventWithEnduser.id),
    { onResult: e => e && e.id === eventWithEnduser.id }
  ) 
  await async_test(
    `enduser can access public event`,
    () => enduserSDK.api.calendar_events.getOne(publicEvent.id),
    { onResult: e => e && e.id === publicEvent.id }
  ) 
  await async_test(
    `enduser can access own events and public events`,
    () => enduserSDK.api.calendar_events.getSome(),
    { onResult: es => es && es.length === 2 }
  ) 
  await async_test(
    `enduser cannot update publicEvent `,
    () => enduserSDK.api.calendar_events.updateOne(publicEvent.id, { title: "CHANGED "}),
    handleAnyError
  ) 
  await async_test(
    `enduser cannot delete publicEvent`,
    () => enduserSDK.api.calendar_events.deleteOne(publicEvent.id),
    handleAnyError
  ) 

  await Promise.all([
    sdk.api.endusers.deleteOne(enduser.id),
    sdk.api.calendar_events.deleteOne(event.id),
    sdk.api.calendar_events.deleteOne(eventWithEnduser.id),
    sdk.api.calendar_events.deleteOne(publicEvent.id),
  ])
}

const formEventTests = async () => {
  log_header("Form Events")

  const enduser = await sdk.api.endusers.createOne({ email: 'deletemeee@tellescope.com' })
  const journey = await sdk.api.journeys.createOne({ title: 'test journey '})
  const form = await sdk.api.forms.createOne({
    title: 'test form',
    fields: [{ title: 'question', type: 'string' }],
  })

  const triggerStep = await sdk.api.automation_steps.createOne({
    journeyId: journey.id,
    event: { type: 'onJourneyStart', info: { } },
    // in practice, this would send a form, so that the next step(s) could handle the response
    // but we don't want to send emails in testing, and can still attach this Id to a form response to test a trigger
    action: {
      type: 'setEnduserStatus', 
      info: { status: 'placeholder' },
    },
  })
  await sdk.api.automation_steps.createOne({
    journeyId: journey.id,
    event: { 
      type: 'formResponse', 
      info: { automationStepId: triggerStep.id } 
    },
    action: {
      type: 'setEnduserStatus',
      info: { status: 'placeholder' },
    },
  })

  const { accessCode: acNoStep } = await sdk.api.form_responses.prepare_form_response({ formId: form.id, enduserId: enduser.id })
  const { accessCode: acStep } = await sdk.api.form_responses.prepare_form_response({ formId: form.id, enduserId: enduser.id })

  await sdk.api.form_responses.submit_form_response({ accessCode: acNoStep, responses: ['answer'] })
  await sdk.api.form_responses.submit_form_response({ accessCode: acStep, automationStepId: triggerStep.id, responses: ['answer'] })
  await wait(undefined, 250) // allow background creation with generous pause

  await async_test(
    `Without automation stepId, form response handler is not triggered`,
    () => sdk.api.automated_actions.getSome(),
    { onResult: steps => steps.length === 1 /* NOT 2 or more */ }
  )  

  await Promise.all([
    sdk.api.forms.deleteOne(form.id),
    sdk.api.journeys.deleteOne(journey.id),
    sdk.api.endusers.deleteOne(enduser.id)
  ])
}

const ticketEventTests = async () => {
  log_header("Ticket Events")

  const testCloseReasons = ['Yes', 'No', 'Maybe']

  const enduser = await sdk.api.endusers.createOne({ email: 'deletemeee@tellescope.com' })
  const enduserWithTeam = await sdk.api.endusers.createOne({ email: 'deleteme2@tellescope.com', assignedTo: [sdkNonAdmin.userInfo.id] })

  const journey = await sdk.api.journeys.createOne({ title: 'test journey with completion options'})
  const nullJourney = await sdk.api.journeys.createOne({ title: 'test journey null'})

  const root = await sdk.api.automation_steps.createOne({
    journeyId: journey.id,
    event: { type: 'onJourneyStart', info: { } },
    action: {
      type: 'createTicket', 
      info: { 
        title: 'close reasons tests',
        assignmentStrategy: {
          type: 'care-team-random', 
          info: {},
        },
        closeReasons: testCloseReasons,
        defaultAssignee: sdk.userInfo.id,
      },
    },
  })
  const nullRoot = await sdk.api.automation_steps.createOne({
    journeyId: nullJourney.id,
    event: { type: 'onJourneyStart', info: { } },
    action: {
      type: 'createTicket', 
      info: { 
        title: 'null test',
        assignmentStrategy: {
          type: 'care-team-random', 
          info: {},
        },
        closeReasons: [],
        defaultAssignee: sdk.userInfo.id,
      },
    },
  })

  const createStep = (journeyId: string, automationStepId: string, closedForReason?: string ) => (
    sdk.api.automation_steps.createOne({
      journeyId,
      event: { type: 'ticketCompleted', info: { automationStepId, closedForReason, } },
      action: { type: 'setEnduserStatus', info: { status: closedForReason ?? 'Null' }, },
    })
  )
  await createStep(nullJourney.id, nullRoot.id)
  await createStep(nullJourney.id, nullRoot.id, testCloseReasons[0])
  await createStep(nullJourney.id, nullRoot.id, testCloseReasons[1])
  await createStep(nullJourney.id, nullRoot.id, testCloseReasons[2])

  await createStep(journey.id, root.id)
  await createStep(journey.id, root.id, testCloseReasons[0])
  await createStep(journey.id, root.id, testCloseReasons[1])
  await createStep(journey.id, root.id, testCloseReasons[2])

  await sdk.api.endusers.updateOne(enduser.id, { journeys: { [journey.id]: 'Added' }})
  await sdk.api.endusers.updateOne(enduserWithTeam.id, { journeys: { [nullJourney.id]: 'Added (Null)' }})
  await wait(undefined, 2000) // wait for tickets to be automatically created

  await async_test(
    `Tickets automatically created`,
    () => sdk.api.tickets.getSome(),
    { onResult: tickets => tickets?.length === 2 }
  )  

  await async_test(
    `Ticket for enduser, default assignment, testCloseReasons`,
    () => sdk.api.tickets.getSome({ filter: { enduserId: enduser.id }}),
    { onResult: tickets => (
        tickets.length === 1 
      && tickets[0].closeReasons?.length === 3
      && tickets[0].owner === sdk.userInfo.id
    )}
  )  
  const ticket = await sdk.api.tickets.getOne({ enduserId: enduser.id })
  await async_test(
    `Ticket for enduser, care team assignment, no reasons`,
    () => sdk.api.tickets.getSome({ filter: { enduserId: enduserWithTeam.id }}),
    { onResult: tickets => tickets.length === 1 
      && tickets[0].closeReasons?.length === 0
      && tickets[0].owner === sdkNonAdmin.userInfo.id
    }
  )  
  const ticketNull = await sdk.api.tickets.getOne({ enduserId: enduserWithTeam.id })

  await sdk.api.tickets.updateOne(ticket.id, { closedForReason: 'Maybe', closedAt: new Date() })
  await sdk.api.tickets.updateOne(ticketNull.id, { closedAt: new Date() })
  await wait(undefined, 250) // wait for actions to be automatically created

  await async_test(
    `Automated actions for handle ticket created`,
    () => sdk.api.automated_actions.getSome(),
    { onResult: (
        actions => actions?.length === 4 // ticket creations + ticket completions = 2 + 2
    && (
      !!actions.find(a => 
        a.event.type === 'ticketCompleted' 
        && a.enduserId === enduser.id 
        && a.action.type === 'setEnduserStatus' 
        && a.action.info.status === 'Maybe' // maybe branch
      )
    )
    && (
      !!actions.find(a => 
        a.event.type === 'ticketCompleted' 
        && a.enduserId === enduserWithTeam.id 
        && a.action.type === 'setEnduserStatus' 
        && a.action.info.status === 'Null' // null branch when completed without closedForReason
      )
    )
    )}
  )  

  await Promise.all([
    sdk.api.journeys.deleteOne(journey.id),
    sdk.api.journeys.deleteOne(nullJourney.id),
    sdk.api.endusers.deleteOne(enduser.id),
    sdk.api.endusers.deleteOne(enduserWithTeam.id),
    sdk.api.tickets.deleteOne(ticket.id),
    sdk.api.tickets.deleteOne(ticketNull.id),
  ])
}

const automation_events_tests = async () => {
  log_header("Automation Events")
  await formEventTests()
  await ticketEventTests()

}

const form_response_tests = async () => {
  log_header("Form Responses")

  const stringResponse = 'Test Response Value'
  const stringIntakeField = 'testIntakeField'
  const stringTitle = 'Test'
  const enduser = await sdk.api.endusers.createOne({ email: "formresponse@tellescope.com" })
  const form = await sdk.api.forms.createOne({
    title: 'test form',
    fields: [{
      title: stringTitle,
      description: 'Enter a string',
      type: 'string',
      isOptional: false,
      intakeField: stringIntakeField
    }]
  })
  // await sdk.api.automation_steps.createOne({
  //   event: { type: "formResponse", info: { formId: form.id } },
  //   action: { type: 'sendWebhook', info: { message: 'test' } },
  // })

  const { accessCode } = await sdk.api.form_responses.prepare_form_response({ formId: form.id, enduserId: enduser.id })
  await sdk.api.form_responses.submit_form_response({ accessCode, responses: [stringResponse]  })

  // const [triggeredAutomation] = await sdk.api.automated_actions.getSome()
  const enduserWithUpdate = await sdk.api.endusers.getOne(enduser.id)
  const recordedResponse = await sdk.api.form_responses.getOne({ accessCode })

  // assert(triggeredAutomation?.event?.type === 'formResponse', 'no form response event', 'form response event triggered')
  assert(enduserWithUpdate?.fields?.[stringIntakeField] === stringResponse, 'no enduser update', 'enduser updated')
  assert(
    recordedResponse?.responses?.length === 1 && recordedResponse.responses[0]?.[stringTitle] === stringResponse, 
    'response not recorded', 
    'response recorded'
  )

  await sdk.api.endusers.deleteOne(enduser.id)
  await sdk.api.forms.deleteOne(form.id)
}

export const meetings_tests = async () => {
  log_header("Meetings")

  const enduser = await sdk.api.endusers.createOne({ email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error) 

  const privateMeeting = await sdk.api.meetings.start_meeting({ })
  const publicMeeting = await sdk.api.meetings.start_meeting({ publicRead: true })

  await async_test(
    `Admin can get meetings`,
    sdk.api.meetings.getSome,
    { onResult: () => true },
  ) 
  await async_test(
    `Non-Admin can't get meetings`,
    sdkNonAdmin.api.meetings.getSome,
    { shouldError: true, onError: e => e.message === "Admin access only" },
  ) 

  await async_test(
    `Enduser can access public meeting, not private meeting`,
    enduserSDK.api.meetings.my_meetings,
    { onResult: ms => ms.length === 1 && !!ms.find(m => m.id === publicMeeting.id) }
  )

  await Promise.all([
    sdk.api.meetings.end_meeting({ id: publicMeeting.id }),
    sdk.api.meetings.end_meeting({ id: privateMeeting.id }),
    sdk.api.endusers.deleteOne(enduser.id),
  ])

  // await Promise.all([
  //   sdk.api.meetings.deleteOne(publicMeeting.id),
  //   sdk.api.meetings.deleteOne(privateMeeting.id),
  // ])
}

const search_tests = async () => {
  log_header("Search")

  const e1 = await sdk.api.endusers.createOne({ email: 'e1_search@tellescope.com', fname: 'JoHn', lname: "strauss" })
  const e2 = await sdk.api.endusers.createOne({ email: 'e2_search@tellescope.com', fname: 'sebastian', lname: "coates" })
  
  await async_test(
    `Search full fname case insensitive`,
    () => sdk.api.endusers.getSome({ search: { query: 'john'} }),
    { onResult: es => es.length === 1 && es[0].id === e1.id },
  )  
  await async_test(
    `Search start fname case insensitive`,
    () => sdk.api.endusers.getSome({ search: { query: 'joh'} }),
    { onResult: es => es.length === 1 && es[0].id === e1.id },
  )  
  await async_test(
    `Search end fname case insensitive`,
    () => sdk.api.endusers.getSome({ search: { query: 'ohn'} }),
    { onResult: es => es.length === 1 && es[0].id === e1.id },
  )  
  await async_test(
    `Search by email`,
    () => sdk.api.endusers.getSome({ search: { query: 'search@tellescope'} }),
    { onResult: es => es.length === 2 },
  )  

  await Promise.all([
    sdk.api.endusers.deleteOne(e1.id),
    sdk.api.endusers.deleteOne(e2.id),
  ])
}

const notifications_tests = async () => {
  log_header("Notifications")

  const room = await sdk.api.chat_rooms.createOne({ type: 'internal', userIds: [sdk.userInfo.id, sdkNonAdmin.userInfo.id ]})
  const chat = await sdk.api.chats.createOne({ message: 'test', roomId: room.id, })
  const ticket = await sdk.api.tickets.createOne({ title: 'Ticket for notification', owner: sdkNonAdmin.userInfo.id })
  
  await wait(undefined, 250) // notifications may be created in background

  // neither should throw error
  const ticketNotifications = await sdk.api.user_notifications.getSome({ filter: { type: 'newTicket' } }) 
  const chatNotifications = await sdk.api.user_notifications.getSome({ filter: { type: 'newTeamChatMessage' } }) 

  assert(!!ticketNotifications.find(n => n.relatedRecords?.find(r => r.id === ticket.id)), 'No ticket notification', 'Got notification for new new ticket')
  assert(!!chatNotifications.find(notification => notification.relatedRecords?.find(r => r.id === chat.id)), 'No chat notification', 'Got notification for new chat')

  await Promise.all([
    sdk.api.chat_rooms.deleteOne(room.id),
    sdk.api.tickets.deleteOne(ticket.id),
    sdk.api.user_notifications.deleteOne(ticketNotifications.find(n => n.relatedRecords?.find(r => r.id === ticket.id))!.id),
    ...chatNotifications.map(n => 
      sdk.api.user_notifications.deleteOne(n.id),
    ),
  ])
}

const handleAnyError = { shouldError: true, onError: () => true }
const passOnAnyResult = { onResult: () => true }

const role_based_access_tests = async () => {
  log_header("Role Based Access Tests")
  const adminId = sdk.userInfo.id
  const nonAdminId = sdkNonAdmin.userInfo.id

  const e = await sdk.api.endusers.createOne({ email: 'roletest@gmail.com' })

  const adminTicket = await sdk.api.tickets.createOne({ title: 'ticket', enduserId: e.id, owner: adminId })
  const nonAdminTicket = await sdk.api.tickets.createOne({ title: 'ticket', enduserId: e.id, owner: nonAdminId })
  const nonAdminTicketNoEnduser = await sdk.api.tickets.createOne({ title: 'ticket', owner: nonAdminId })
  const ticketCreatedByNonAdmin = await sdkNonAdmin.api.tickets.createOne({ title: 'ticket' })

  const email = await sdk.api.emails.createOne({ enduserId: e.id, logOnly: true, subject: 'blah', textContent: 'blah blah' })
  const sms = await sdk.api.sms_messages.createOne({ enduserId: e.id, logOnly: true, message: 'blah blah' })
  const calendarEvent = await sdk.api.calendar_events.createOne({ 
    attendees: [{ id: e.id, type: 'enduser' }],
    durationInMinutes: 50,
    startTimeInMS: 2000000,
    title: 'Access Test'
  })

  const chatRoom = await sdk.api.chat_rooms.createOne({ enduserIds: [e.id ]})
  const chatMessage = await sdk.api.chats.createOne({ roomId: chatRoom.id, message: 'test chat access' })
  await sdk.api.chats.createOne({ roomId: chatRoom.id, message: 'test chat access 2' })

  // unassigned to enduser access tests
  await async_test(
    `Admin / creator can access enduser without being assigned`,
    () => sdk.api.endusers.getOne(e.id),
    { onResult: e => !!e },
  )  
  await async_test(
    `Unassigned non-admin can't access enduser without being assigned`,
    () => sdkNonAdmin.api.endusers.getOne(e.id), handleAnyError,
  )  
  await async_test(
    `non-admin for enduser ticket bad`,
    () => sdkNonAdmin.api.tickets.getOne(adminTicket.id), handleAnyError,
  )  
  await async_test(
    `Non-admin for ticket`, () => sdkNonAdmin.api.tickets.getOne(nonAdminTicketNoEnduser.id), passOnAnyResult
  )  
  await async_test(
    `Non-admin for enduser ticket`, () => sdkNonAdmin.api.tickets.getOne(nonAdminTicket.id), passOnAnyResult
  )  
  await async_test(
    `Non-admin for own ticket`, () => sdkNonAdmin.api.tickets.getOne(ticketCreatedByNonAdmin.id), passOnAnyResult
  )  
  await async_test(
    `Non-admin for tickets`, () => sdkNonAdmin.api.tickets.getSome(), { onResult: ts => ts.length === 3 }
  )  
  await async_test(
    `non-admin for email bad`, () => sdkNonAdmin.api.emails.getOne(email.id), handleAnyError,
  )  
  await async_test(
    `non-admin for sms bad`, () => sdkNonAdmin.api.sms_messages.getOne(sms.id), handleAnyError,
  )  
  await async_test(
    `admin for calendar`, () => sdk.api.calendar_events.getOne(calendarEvent.id), passOnAnyResult,
  )  
  await async_test(
    `non-admin for calendar bad`, () => sdkNonAdmin.api.calendar_events.getOne(calendarEvent.id), handleAnyError,
  )  
  await async_test(
    `non-admin for chat room bad`, () => sdkNonAdmin.api.chat_rooms.getOne(chatRoom.id), handleAnyError,
  )  
  await async_test(
    `non-admin for chat message bad`, () => sdkNonAdmin.api.chats.getOne(chatMessage.id), handleAnyError,
  )  
  await async_test(
    `Non-admin for chats`, () => sdkNonAdmin.api.chats.getSome({ filter: { roomId: chatRoom.id } }), handleAnyError,
  )  

  // unassigned update / delete coverage
  await async_test(
    `non-admin for enduser ticket update bad`,
    () => sdkNonAdmin.api.tickets.updateOne(adminTicket.id, { title: 'updated' }), handleAnyError,
  )  
  await async_test(
    `non-admin for enduser ticket delete bad`, () => sdkNonAdmin.api.tickets.deleteOne(adminTicket.id), handleAnyError,
  )  
  await async_test(
    `non-admin can't delete tickets by default (even with access)`, 
    () => sdkNonAdmin.api.tickets.deleteOne(nonAdminTicket.id), handleAnyError,
  )  

  // set assignees
  await sdk.api.endusers.updateOne(e.id, { assignedTo: [sdk.userInfo.id, sdkNonAdmin.userInfo.id]})

  // assigned access tests
  await async_test(
    `Admin / creator can access enduser while assigned`, () => sdk.api.endusers.getOne(e.id), passOnAnyResult
  )  
  await async_test(
    `Unassigned non-admin can access enduser while assigned`, () => sdkNonAdmin.api.endusers.getOne(e.id), passOnAnyResult
  )  
  await async_test(
    `non-admin for enduser ticket`, () => sdkNonAdmin.api.tickets.getOne(adminTicket.id), passOnAnyResult,
  )  
  await async_test(
    `Non-admin for ticket`, () => sdkNonAdmin.api.tickets.getOne(nonAdminTicketNoEnduser.id), passOnAnyResult
  )  
  await async_test(
    `Non-admin for enduser ticket`, () => sdkNonAdmin.api.tickets.getOne(nonAdminTicket.id), passOnAnyResult
  )  
  await async_test(
    `Non-admin for tickets`, () => sdkNonAdmin.api.tickets.getSome(), { onResult: ts => ts.length === 4 }
  )  
  await async_test(
    `non-admin for email`, () => sdkNonAdmin.api.emails.getOne(email.id), passOnAnyResult,
  )  
  await async_test(
    `non-admin for sms`, () => sdkNonAdmin.api.sms_messages.getOne(sms.id), passOnAnyResult,
  )  
  await async_test(
    `non-admin for calendar`, () => sdkNonAdmin.api.calendar_events.getOne(calendarEvent.id), passOnAnyResult,
  )  
  await async_test(
    `non-admin for chat room`, () => sdkNonAdmin.api.chat_rooms.getOne(chatRoom.id), passOnAnyResult,
  )  
  await async_test(
    `non-admin for chat message`, () => sdkNonAdmin.api.chats.getOne(chatMessage.id), passOnAnyResult,
  )  
  await async_test(
    `Non-admin for chats`, () => sdkNonAdmin.api.chats.getSome({ filter: { roomId: chatRoom.id } }), 
    { onResult: cs => cs.length === 2 },
  )  


  // update / delete coverage for assigned tickets
  await async_test(
    `non-admin assigned enduser ticket update find`,
    () => sdkNonAdmin.api.tickets.updateOne(adminTicket.id, { title: 'updated' }), passOnAnyResult,
  )  
  await async_test(
    `non-admin for enduser ticket delete still bad`, () => sdkNonAdmin.api.tickets.deleteOne(adminTicket.id), handleAnyError,
  )  

  // cleanup
  await Promise.all([
    sdk.api.endusers.deleteOne(e.id),
    sdk.api.tickets.deleteOne(adminTicket.id),
    sdk.api.tickets.deleteOne(nonAdminTicket.id),
    sdk.api.tickets.deleteOne(nonAdminTicketNoEnduser.id),
    sdk.api.tickets.deleteOne(ticketCreatedByNonAdmin.id),
    sdk.api.emails.deleteOne(email.id),
    sdk.api.sms_messages.deleteOne(sms.id),
    sdk.api.calendar_events.deleteOne(calendarEvent.id),
    sdk.api.chat_rooms.deleteOne(chatRoom.id),
  ])
}

const status_update_tests = async () => {
  log_header("Enduser Status Updates")

  const journey = await sdk.api.journeys.createOne({ title: 'test' })
  const enduser = await sdk.api.endusers.createOne({ email: 'delete@tellescope.com'  })
  const status  = await sdk.api.enduser_status_updates.createOne({ enduserId: enduser.id, journeyId: journey.id, status: "Working"})

  // status update on enduser is a side effect
  await wait(undefined, 100)
  await async_test(
    `status update`, () => sdk.api.endusers.getOne(enduser.id), {
      onResult: e => e.journeys?.[journey.id] === status.status
    },
  )  

  await Promise.all([
    sdk.api.journeys.deleteOne(journey.id), // status deleted as side effect 
    sdk.api.endusers.deleteOne(enduser.id), // status deleted as side effect
  ])
}

const community_tests = async () => {
  log_header("Community")

  const enduser = await sdk.api.endusers.createOne({ email })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error) 

  const forum = await sdk.api.forums.createOne({ title: 'test', publicRead: true })
  const privateForum = await sdk.api.forums.createOne({ title: 'test 2', publicRead: false })

  await async_test(
    `enduser access forum`, () => enduserSDK.api.forums.getOne(forum.id), { onResult: f => f.id === forum.id } 
  )  
  await async_test(`enduser access privateForum error`, () => enduserSDK.api.forums.getOne(privateForum.id), handleAnyError)  

  const enduserPost = await enduserSDK.api.forum_posts.createOne({ forumId: forum.id, htmlContent: 'enduser', textContent: 'enduser' })
  assert(!!enduserPost, 'enduser post failed', 'enduser post successful')
  const userPost = await sdk.api.forum_posts.createOne({ forumId: forum.id, htmlContent: 'user', textContent: 'user' })
  assert(!!userPost, 'user post failed', 'user post successful')

  assert(enduserPost.numComments === 0 && enduserPost.numLikes === 0, 'counts not initialized', 'counts initialized at 0')

  await async_test(
    `enduser post private??errors`, 
    () => enduserSDK.api.forum_posts.createOne({ forumId: privateForum.id, htmlContent: 'enduser', textContent: 'enduser' }), 
    handleAnyError
  )  

  await async_test(
    `enduser can access single post for forumId`, 
    () => enduserSDK.api.forum_posts.getOne({ forumId: forum.id }), 
    passOnAnyResult,
  )
  await async_test(
    `enduser can access self post by id`, 
    () => enduserSDK.api.forum_posts.getOne(enduserPost.id), 
    passOnAnyResult,
  )
  await async_test(
    `enduser can access other post by id`, 
    () => enduserSDK.api.forum_posts.getOne(userPost.id), 
    passOnAnyResult,
  )
  await async_test(
    `enduser can access posts`, 
    () => enduserSDK.api.forum_posts.getSome({ filter: { forumId: forum.id } }), 
    { onResult: r => r.length === 2 }
  )  
  
  const enduserSelfComment = await enduserSDK.api.post_comments.createOne({ forumId: forum.id, postId: enduserPost.id, htmlContent: 'enduser', textContent: 'enduser' })
  const userComment = await sdk.api.post_comments.createOne({ forumId: forum.id, postId: enduserPost.id, htmlContent: 'user', textContent: 'user' })
  assert(!!enduserSelfComment, 'enduser comment failed', 'enduser comment successful')
  assert(!!userComment, 'user comment failed', 'user comment successful')
  await async_test(
    `enduser can access post comments`, 
    () => enduserSDK.api.post_comments.getSome({ filter: { forumId: forum.id, postId: enduserPost.id  } }), 
    { onResult: r => r.length === 2 }
  )

  await enduserSDK.api.post_likes.createOne({ forumId: forum.id, postId: enduserPost.id })
  await async_test(
    `double-like not allowed`, 
    () => enduserSDK.api.post_likes.createOne({ forumId: forum.id, postId: enduserPost.id }),
    handleAnyError
  )  

  await wait(undefined, 50)
  await async_test(
    `post and like counts on create`, 
    () => sdk.api.forum_posts.getOne(enduserPost.id), 
    { onResult: p => p.numComments === 2 && p.numLikes === 1}
  )  

  await enduserSDK.api.post_likes.unlike_post({ postId: enduserPost.id, forumId: enduserPost.forumId })
  await wait(undefined, 50)
  await async_test(
    `post and like counts after unlike`, 
    () => sdk.api.forum_posts.getOne(enduserPost.id), 
    { onResult: p => p.numComments === 2 && p.numLikes === 0 }
  )  


  const userSelfPost = await sdk.api.forum_posts.createOne({ forumId: privateForum.id, htmlContent: 'user', textContent: 'user' })
  assert(!!userSelfPost, 'user private post failed', 'user private post successful')

  const userSelfPostComment = await sdk.api.post_comments.createOne({ forumId: privateForum.id, postId: userSelfPost.id, htmlContent: 'user', textContent: 'user' })
  assert(!!userSelfPostComment, 'user private post comment failed', 'user private post comment successful')

  await async_test(
    `enduser comment private??errors`, 
    () => enduserSDK.api.post_comments.createOne({ forumId: privateForum.id, postId: userSelfPost.id, htmlContent: 'enduser', textContent: 'enduser' }), 
    handleAnyError
  )  
  await async_test(
    'enduser cannot access private post by id',
    () => enduserSDK.api.forum_posts.getOne(userSelfPost.id),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private post by filter',
    () => enduserSDK.api.forum_posts.getOne({ forumId: privateForum.id }),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private comment by id',
    () => enduserSDK.api.post_comments.getOne(userSelfPostComment.id),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private comment by filter (forum id)',
    () => enduserSDK.api.post_comments.getOne({ forumId: privateForum.id }),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private comment by filter (post id)',
    () => enduserSDK.api.post_comments.getOne({ postId: userSelfPost.id }),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private comment by filter (forum and post id)',
    () => enduserSDK.api.post_comments.getOne({ forumId: privateForum.id, postId: userSelfPost.id }),
    handleAnyError,
  )
  await async_test(
    'enduser cannot access private posts',
    () => enduserSDK.api.forum_posts.getSome({ filter: { forumId: privateForum.id }}),
    handleAnyError,
    // { onResult: posts => posts.length === 0 },
  )
  await async_test(
    'enduser cannot access private comments',
    () => enduserSDK.api.post_comments.getSome({ filter: { forumId: privateForum.id }}),
    handleAnyError,
    // { onResult: comments => comments.length === 0 },
  )
  
  await Promise.all([
    await sdk.api.endusers.deleteOne(enduser.id),
    await sdk.api.forums.deleteOne(forum.id),
    await sdk.api.forums.deleteOne(privateForum.id),
  ])
}

const enduser_redaction_tests = async () => {
  log_header("Enduser Redaction")

  const enduser = await sdk.api.endusers.createOne({ email })
  const enduserOther = await sdk.api.endusers.createOne({ email: 'otherenduser@tellescope.com' })
  await sdk.api.endusers.set_password({ id: enduser.id, password }).catch(console.error)
  await enduserSDK.authenticate(email, password).catch(console.error)  

  const endusers = await enduserSDK.api.endusers.getSome()
  assert(endusers.length > 0, "enduser can't fetch others", "enduser get others successful")

  const redactedFields = (
    Object.keys(schema.endusers.fields)
    .filter(f => schema.endusers.fields[f as keyof typeof schema.endusers.fields]?.redactions?.includes('enduser'))
  )
  assert(redactedFields.length > 0, 'no redacted fields', 'redacted fields exists')

  assert(
    endusers.find(e => redactedFields.filter(f => !!e[f as keyof typeof e]).length > 0) === undefined,
    'got redacted data',
    'data correctly redacted',
  )

  await Promise.all([
    sdk.api.endusers.deleteOne(enduser.id),
    sdk.api.endusers.deleteOne(enduserOther.id),
  ])
}

const NO_TEST = () => {}
const tests: { [K in keyof ClientModelForName]: () => void } = {
  chats: chat_tests,
  endusers: enduser_tests,
  api_keys: api_key_tests,
  engagement_events: engagement_tests,
  journeys: journey_tests,
  tasks: tasks_tests,
  emails: email_tests,
  sms_messages: sms_tests,
  chat_rooms: chat_room_tests,
  users: users_tests,
  templates: NO_TEST,
  files: files_tests,
  tickets: NO_TEST,
  meetings: meetings_tests,
  notes: NO_TEST,
  forms: NO_TEST,
  form_responses: form_response_tests,
  calendar_events: calendar_events_tests,
  webhooks: NO_TEST, // tested separately,
  automation_steps: automation_events_tests,
  sequence_automations: NO_TEST,
  automated_actions: NO_TEST,
  enduser_status_updates: status_update_tests,
  user_logs: NO_TEST,
  user_notifications: notifications_tests,
  enduser_observations: NO_TEST,
  forum_posts: NO_TEST,
  forums: community_tests,
  managed_content_records: NO_TEST,
  post_comments: NO_TEST,
  post_likes: NO_TEST,
};

(async () => {
  log_header("API")

  try {
    await Promise.all([
      sdk.authenticate(email, password),
      sdkNonAdmin.authenticate(nonAdminEmail, nonAdminPassword),
    ]) 
    await setup_tests()
    await multi_tenant_tests() // should come right after setup tests
    await search_tests()
    await badInputTests()
    await filterTests()
    await updatesTests()
    await threadKeyTests()
    await enduserAccessTests()
    await generateEnduserAuthTests()
    await enduser_session_tests()
    await role_based_access_tests()
    await enduser_redaction_tests()
  } catch(err) {
    console.error("Failed during custom test")
    console.error(err)
    process.exit(1)
  }


  let n: keyof typeof schema;
  for (n in schema) {
    const returnValidation = (schema[n].customActions as any)?.create?.returns

    await run_generated_tests({
      queries: sdk.api[n] as any, 
      model: schema[n] as any, 
      name: n,
      returns: {
        create: returnValidation as any// ModelFields<ClientModel>,
      }
    })
  }

  let t: keyof typeof tests
  for (t in tests) {
    try {
      await tests[t]()  
    } catch(err) {
      console.error("Error running test:")
      console.error(err)
      process.exit(1)
    }
  }

  process.exit()
})()
