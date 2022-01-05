import * as models from "@tellescope/types-models"

type ToClientModel<T> = T & { id: string, createdAt: Date }
type ToClientModels<T> = {
  [K in keyof T]: ToClientModel<T[K]>
}

export type ClientModelForName_required = ToClientModels<models.ModelForName_required>
export type ClientModelForName_readonly = ToClientModels<models.ModelForName_readonly>
export type ClientModelForName_updatesDisabled = ToClientModels<models.ModelForName_updatesDisabled>
export type ClientModelForName = ToClientModels<models.ModelForName>

export type Enduser = ClientModelForName['endusers']
export type ChatRoom = ClientModelForName['chat_rooms']
export type ChatMessage = ClientModelForName['chats']
export type File = ClientModelForName['files']
export type Task = ClientModelForName['tasks']
export type Ticket = ClientModelForName['tickets']
export type Meeting = ClientModelForName['meetings']
export type Note = ClientModelForName['notes']


export interface UserDisplayInfo extends models.UserActivityInfo { 
  id: string,
  createdAt: Date,
  avatar?: string,
  fname?: string, 
  lname?: string,
}