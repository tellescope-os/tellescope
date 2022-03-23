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
  ChatMessage,
} from "@tellescope/types-client"
import {
  Indexable,
} from "@tellescope/types-utilities"
import { EnduserSession } from "../enduser"
import { Session, /* APIQuery */ } from "../sdk"
import { PLACEHOLDER_ID } from "@tellescope/constants"

export const get_sha256 = (s='') => createHash('sha256').update(s).digest('hex')

const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]
const businessId = '60398b1131a295e64f084ff6'

const user1 = new Session({ host })
const user2 = new Session({ host })
const enduserSDK = new EnduserSession({ host, businessId })
if (!(email && password && email2 && password2)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit(1)
}

const basic_tests = async () => {
  const socket_events: Indexable[] = []

  user2.subscribe({ 'endusers': 'endusers' }, {
    'created-endusers': es => socket_events.push(es),
    'updated-endusers': es => socket_events.push(es),
    'deleted-endusers': es => socket_events.push(es),
  })

  const e = await user1.api.endusers.createOne({ email: "sockets@tellescope.com" })
  await wait(undefined, 25)
  assert(objects_equivalent(e, socket_events?.[0]?.[0]), 'inconsistent socket create', 'socket create')

  await user1.api.endusers.updateOne(e.id, { fname: 'Gary' })
  await wait(undefined, 25)
  assert(socket_events[1]?.[0]?.fname === 'Gary', 'inconsistent socket update', 'socket update')

  await user1.api.endusers.deleteOne(e.id)
  await wait(undefined, 25)
  assert(socket_events[2]?.[0] === e.id, 'inconsistent socket delete', 'socket delete')

  const es = (await user1.api.endusers.createSome([{ email: "sockets@tellescope.com" }, { email: 'sockets2@tellescope.com' }])).created
  await wait(undefined, 25)
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
  await wait(undefined, 25)

  const sharedRoom  = await user1.api.chat_rooms.createOne({ type: 'internal', userIds: [user1Id, user2Id] })
  await wait(undefined, 25)

  assert(user1Events.length === 0, 'bad event distribution for filter', 'verify filter socket no self')
  assert(user2Events.length === 1 && sharedRoom.id === user2Events[0].id, 'bad event distribution for filter', 'verify filter socket push')

  user1.removeAllSocketListeners('created-chat_rooms')
  user1.removeAllSocketListeners('update-chat_rooms')
  user1.removeAllSocketListeners('deleted-chat_rooms')
  user2.removeAllSocketListeners('created-chat_rooms')
  user2.removeAllSocketListeners('update-chat_rooms')
  user2.removeAllSocketListeners('deleted-chat_rooms')

  user1.subscribe({ [room.id]: 'chats' })
  await wait(undefined, 10)
  user2.subscribe({ [room.id]: 'chats' }) // connection should be rejected
  await wait(undefined, 10)
  user1.subscribe({ [sharedRoom.id]: 'chats' })
  await wait(undefined, 10)
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
  await wait(undefined, 25)

  await user1.api.chats.createOne({ roomId: room.id, message: "Hello!", })
  await user1.api.chats.createOne({ roomId: room.id, message: "Hello...", })
  await wait(undefined, 25)

  assert(user1Events.length === 0, 'bad chats subscription', 'verify chats no self')
  assert(user2Events.length === 1, 'bad chats subscription', 'push only for valid subscribers')

  const sharedChat  = await user1.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello!", })
  await wait(undefined, 25)
  const sharedChat2 = await user2.api.chats.createOne({ roomId: sharedRoom.id, message: "Hello there!", })
  await wait(undefined, 25)
  
  assert(user1Events.length === 1 && user1Events[0].id === sharedChat2.id, 'bad chats subscription', 'verify chat received')
  assert(
    user2Events.length === 2 && user2Events[1].id === sharedChat.id, 
    'bad chats subscription', 'push only for valid subscribers shared'
  )
}

