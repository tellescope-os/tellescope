type ObjectId = import('bson').ObjectId

type ToServerModel<T> = Omit<T, 'id'> & { _id: ObjectId }
type ToServerModels<T> = {
  [K in keyof T]: ToServerModel<T[K]>
}

interface CustomUpdateOptions {
  replaceObjectFields?: boolean,
}

// extend Request object to allow for session and validated fields to be added with strict checking
// https://stackoverflow.com/questions/37377731/extend-express-request-object-using-typescript
declare namespace Express {
   export interface Request {
      session?: EnduserSession | UserSession,
      validated: any,
   }

   export interface UserRequest<T> extends Express.Request {
     session: UserSession & { 
       organization: string,
       fname: string,
       lname: string,
       orgEmail: string,
       orgName: string;
       username: string,
     },
     validated: T,
     path: string,
   }

   export interface EnduserRequest<T> extends Express.Request {
     session: EnduserSession,
     validated: T,
     path: string,
   }
}

type MessageTemplateType = import('@tellescope/types-client').MessageTemplateType
type ChatRoomType = import('@tellescope/types-client').ChatRoomType
type ChatRoomTopic = import('@tellescope/types-client').ChatRoomTopic
type CustomField = import('@tellescope/types-client').CustomField
type Preference = import('@tellescope/types-client').Preference
type JourneyState = import('@tellescope/types-client').JourneyState
type JourneyStatePriority = import('@tellescope/types-client').JourneyStatePriority
type EmailEncoding = import('@tellescope/types-client').EmailEncoding

type Enduser = ToServerModel<import('@tellescope/types-client').Enduser>
type EngagementEvent = ToServerModel<import('@tellescope/types-client').EngagementEvent>
type Journey = ToServerModel<import('@tellescope/types-client').Journey>
type ApiKey = ToServerModel<import('@tellescope/types-client').ApiKey>
type Task = ToServerModel<import('@tellescope/types-client').Task>
type Email = ToServerModel<import('@tellescope/types-client').Email>
type SmsMessage = ToServerModel<import('@tellescope/types-client').SmsMessage>
type ChatRoom = ToServerModel<import('@tellescope/types-client').ChatRoom>
type Chat = ToServerModel<import('@tellescope/types-client').Chat>
type User = ToServerModel<import('@tellescope/types-client').User>
type Template = ToServerModel<import('@tellescope/types-client').Template>

type ModelName = import('@tellescope/types-client').ModelName

type DatabaseRecord = ToServerModel<import('@tellescope/types-client').ClientRecord>

type DatabaseModelForName_required = ToServerModels<import('@tellescope/types-client').ModelForName_required>
type DatabaseModelForName_readonly = ToServerModels<import('@tellescope/types-client').ModelForName_readonly>
type DatabaseModelForName_updatesDisabled = ToServerModels<import('@tellescope/types-client').ModelForName_updatesDisabled>
type ModelForName =import('@tellescope/types-client').ModelForName
type DatabaseModelForName = ToServerModels<import('@tellescope/types-client').ModelForName>
type DatabaseModel = DatabaseModelForName[keyof DatabaseModelForName]

