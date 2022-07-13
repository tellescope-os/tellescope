import * as models from "@tellescope/types-models"

export interface WithId { id: string | number }

type ToClientModel<T> = T & { id: string, createdAt: Date }
type ToClientModels<T> = {
  [K in keyof T]: ToClientModel<T[K]>
}

export type ClientModelForName_required = ToClientModels<models.ModelForName_required>
export type ClientModelForName_readonly = ToClientModels<models.ModelForName_readonly>
export type ClientModelForName_updatesDisabled = ToClientModels<models.ModelForName_updatesDisabled>
export type ClientModelForName = ToClientModels<models.ModelForName>

export type CalendarEvent = ClientModelForName['calendar_events']
export type Enduser = ClientModelForName['endusers']
export type EnduserObservation = ClientModelForName['enduser_observations']
export type EnduserStatusUpdate = ClientModelForName['enduser_status_updates']
export type EngagementEvent = ClientModelForName['engagement_events']
export type ChatRoom = ClientModelForName['chat_rooms']
export type ChatMessage = ClientModelForName['chats']
export type Email = ClientModelForName['emails']
export type File = ClientModelForName['files']
export type Form = ClientModelForName['forms']
export type FormResponse = ClientModelForName['form_responses']
export type Journey = ClientModelForName['journeys']
export type ManagedContentRecord = ClientModelForName['managed_content_records']
export type SMSMessage = ClientModelForName['sms_messages']
export type Task = ClientModelForName['tasks']
export type Template = ClientModelForName['templates']
export type MessageTemplate = ClientModelForName['templates']
export type Ticket = ClientModelForName['tickets']
export type Meeting = ClientModelForName['meetings']
export type Note = ClientModelForName['notes']
export type AutomationStep = ClientModelForName['automation_steps']
export type SequenceAutomation = ClientModelForName['sequence_automations']
export type AutomatedAction = ClientModelForName['automated_actions']
export type User = ClientModelForName['users']
export type UserLog = ClientModelForName['user_logs']
export type UserNotification = ClientModelForName['user_notifications']

export type Forum = ClientModelForName['forums']
export type ForumPost = ClientModelForName['forum_posts']
export type PostComment = ClientModelForName['post_comments']
export type PostLike = ClientModelForName['post_likes']

export interface UserDisplayInfo extends models.UserActivityInfo { 
  id: string,
  createdAt: Date,
  email?: string,
  avatar?: string,
  fname?: string, 
  lname?: string,
}

export type CreateFields <N extends keyof ClientModelForName, T=ClientModelForName[N]> = (
  Omit<ClientModelForName_required[N] & Partial<T>, keyof ClientModelForName_readonly[N]>
)