const enduser_tests = async () => {
  const enduser = await user1.api.endusers.createOne({ email: "enduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })

  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')
  await wait(undefined, 25)

  const userEvents = [] as ChatMessage[]
  const enduserEvents = [] as ChatMessage[]
  
  const room  = await user1.api.chat_rooms.createOne({ 
    type: 'external', 
    userIds: [user1.userInfo.id],
    enduserIds: [enduser.id],
  })
  await wait(undefined, 25)

  user1.subscribe({ [room.id]: 'chats' })
  user1.subscribe({ tickets: 'tickets' })
  await wait(undefined, 10)
  enduserSDK.subscribe({ [room.id]: 'chats' }) 
  await wait(undefined, 10)

  user1.handle_events({
    'created-chats': rs => userEvents.push(...rs),
    'created-tickets': rs => userEvents.push(...rs),
  }) 
  enduserSDK.handle_events({
    'created-chats': rs => enduserEvents.push(...rs),
    'created-tickets': rs => enduserEvents.push(...rs),
  }) 

  const messageToEnduser = await user1.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  const messageToUser    = await enduserSDK.api.chats.createOne({ roomId: room.id, message: "Hello right back!" })
  await wait(undefined, 25)

  assert(objects_equivalent(userEvents[0], messageToUser), 'no message on socket', 'push message to user')
  assert(objects_equivalent(enduserEvents[0], messageToEnduser), 'no message on socket', 'push message to enduser')

  const unusedTicket = await user1.api.tickets.createOne({ enduserId: PLACEHOLDER_ID, title: "For Noone" }) // should not get pushed to enduser
  const ticketForEnduser  = await user1.api.tickets.createOne({ enduserId: enduser.id, title: "For enduser" })
  const ticketFromEnduser = await enduserSDK.api.tickets.createOne({ enduserId: enduser.id, title: "By enduser" })
  await wait(undefined, 25)

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
    () => enduserSDK.api.chats.getSome({}), 
    { shouldError: true, onError: (e: string) => e === 'Unauthenticated' }
  )

  // keep these models around for front-end testing
  // cleanup
  // await user1.api.endusers.deleteOne(enduser.id) 
  // await user1.api.chats.deleteOne(messageToEnduser.id)
  // await user1.api.chats.deleteOne(messageToUser.id)
}

const TEST_SESSION_DURATION = 2 // seconds
const SESSION_TIMEOUT_DELAY = 3000 // ms
const deauthentication_tests = async (byTimeout=false) => {
  log_header(`Unauthenticated Tests ${byTimeout ? '- With Timeout, requires Worker' : '- With Manual Logout' }`)
  
  const enduser = await user1.api.endusers.createOne({ email: "socketenduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!', { durationInSeconds: byTimeout ? TEST_SESSION_DURATION : undefined })
  await wait(undefined, 25)
  
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
  await wait(undefined, 10)

  if (!byTimeout) {
    await enduserSDK.api.endusers.logout()
  } else {
    await wait(undefined, TEST_SESSION_DURATION * 1000 + SESSION_TIMEOUT_DELAY) 
  }
  await user1.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  await wait(undefined, 25)
  assert(objects_equivalent(enduserEvents[0], undefined), 'enduser got message after logout on socket', 'enduser logged out')

  // re-authenticate enduser to send message to user
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')

  // ensure user logged out appropriately for not receiving message
  await user1.logout()
  if (byTimeout) {
    await user1.authenticate(email, password, { expirationInSeconds: byTimeout ? TEST_SESSION_DURATION : undefined } )
    await wait(undefined, TEST_SESSION_DURATION * 1000 + SESSION_TIMEOUT_DELAY) 
  }
  await enduserSDK.api.chats.createOne({ roomId: room.id, message: "Hello right back!" })
  await wait(undefined, 25)
  assert(objects_equivalent(userEvents[0], undefined), 'user got message after logout', 'user logged out')

  // must come before cleanup, so cleanup works
  await user1.authenticate(email, password), // reauthenticate for later tests as needed

  // cleanup
  await Promise.all([
    user1.api.endusers.deleteOne(enduser.id),
    user1.api.chat_rooms.deleteOne(room.id), // deletes chats as side effect
  ])
}

const calendar_events = async () => {
  log_header(`Meetings Tests`)

  const enduser = await user1.api.endusers.createOne({ email: "socketenduser@tellescope.com" })
  await user1.api.endusers.set_password({ id: enduser.id, password: 'enduserPassword!' })
  await enduserSDK.authenticate(enduser.email as string, 'enduserPassword!')
  await wait(undefined, 25)

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
  await wait(undefined, 25)

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
    await wait(undefined, 25)

    let loopCount = 0
    while (!(user1.socketAuthenticated && user2.socketAuthenticated) && ++loopCount < 10) {
      if (!user1.socketAuthenticated) user1.authenticate_socket()
      if (!user2.socketAuthenticated) user2.authenticate_socket()
      await wait(undefined, 100)
    }
    if (loopCount === 10) {
      console.log("Failed to authenticate")
      process.exit(1)
    }

    await calendar_events()
    await enduser_tests()
    await basic_tests()
    await access_tests()

    await deauthentication_tests() // should come last!
    await deauthentication_tests(true) // should come last!

  } catch(err) {
    console.error(err)
  }

  process.exit()
})()