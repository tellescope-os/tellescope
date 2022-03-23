import express from "express"
import bodyParser from 'body-parser'
import crypto from "crypto"

import {
  assert,
  async_test,
  log_header,
  wait,
} from "@tellescope/testing"
import {
  objects_equivalent
} from "@tellescope/utilities"

import {
  WEBHOOK_MODELS,
  WebhookSupportedModel,
  WebhookRecord,
  WebhookCall,
  CUDSubscription,
  AutomationAction,
} from "@tellescope/types-models"

import { Session } from "../sdk"
import { ChatMessage } from "@tellescope/types-client"

const [email, password] = [process.env.TEST_EMAIL, process.env.TEST_PASSWORD]
const [email2, password2] = [process.env.TEST_EMAIL_2, process.env.TEST_PASSWORD_2]
const [nonAdminEmail, nonAdminPassword] = [process.env.NON_ADMIN_EMAIL, process.env.NON_ADMIN_PASSWORD]
if (!(email && password && email2 && password2 && nonAdminEmail && nonAdminPassword)) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD")
  process.exit(1)
}


const sdk = new Session({ host: 'http://localhost:8080' })
const nonAdminSdk = new Session({ host: 'http://localhost:8080' })

const app = express()
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }))
app.use(bodyParser.json({ limit: "25mb" }))

const PORT = 4000
const TEST_SECRET = "this is a test secret for verifying integrity of web hooks"
const webhookEndpoint = '/handle-webhook'
const webhookURL = `http://127.0.0.1:${PORT}${webhookEndpoint}`

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

const verify_integrity = (type: string, message: string, records: WebhookRecord[], timestamp: string, integrity: string,) => (
  sha256(
    type === "automation" 
      ? message + timestamp + TEST_SECRET
      : records.map(r => r.id).join('') + timestamp + TEST_SECRET
  ) === integrity
)

const handledEvents: WebhookCall[] = []
app.post(webhookEndpoint, (req, res) => {
  const body = req.body as WebhookCall
  // console.log('got hook', body.records, body.timestamp, body.integrity)

  if (!verify_integrity(body.type, body.message ?? '', body.records, body.timestamp, body.integrity)) {
    console.error("Integrity check failed for request", JSON.stringify(body, null, 2))
    process.exit(1)
  }

  handledEvents.push(req.body)
  res.status(204).end()
})

const fullSubscription = {} as { [K in WebhookSupportedModel]: CUDSubscription }
const emptySubscription = {} as { [K in WebhookSupportedModel]: CUDSubscription }
for (const model in WEBHOOK_MODELS) {
  fullSubscription[model as WebhookSupportedModel] = { create: true, update: true, delete: true }
  emptySubscription[model as WebhookSupportedModel] = { create: false, update: false, delete: false }
}

let webhookIndex = 0
const check_next_webhook = async (evaluate: (hook: WebhookCall) => boolean, name: string, error: string, isSubscribed: boolean) => {
  if (isSubscribed === false) return

  await wait(undefined, 25) // wait for hook to post

  const event = handledEvents[webhookIndex]
  assert(!!event, 'did not get hook', 'got hook')
  if (!event) return // ensure webhookIndex not incremented

  const success = evaluate(event)
  assert(success, error, name)
  if (!success) { console.error('Got', event) }

  webhookIndex++
}

const chats_tests = async (isSubscribed: boolean) => {
  log_header(`Chats Tests, isSubscribed=${isSubscribed}`)
  const room = await sdk.api.chat_rooms.createOne({ userIds: [sdk.userInfo.id] })

  const chat = await sdk.api.chats.createOne({ roomId: room.id, message: "Hello hello hi hello" })
  await check_next_webhook(
    ({ records, relatedRecords }) => {
      const record = records[0] as ChatMessage

      return (
        objects_equivalent(record, chat) && 
        relatedRecords[record.roomId] !== undefined &&
        relatedRecords[record.senderId as string] !== undefined &&
        relatedRecords[record.roomId]?.id  === room.id &&
        relatedRecords[record.senderId as string]?.id === room.userIds?.[0]
      )
    },
    'Create chat error', 'Create chat webhook', isSubscribed
  )

  // cleanup
  await sdk.api.chat_rooms.deleteOne(room.id) // also cleans up messages

  // when chatroom support added for webhooks, check deletion here
  // await check_next_webhook(a => objects_equivalent(a.records, [chat_room]), 'Delete chat room error', 'Delete chat room webhook', isSubscribed)
}

