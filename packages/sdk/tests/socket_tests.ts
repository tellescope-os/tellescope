import {
  assert,
  log_header,
  objects_equivalent,
  wait,
} from "@tellescope/testing"
import { createSession, /* APIQuery */ } from "../src/sdk"


const host = process.env.TEST_URL || 'http://localhost:8080'
const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]

const user1 = createSession()
const user2 = createSession()

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

  const e = await user1.endusers.createOne({ email: "sockets@tellescope.com" })
  await wait(undefined, 25)
  assert(objects_equivalent(e, socket_events?.[0][0]), 'inconsistent socket create', 'socket create')

  await user1.endusers.updateOne(e.id, { fname: 'Gary' })
  await wait(undefined, 25)
  assert(socket_events[1]?.[0]?.fname === 'Gary', 'inconsistent socket update', 'socket update')

  await user1.endusers.deleteOne(e.id)
  await wait(undefined, 25)
  assert(socket_events[2]?.[0] === e.id, 'inconsistent socket delete', 'socket delete')

  const es = (await user1.endusers.createSome([{ email: "sockets@tellescope.com" }, { email: 'sockets2@tellescope.com' }])).created
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

  const user1Id = user1.get_userInfo()._id.toString()
  const user2Id = user2.get_userInfo()._id.toString()

  const room  = await user1.chat_rooms.createOne({ type: 'internal', userIds: [user1Id] })
  await wait(undefined, 25)

  const sharedRoom  = await user1.chat_rooms.createOne({ type: 'internal', userIds: [user1Id, user2Id] })
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

  await user1.chats.createOne({ roomId: room.id, message: "Hello!", })
  await user1.chats.createOne({ roomId: room.id, message: "Hello...", })
  await wait(undefined, 25)

  assert(user1Events.length === 0, 'bad chats subscription', 'verify chats no self')
  assert(user2Events.length === 1, 'bad chats subscription', 'push only for valid subscribers')

  const sharedChat  = await user1.chats.createOne({ roomId: sharedRoom.id, message: "Hello!", })
  await wait(undefined, 25)
  const sharedChat2 = await user2.chats.createOne({ roomId: sharedRoom.id, message: "Hello there!", })
  await wait(undefined, 25)

  assert(user1Events.length === 1 && user1Events[0].id === sharedChat2.id, 'bad chats subscription', 'verify chat received')
  assert(
    user2Events.length === 2 && user2Events[1].id === sharedChat.id, 
    'bad chats subscription', 'push only for valid subscribers shared'
  )
}

(async () => {
  log_header("Sockets")

  try {
    await user1.authenticate(email, password, host)
    await user1.reset_db()
    await user2.authenticate(email2, password2, host) // generate authToken + socket connection for API key
    
    let loopCount = 0
    while (!user2.socket_is_authenticated() && ++loopCount < 10) {
      user2.authenticate_socket()
      await wait(undefined, 100)
    }
    if (loopCount === 10) {
      console.log("Failed to authenticate")
      process.exit()
    }

    await basic_tests()
    await access_tests()
  } catch(err) {
    console.error(err)
  }

  process.exit()
})()