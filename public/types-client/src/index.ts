import * as models from "@tellescope/types-models"

type ToClientModel<T> = T & { id: string }
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