const meetings_tests = async (isSubscribed: boolean) => {
  log_header(`Meetings Tests, isSubscribed=${isSubscribed}`)
  const meeting = await sdk.api.meetings.start_meeting()

  await check_next_webhook(a => objects_equivalent(a.records, [meeting]), 'Create meeting error', 'Create meeting webhook', isSubscribed)

  // cleanup
  await sdk.api.meetings.end_meeting({ id: meeting.id }) // also cleans up messages

  const meetings = await sdk.api.meetings.my_meetings()
  const endedMeeting = meetings.find(m => m.id === meeting.id) 
  assert(
    !!endedMeeting && endedMeeting.status === 'ended' && !!endedMeeting.endedAt, 
    'Meeting missing updated values on end', 
    'Meeting ended correctly'
  )
}

const test_automation_webhooks = async () => {
  log_header("Automation Events")
  const state1 = "State 1", state2 = "State 2";
  const testMessage = 'Test webhook from automation'
  const journey = await sdk.api.journeys.createOne({ 
    title: "Automations Test", 
    defaultState: state1,
    states: [
      { name: state1, priority: 'N/A' },
      { name: state2, priority: 'N/A' },
    ]
  })

  const testAction: AutomationAction = {
    type: 'sendWebhook',
    info: { message: testMessage }
  }
  const a1 = await sdk.api.event_automations.createOne({
    journeyId: journey.id,
    event: {
      type: "enterState",
      info: { state: state1, journeyId: journey.id }
    },
    action: testAction,
  })

  // trigger a1 on create
  const enduser = await sdk.api.endusers.createOne({ 
    email: "automations@tellescope.com", 
    journeys: { [journey.id]: journey.defaultState } 
  })

  // wait long enough for automation to process and send webhook
  await wait(undefined, 2000)
  
  await check_next_webhook(
    ({ message }) => message === testMessage,
    'Automation webhook error', 
    'Automation webhook received', 
    true
  )


  // cleanup
  await sdk.api.journeys.deleteOne(journey.id) // automation events deleted as side effect
  await sdk.api.endusers.deleteOne(enduser.id)
}

const tests: { [K in WebhookSupportedModel]: (isSubscribed: boolean) => Promise<void> } = {
  chats: chats_tests,
  meetings: meetings_tests,
}

const run_tests = async () => {
  log_header("Webhooks Tests")
  await sdk.authenticate(email, password)
  await sdk.reset_db() 
  await nonAdminSdk.authenticate(nonAdminEmail, nonAdminPassword)

  await async_test(
    'configure webhook is admin only',
    () => nonAdminSdk.api.webhooks.configure({ url: webhookURL, secret: TEST_SECRET }),
    { shouldError: true, onError: e => e.message === "Inaccessible" || e.message === "Admin access only"}
  )
  await async_test(
    'update webhook is admin only',
    () => nonAdminSdk.api.webhooks.update({ subscriptionUpdates: fullSubscription }),
    { shouldError: true, onError: e => e.message === "Inaccessible" || e.message === "Admin access only"}
  )

  await async_test(
    'configure webhook',
    () => sdk.api.webhooks.configure({ url: webhookURL, secret: TEST_SECRET }),
    { onResult: _ => true }
  )
  await async_test(
    'configure webhook (only callable once)',
    () => sdk.api.webhooks.configure({ url: webhookURL, secret: TEST_SECRET }),
    { shouldError: true, onError: e => e.message === "Only one webhook configuration is supported per organization. Use /update-webooks to update your configuration." }
  )
  await async_test(
    'update webhook (set empty subscription)',
    () => sdk.api.webhooks.update({ subscriptionUpdates: {} }),
    { onResult: _ => true }
  )
  await async_test(
    'update webhook (set partial subscription)',
    () => sdk.api.webhooks.update({ subscriptionUpdates: { chats: { create: true }} }),
    { onResult: _ => true }
  )
  await async_test(
    'update webhook (set subscriptions)',
    () => sdk.api.webhooks.update({ subscriptionUpdates: fullSubscription }),
    { onResult: _ => true }
  )
  await async_test(
    'update webhook invalid model',
    () => sdk.api.webhooks.update({ subscriptionUpdates: { notAModel: { create: false } } as any }),
    { shouldError: true, onError: e => e.message === "Error parsing field subscriptionUpdates: Got unexpected field(s) [notAModel]" }
  )

  log_header("Webhooks Tests with Subscriptions")
  await test_automation_webhooks()
  for (const t in tests) {
    await tests[t as keyof typeof tests](true)
  }
  const finalLength = handledEvents.length

  await async_test(
    'update webhook (set subscriptions empty)',
    () => sdk.api.webhooks.update({ subscriptionUpdates: emptySubscription }),
    { onResult: _ => true }
  )

  log_header("Webhooks Tests without Subscriptions")
  for (const t in tests) {
    await tests[t as keyof typeof tests](false)
  }
  assert(finalLength === handledEvents.length, 'length changed after subscriptions', 'No webhooks posted when no subscription')

}

app.listen(PORT, async () => {
  try { 
    await run_tests()
  } catch(err) { console.error(err) }

  process.exit()
})