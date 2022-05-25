import { createHash } from "crypto"
import {
  assert,
  async_test,
  log_header,
  wait,
} from "@tellescope/testing"
import {
  objects_equivalent,
} from "@tellescope/utilities"
import {
  ChatMessage, Enduser,
} from "@tellescope/types-client"
import {
  Indexable,
} from "@tellescope/types-utilities"
import { EnduserSession } from "../enduser"
import { Session, /* APIQuery */ } from "../sdk"
import { PLACEHOLDER_ID } from "@tellescope/constants"
import { UserSession } from "@tellescope/types-models"

export const get_sha256 = (s='') => createHash('sha256').update(s).digest('hex')

const VERBOSE = true

const AWAIT_SOCKET_DURATION = 150 // 25ms was generally passing for Redis, 1000ms should be upper limit of performance

const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]
const businessId = '60398b1131a295e64f084ff6'

const user1 = new Session({ host, enableSocketLogging: VERBOSE })
const user2 = new Session({ host, enableSocketLogging: VERBOSE })
const enduserSDK = new EnduserSession({ host, businessId, enableSocketLogging: VERBOSE })
if (!(email && password && email2 && password2)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit(1)
}

// consistent passing at 150ms AWAIT SOCKET DURATION
const basic_tests = async () => {
  const socket_events: Indexable[] = []

  user2.subscribe({ 'endusers': 'endusers' }, {
    'created-endusers': es => socket_events.push(es),
    'updated-endusers': es => socket_events.push(es),
    'deleted-endusers': es => socket_events.push(es),
  })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  const e = await user1.api.endusers.createOne({ email: "sockets@tellescope.com" })
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(objects_equivalent(e, socket_events?.[0]?.[0]), 'inconsistent socket create', 'socket create')

  await user1.api.endusers.updateOne(e.id, { fname: 'Gary' })
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(socket_events[1]?.[0]?.fname === 'Gary', 'inconsistent socket update', 'socket update')

  await user1.api.endusers.deleteOne(e.id)
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(socket_events[2]?.[0] === e.id, 'inconsistent socket delete', 'socket delete')

  const es = (await user1.api.endusers.createSome([{ email: "sockets@tellescope.com" }, { email: 'sockets2@tellescope.com' }])).created
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(objects_equivalent(es, socket_events?.[3]), 'inconsistent socket create many', 'socket create many')
}

const access_tests = async () => {
  const user1Events: Indexable[] = []
  const user2Events: Indexable[] = []
  // const user1Deletions: string[] = []
  // const user2Deletions: string[] = []

  user1.handle_events({
    'created-chat_rooms': rs => user1Events.push(...rs),
    // 'updated-chat_rooms': rs => user1Events.push(...rs), sent message will create update event as cached messagepreview/sender updated
    // 'deleted-chat_rooms': rs => user1Events.push(...rs),
  })
  user2.handle_events({
    'created-chat_rooms': rs => user2Events.push(...rs),
    // 'updated-chat_rooms': rs => user2Events.push(...rs),
    // 'deleted-chat_rooms': rs => user2Events.push(...rs),
  })

  const user1Id = user1.userInfo.id
  const user2Id = user2.userInfo.id

  const room  = await user1.api.chat_rooms.createOne({ type: 'internal', userIds: [user1Id] })
  const sharedRoom  = await user1.api.chat_rooms.createOne({ type: 'internal', userIds: [user1Id, user2Id] })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(user1Events.length === 0, 'bad event distribution for filter', 'verify filter socket no self')
  assert(user2Events.length === 1 && sharedRoom.id === user2Events[0].id, 'bad event distribution for filter', 'verify filter socket push')

  user1.removeAllSocketListeners('created-chat_rooms')
  user1.removeAllSocketListeners('update-chat_rooms')
  user1.removeAllSocketListeners('deleted-chat_rooms')
  user2.removeAllSocketListeners('created-chat_rooms')
  user2.removeAllSocketListeners('update-chat_rooms')
  user2.removeAllSocketListeners('deleted-chat_rooms')

  user1.subscribe({ [room.id]: 'chats' })
  user2.subscribe({ [room.id]: 'chats' }) // connection should be rejected
  user1.subscribe({ [sharedRoom.id]: 'chats' })
  user2.subscribe({ [sharedRoom.id]: 'chats' })  

  user1.handle_events({
    'created-chats': rs => user1Events.push(...rs),
    'updated-chats': rs => user1Events.push(...rs),
    'deleted-chats': rs => user1Events.push(...rs),
  })
  user2.handle_events({
    'created-chats': rs => user2Events.push(...rs),
    'updated-chats': rs => user2Events.push(...rs),
    'deleted-chats': rs => user2Events.push(...rs),
  })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  await user1.api.chats.createOne({ roomId: room.id, message: "Hello!", })
  await user1.api.chats.createOne({ roomId: room.id, message: "Hello...", })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(user1Events.length === 0, 'bad chats subscription', 'verify chats no self')
  assert(user2Events.length === 1, 'bad chats subscription', 'push only for valid subscribers')

  const sharedChat  = await user1.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello!", })
  const sharedChat2 = await user2.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello there!", })
  await wait(undefined, AWAIT_SOCKET_DURATION)
  
  assert(user1Events.length === 1 && user1Events[0].id === sharedChat2.id, 'bad chats subscription', 'verify chat received')
  assert(
    user2Events.length === 2 && user2Events[1].id === sharedChat.id, 
    'bad chats subscription', 'push only for valid subscribers shared'
  )
}

