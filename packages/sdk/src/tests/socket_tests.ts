import {
  assert,
  log_header,
  objects_equivalent,
  wait,
} from "@tellescope/testing"
import { EnduserSession } from "../enduser"
import { Session, /* APIQuery */ } from "../sdk"


const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]

const user1 = new Session({ host })
const user2 = new Session({ host })
const enduserSDK = new EnduserSession({ host })
if (!(email && password && email2 && password2)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit()
}

const basic_tests = async () => {
  const socket_events: Indexable[] = []

  user2.subscribe({ 'endusers': 'endusers' })
  user2.handle_events({
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
    'created-chat-rooms': rs => user1Events.push(...rs),
    'updated-chat-rooms': rs => user1Events.push(...rs),
    'deleted-chat-rooms': rs => user1Events.push(...rs),
  })
  user2.handle_events({
    'created-chat-rooms': rs => user2Events.push(...rs),
    'updated-chat-rooms': rs => user2Events.push(...rs),
    'deleted-chat-rooms': rs => user2Events.push(...rs),
  })

  const user1Id = user1.userInfo.id
  const user2Id = user2.userInfo.id

  const room  = await user1.api.chat_rooms.createOne({ type: 'internal', userIds: [user1Id] })
  await wait(undefined, 25)

  const sharedRoom  = await user1.api.chat_rooms.createOne({ type: 'internal', userIds: [user1Id, user2Id] })
  await wait(undefined, 25)

  assert(user1Events.length === 0, 'bad event distribution for filter', 'verify filter socket no self')
  assert(user2Events.length === 1 && sharedRoom.id === user2Events[0].id, 'bad event distribution for filter', 'verify filter socket push')

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
  const enduser = await user1.api.endusers.createOne({ email: "sockettest@tellescope.com" })
  await user1.api.endusers.setPassword(enduser.id, 'enduserpassword')

  await enduserSDK.authenticate(enduser.email as string, 'enduserpassword')
  enduserSDK.authenticate_socket()
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
  await wait(undefined, 10)
  enduserSDK.subscribe({ [room.id]: 'chats' }) 
  await wait(undefined, 10)

  user1.handle_events({
    'created-chats': rs => userEvents.push(...rs),
    'updated-chats': rs => enduserEvents.push(...rs),
  }) 

  const messageToEnduser = await user1.api.chats.createOne({ roomId: room.id, message: "Hello!" })
  const messageToUser    = await enduserSDK.api.chats.createOne({ roomId: room.id, message: "Hello right back!" })

  console.log(userEvents, enduserEvents)

  // cleanup
  await user1.api.endusers.deleteOne(enduser.id)
  await user1.api.chats.deleteOne(messageToEnduser.id)
  await user1.api.chats.deleteOne(messageToUser.id)
}

(async () => {
  log_header("Sockets")

  try {
    await user1.authenticate(email, password, host)
    await user1.reset_db()
    await user2.authenticate(email2, password2, host) // generate authToken + socket connection for API key
    
    let loopCount = 0
    while (!(user1.socket_is_authenticated() && user2.socket_is_authenticated()) && ++loopCount < 10) {
      user2.authenticate_socket()
      await wait(undefined, 100)
    }
    if (loopCount === 10) {
      console.log("Failed to authenticate")
      process.exit()
    }

    await enduser_tests()
    await basic_tests()
    await access_tests()
  } catch(err) {
    console.error(err)
  }

  process.exit()
})()