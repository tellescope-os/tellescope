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
  objects_equivalent, object_is_empty
} from "@tellescope/utilities"

import {
  WEBHOOK_MODELS,
  WebhookSupportedModel,
  WebhookRecord,
  WebhookCall,
  CalendarEvent,
  CUDSubscription,
  AutomationAction,
  AttendeeInfo,
} from "@tellescope/types-models"

import { Session } from "../sdk"
import { ChatMessage, Meeting } from "@tellescope/types-client"

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

const verify_integrity = ({ type, message, event, records, timestamp, integrity } : { 
  type: string, 
  message: string, 
  event?: CalendarEvent,
  records: WebhookRecord[], 
  timestamp: string, 
  integrity: string,
}) => (
  sha256(
    type === "automation" 
      ? message + timestamp + TEST_SECRET
      : type === 'calendar_event_reminder'
          ? event?.id + timestamp + TEST_SECRET 
          : records.map(r => r.id).join('') + timestamp + TEST_SECRET
  ) === integrity
)

const handledEvents: WebhookCall[] = []
app.post(webhookEndpoint, (req, res) => {
  const body = req.body as WebhookCall
  // console.log('got hook', body.records, body.timestamp, body.integrity)

  if (!verify_integrity(body)) {
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

const CHECK_WEBHOOK_DELAY_MS = 50
let webhookIndex = 0
const check_next_webhook = async (evaluate: (hook: WebhookCall) => boolean, name: string, error: string, isSubscribed: boolean, noHookExpected?: boolean) => {
  if (isSubscribed === false) return

  await wait(undefined, CHECK_WEBHOOK_DELAY_MS) // wait for hook to post

  const event = handledEvents[webhookIndex]
  if (noHookExpected) {
    assert(!event, error, name)
  } else {
    assert(!!event, 'did not get hook', 'got hook')
  }
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

  const enduser = await sdk.api.endusers.createOne({ email: 'deleteme@tellescope.com' })
  const meeting = await sdk.api.meetings.start_meeting()

  await check_next_webhook(a => (
      objects_equivalent(a.records[0]?.meetingInfo, meeting.meeting)
      && (a.records[0] as Meeting).attendees?.length === 1
      && (a.records[0] as Meeting).attendees?.[0].id === sdk.userInfo.id
    ),
    'Create meeting error', 'Create meeting webhook', isSubscribed
  )

  await sdk.api.meetings.add_attendees_to_meeting({ id: meeting.id, attendees: [{ type: 'enduser', id: enduser.id }]})
  await check_next_webhook(
    a => (
      a.records[0].id === meeting.id 
      && a.type === 'update'
      && a.records[0].attendees.length === 2
      && !!a.records[0].attendees.find((a: { id: string }) => a.id === enduser.id)
    ), 
    'Add attendees webhook error', 'add attendees webhook', 
    isSubscribed
  )

  // cleanup
  await sdk.api.meetings.end_meeting({ id: meeting.id }) // also cleans up messages
  await check_next_webhook(
    a => (a.records[0].id === meeting.id && a.records[0].status === 'ended' && a.type === 'update'),
    'End meeting error', 'end meeting webhook', 
    isSubscribed
  )

  const meetings = await sdk.api.meetings.my_meetings()
  const endedMeeting = meetings.find(m => m.id === meeting.id) 
  assert(
    !!endedMeeting && endedMeeting.status === 'ended' && !!endedMeeting.endedAt, 
    'Meeting missing updated values on end', 
    'Meeting ended correctly'
  )

  const meetingWithAttendees = await sdk.api.meetings.start_meeting({ attendees: [{ id: enduser.id, type: 'enduser' }]})
  await check_next_webhook((a => (
      a.records[0] as Meeting).attendees?.length === 2
    ),
    'Create meeting with attendees error', 'Create meeting with attendees webhook', isSubscribed
  )

  await sdk.api.meetings.end_meeting({ id: meetingWithAttendees.id }) // also cleans up messages

  await sdk.api.endusers.deleteOne(enduser.id)
}

const AUTOMATION_POLLING_DELAY_MS = 2000 - CHECK_WEBHOOK_DELAY_MS
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
  await sdk.api.event_automations.createOne({
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
  await wait(undefined, AUTOMATION_POLLING_DELAY_MS)
  
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


let CALENDAR_EVENT_WEBHOOK_COUNT = 0 // 
const calendar_event_reminders_tests = async () => {
  log_header("Calendar Event Reminders")

  const firstRemindAt = Date.now()
  const secondRemindAt = Date.now() + AUTOMATION_POLLING_DELAY_MS * 2
  const thirdRemindAt = Date.now() + AUTOMATION_POLLING_DELAY_MS * 4
  const sampleCalendarEventReminders: CalendarEvent['reminders'] = [
    {
      remindAt: firstRemindAt,
      type: 'webhook',
    },
    {
      remindAt: thirdRemindAt, // include before secondRemindAt as test that order doesn't matter
      type: 'webhook',
    },
    {
      didRemind: false, // test to ensure order of fields doesn't matter in automations query
      remindAt: secondRemindAt,
      type: 'webhook',
    }
  ]
  const calendarEvent = await sdk.api.calendar_events.createOne({
    durationInMinutes: 10,
    startTimeInMS: Date.now(),
    title: "Test Notifications",
    reminders: sampleCalendarEventReminders,
  })
  CALENDAR_EVENT_WEBHOOK_COUNT = sampleCalendarEventReminders.length

  // wait long enough for automation to process and send webhook
  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    ({ event }) => (
      event?.id === calendarEvent.id && 
      !!event?.reminders?.find(r => r.remindAt === firstRemindAt )
    ),
    'Calendar event successful webhook error', 
    'First calendar event reminder received', 
    true,
  )

  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    () => true,
    "Correctly didn't get webhook yet", 
    'Got calendar event webhook too early', 
    true, true,
  )

  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    ({ event }) => (
      event?.id === calendarEvent.id && 
      !!event?.reminders?.find(r => r.remindAt === secondRemindAt ) &&
      !!event?.reminders?.find(r => r.remindAt === firstRemindAt && r.didRemind === true )
    ),
    'Calendar event successful webhook error', 
    'First calendar event reminder received', 
    true
  )

  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    () => true,
    "Correctly didn't get webhook yet", 
    'Got calendar event webhook too early', 
    true, true,
  )

  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    ({ event }) => (
      event?.id === calendarEvent.id && 
      !!event?.reminders?.find(r => r.remindAt === thirdRemindAt ) &&
      !!event?.reminders?.find(r => r.remindAt === secondRemindAt && r.didRemind === true ) &&
      !!event?.reminders?.find(r => r.remindAt === firstRemindAt && r.didRemind === true )
    ),
    'Calendar event successful webhook error', 
    'First calendar event reminder received', 
    true
  )

  await wait(undefined, AUTOMATION_POLLING_DELAY_MS) 
  await check_next_webhook(
    () => true,
    "Correctly didn't get webhook yet", 
    'Got calendar event webhook too early', 
    true, true,
  )


  // cleanup
  await sdk.api.calendar_events.deleteOne(calendarEvent.id)
}

const tests: { [K in WebhookSupportedModel  | 'calendarEventReminders']: (isSubscribed: boolean) => Promise<void> } = {
  meetings: meetings_tests,
  calendarEventReminders: calendar_event_reminders_tests, 
  chats: chats_tests,
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
    'get initial webhook configuration',
    () => sdk.api.webhooks.get_configuration({}),
    { onResult: r => r.url === webhookURL && object_is_empty(r.subscriptions ?? {}) }
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
  await async_test(
    'get initial webhook configuration after updates',
    () => sdk.api.webhooks.get_configuration({}),
    { onResult: r => r.url === webhookURL && objects_equivalent(r.subscriptions, fullSubscription) }
  )

  log_header("Webhooks Tests with Subscriptions")
  await test_automation_webhooks()
  for (const t in tests) {
    await tests[t as keyof typeof tests](true)
  }
  const finalLength = handledEvents.length + CALENDAR_EVENT_WEBHOOK_COUNT /* calendar event webhooks don't require subscriptions */

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