const enduser_tests = async () => {
  log_header("Enduser Tests")
  const enduser = await user1.api.endusers.createOne({ email: "enduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })

  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')
  await enduserSDK.connectSocket()

  const userEvents = [] as ChatMessage[]
  const enduserEvents = [] as ChatMessage[]
  user1.handle_events({
    'created-chats': rs => userEvents.push(...rs),
    'created-tickets': rs => userEvents.push(...rs),
  }) 
  enduserSDK.handle_events({
    'created-chats': rs => enduserEvents.push(...rs),
    'created-tickets': rs => enduserEvents.push(...rs),
  }) 

  const room  = await user1.api.chat_rooms.createOne({ 
    type: 'external', 
    userIds: [user1.userInfo.id],
    enduserIds: [enduser.id],
  })

  user1.subscribe({ [room.id]: 'chats' })
  user1.subscribe({ tickets: 'tickets' })
  enduserSDK.subscribe({ 
    [room.id]: 'chats', 
    dontCache: 'chats', // prevents cacheing of otherwise identical-looking subscriptions for user1 and enduserSDK for chats
  }) 

  await wait(undefined, AWAIT_SOCKET_DURATION)

  const messageToEnduser = await user1.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  const messageToUser    = await enduserSDK.api.chats.createOne({ roomId: room.id, message: "Hello right back!" })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(objects_equivalent(userEvents[0], messageToUser), 'no message on socket', 'push message to user')
  assert(objects_equivalent(enduserEvents[0], messageToEnduser), 'no message on socket', 'push message to enduser')

  const unusedTicket = await user1.api.tickets.createOne({ enduserId: PLACEHOLDER_ID, title: "For Noone" }) // should not get pushed to enduser
  const ticketForEnduser  = await user1.api.tickets.createOne({ enduserId: enduser.id, title: "For enduser" })
  const ticketFromEnduser = await enduserSDK.api.tickets.createOne({ enduserId: enduser.id, title: "By enduser" })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(objects_equivalent(userEvents[1], ticketFromEnduser), 'no ticket on socket for user', 'push ticket to user')
  assert(objects_equivalent(enduserEvents[1], ticketForEnduser), 'no ticket on socket for enduser', 'push ticket to enduser')
  assert(enduserEvents[2] === undefined, 'enduser got an orgwide ticket', 'enduser does not receive org-wide ticket')
  
  await user1.api.tickets.deleteOne(unusedTicket.id)
  await user1.api.tickets.deleteOne(ticketForEnduser.id)
  await user1.api.tickets.deleteOne(ticketFromEnduser.id)

  // test enduser logout
  await enduserSDK.api.endusers.logout()
  await async_test(
    `verify enduser logout works`, 
    () => enduserSDK.api.chats.getOne({}), 
    { shouldError: true, onError: (e: string) => e === 'Unauthenticated' }
    // { shouldError: true, onError: (e: string) => !!e }
  )

  // keep these models around for front-end testing
  // cleanup
  // await user1.api.endusers.deleteOne(enduser.id) 
  // await user1.api.chats.deleteOne(messageToEnduser.id)
  // await user1.api.chats.deleteOne(messageToUser.id)
}

const TEST_SESSION_DURATION = 2 // seconds
const SESSION_TIMEOUT_DELAY = 4000 // ms
const deauthentication_tests = async (byTimeout=false) => {
  log_header(`Unauthenticated Tests ${byTimeout ? '- With Timeout, requires Worker' : '- With Manual Logout' }`)
  
  const enduser = await user1.api.endusers.createOne({ email: "socketenduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!', { durationInSeconds: byTimeout ? TEST_SESSION_DURATION : undefined })
  
  const room  = await user1.api.chat_rooms.createOne({ 
    type: 'external', 
    userIds: [user1.userInfo.id],
    enduserIds: [enduser.id],
  })

  const userEvents = [] as ChatMessage[]
  const enduserEvents = [] as ChatMessage[]
  user1.subscribe({ [room.id]: 'chats' })
  enduserSDK.subscribe({ [room.id]: 'chats' }) 
  user1.handle_events({ 'created-chats': rs => userEvents.push(...rs) }) 
  enduserSDK.handle_events({ 'created-chats': rs => enduserEvents.push(...rs) }) 
  await wait(undefined, AWAIT_SOCKET_DURATION)

  if (!byTimeout) {
    await enduserSDK.api.endusers.logout()
  } else {
    await wait(undefined, TEST_SESSION_DURATION * 1000 + SESSION_TIMEOUT_DELAY) 
  }
  await user1.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(objects_equivalent(enduserEvents[0], undefined), 'enduser got message after logout on socket', 'enduser logged out')

  // re-authenticate enduser to send message to user
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')

  // ensure user logged out appropriately for not receiving message
  await user1.logout()
  if (byTimeout) {
    await user1.authenticate(email, password, { expirationInSeconds: byTimeout ? TEST_SESSION_DURATION : undefined } )
    await wait(undefined, TEST_SESSION_DURATION * 1000 + SESSION_TIMEOUT_DELAY) 
  } else {
    await wait(undefined, AWAIT_SOCKET_DURATION)
  }
  await enduserSDK.api.chats.createOne({ roomId: room.id, message: "Hello right back!" })
  await wait(undefined, AWAIT_SOCKET_DURATION)
  assert(objects_equivalent(userEvents[0], undefined), 'user got message after logout', 'user logged out')


  // must come before cleanup, so cleanup works
  await user1.authenticate(email, password), // reauthenticate for later tests as needed

  // cleanup
  await Promise.all([
    user1.api.endusers.deleteOne(enduser.id),
    user1.api.chat_rooms.deleteOne(room.id), // deletes chats as side effect
  ])
}

export const notification_tests = async () => {
  log_header(`Notification Tests`)

  const userEvents = [] as ChatMessage[]
  user2.handle_events({ 'created-user_notifications': rs => userEvents.push(...rs) }) 

  const notification = await user1.api.user_notifications.createOne({ 
    message: 'test notification',
    type: 'type',
    userId: user2.userInfo.id,
  })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(userEvents.length === 1 && userEvents[0].id === notification.id, 'user did not get notification', 'user got notification')

  // cleanup
  await user1.api.user_notifications.deleteOne(notification.id)
}

const calendar_events = async () => {
  log_header(`Calendar Events Tests`)

  const enduser = await user1.api.endusers.createOne({ email: "socketenduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')
  await enduserSDK.connectSocket()

  const userEvents = [] as ChatMessage[]
  const enduserEvents = [] as ChatMessage[]
  user1.handle_events({ 'created-calendar_events': rs => userEvents.push(...rs) }) 
  enduserSDK.handle_events({ 'created-calendar_events': rs => enduserEvents.push(...rs) }) 

  const event = await user1.api.calendar_events.createOne({ 
    durationInMinutes: 30, 
    startTimeInMS: Date.now(),
    title: 'Test Socket Event',
    attendees: [{ type: 'enduser', id: enduser.id }],
  })
  await wait(undefined, AWAIT_SOCKET_DURATION)

  assert(userEvents.length === 0, 'creator got calendar event', 'calendar event not gone to creator')
  assert(enduserEvents.length === 1 && enduserEvents[0].id === event.id, 'enduser did not get calendar event', 'calendar event on create for attending enduser')

  // cleanup
  await user1.api.endusers.deleteOne(enduser.id)
}

(async () => {
  log_header("Sockets")

  try {
    await user1.authenticate(email, password)
    await user1.reset_db()
    await user2.authenticate(email2, password2) // generate authToken + socket connection for API keyj

    await user1.connectSocket()
    await user2.connectSocket()


    await basic_tests()
    await access_tests()
    await calendar_events()
    await enduser_tests()
    await notification_tests()

    await deauthentication_tests() // should come last!
    await deauthentication_tests(true) // should come last!

  } catch(err) {
    console.error(err)
  }

  process.exit()
})()