import {
  ModelForName,
  ModelForName_required,
  RecordInfo,
  Organization as BaseOrganization,
} from "@tellescope/types-models"

export type ObjectId = import('bson').ObjectId

export type ToServerModel<T> = Omit<T, 'id'> & { _id: ObjectId }
export type ToServerModels<T> = {
  [K in keyof T]: ToServerModel<T[K]>
}
export type ServerModelForName = ToServerModels<ModelForName>
export type ServerModelForName_required = ToServerModels<ModelForName_required>
export type APIKey = ServerModelForName['api_keys']
export type ChatMessage = ServerModelForName['chats']
export type ChatRoom = ServerModelForName['chat_rooms']
export type Enduser = ServerModelForName['endusers']
export type Email = ServerModelForName['emails']
export type EngagementEvent = ServerModelForName['engagement_events']
export type EngagementEvent_required = ServerModelForName_required['engagement_events']
export type File = ServerModelForName['files']
export type Journey = ServerModelForName['journeys']
export type MessageTemplate = ServerModelForName['templates']
export type SMSMessage = ServerModelForName['sms_messages']
export type Task = ServerModelForName['tasks']
export type Ticket = ServerModelForName['tickets']
export type User = ServerModelForName['users']
export type Meeting = ServerModelForName['meetings']
export type Note = ServerModelForName['notes']

export type Organization = ToServerModel<BaseOrganization>
export type DatabaseModel = ServerModelForName[keyof ModelForName]
export type DatabaseRecord = ToServerModel<RecordInfo>
export { ModelName } from "@tellescope/types-models"

export type ClientType <T> = Omit<T, '_id'> & { id: string }

export interface CustomUpdateOptions {
  replaceObjectFields?: boolean,
}

export type DelayedEvent = {
  _id: ObjectId,
  type: 'sessionTimeout',
  triggerAt: number,
  businessId: string,
  fields: object,
}
export interface SessionTimeoutEvent extends DelayedEvent {
  type: 'sessionTimeout'
  fields: {
    authToken: string,
  }
}
