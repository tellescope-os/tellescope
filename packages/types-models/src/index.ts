import { Indexable } from "@tellescope/types-utilities"

export type AccessType = "All" | "Assigned" | null
export type AccessAction = "create" | "read" | "update" | "delete"
export type AccessResources = ModelName
  | 'apiKeys'
  | "automations"
  | "automationSteps"
  | "automationUsers"
  | "emails"
  | "endusers"
  | "enduserNotes"
  | "engagement"
  | "files"
  | "forms"
  | "formResponses"
  | "journeys"
  | "meetings"
  | "notifications"
  | "reminders"
  | "sms"
  | "teamChat"
  | "taskTemplates"
  | "templates"
  | "organization"
  | "orgStatistics"
  | "users"
export type AccessForResource = {
  [K in AccessAction]: AccessType
}
export type AccessPermissions = {
  [K in AccessResources]: AccessForResource
}

export type OrganizationLimit = 'endusersLimit'
  | 'smsLimit'
  | 'emailsLimit'
  | 'tasksLimit'
  | 'formsLimit'
  | 'orgUsersLimit'
  | 'automationsLimit'
  | 'automationStepsLimit'
  | 'journeysLimit'
  | 'journeyStatesLimit'
  | 'templatesLimit'
  | 'apiKeysLimit'

export type OrganizationLimits = {
  [K in OrganizationLimit]?: number;
}

export interface OrganizationInfo {
  _id: string;
  creator: string;
  name: string;
  subscriptionExpiresAt: Date;
  subscriptionPeriod: number;
  roles?: string[];
  logoVersion?: number; // missing if no logo set
  themeColor?: string;
}
export interface Organization extends OrganizationInfo, OrganizationLimits {}


// Standard database models
export interface RecordInfo {
  businessId: string;
  updatedAt: Date;
  creator: string;
}

export interface ClientRecord extends RecordInfo { id: string }
  
export interface Session {
  type: "user" | "enduser",
  iat: number,
  exp: number,
}
  
export type SessionType = "user" | "enduser"
export interface EnduserSession extends Session, Enduser {
  type: "enduser",
  enduserId: string,
}

export interface UserSession extends Session, User { // User joined with organization, access, and other details
  id: string;
  type: "user";
  subscriptionExpiresAt: Date;
  subscriptionPeriod: number;
  access: AccessPermissions;
  orgName: string;
  verifiedEmail: boolean;
  wasAutomated: boolean;
}

export type AccountType = "Business"// | "joining org"
export interface User_readonly extends ClientRecord {
  organization?: string 
  orgEmail?: string;
}
export interface User_required {  
  email: string;
}
export interface User_updatesDisabled {}
export interface User extends User_required, User_readonly, User_updatesDisabled {
  phone?: string;
  username?: string;
  fname?: string;
  lname?: string;
  accountType?: AccountType;
  roles?: string[];
}

export type Preference = 'email' | 'sms' | 'call' | 'chat'
export interface CustomField {
  value: string | object;
  title?: string;
  description?: string;
}

export interface Enduser_readonly extends ClientRecord {
  unread: boolean;
  lastCommunication?: Date;
  recentMessagePreview?: string;
  hashedPassword: string;
} 
export interface Enduser_required {}
export interface Enduser_updatesDisabled {}
export interface Enduser extends Enduser_readonly, Enduser_required, Enduser_updatesDisabled {
  email? : string;
  emailConsent? : boolean;
  phone? : string;
  phoneConsent? : boolean;
  fname? : string;
  lname? : string;
  journeys?: Indexable<string>;
  tags? : string[];
  fields? : Indexable<string | CustomField>;
  preference? : Preference;
  assignedTo? : string;
}

export interface APIKey_readonly extends ClientRecord { 
  hashedKey: string, // stored as hash
}
export interface APIKey_required {}
export interface APIKey_updatesDisabled {}
export interface APIKey extends APIKey_readonly, APIKey_required, APIKey_updatesDisabled {}

export interface EngagementEvent_readonly extends ClientRecord {}
export interface EngagementEvent_required {
  enduserId: string,
  type: string,
  significance: number,
}
export interface EngagementEvent_updatesDisabled {
  enduserId: string,  
}
export interface EngagementEvent extends EngagementEvent_readonly, EngagementEvent_required, EngagementEvent_updatesDisabled {  
  timestamp: Date,
  fields?: Indexable<string | number | null>,
}

export type JourneyStatePriority = "Disengaged" | "N/A" | "Engaged"

export interface JourneyState { // info needed to create a state
  name: string;
  priority: JourneyStatePriority; // may still include High/Medium/Low as old states
  requiresFollowup?: boolean; // missing => false
  description?: string;
}

export interface Journey_readonly extends ClientRecord {}
export interface Journey_updatesDisabled {}
export interface Journey_required {
  title: string;
}
export interface Journey extends Journey_readonly, Journey_required, Journey_updatesDisabled {
  defaultState: string;
  states: JourneyState[];
  description?: string;
}

export interface Task_readonly extends ClientRecord {}
export interface Task_required {
  text: string;
}
export interface Task_updatesDisabled {}
export interface Task extends Task_required, Task_readonly, Task_updatesDisabled { 
  completed?: boolean;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  enduserId?: string;
  subscribers?: string[];
  subscriberRoles?: string[];
}

export type EmailEncoding = '' | 'base64'

export interface Email_readonly extends ClientRecord {
  businessUserId: string;
  delivered: boolean; 
  threadId: string; 
  source: string; // email address of sender
  openedAt?: Date;
  linkOpens?: { [index: number]: Date };
  textEncoding?: EmailEncoding,
  htmlEncoding?: EmailEncoding,
}
export interface Email_required {
  enduserId: string | null;
  subject: string; 
  textContent: string; 
}
export interface Email_updatesDisabled {}
export interface Email extends Email_required, Email_readonly, Email_updatesDisabled {
  logOnly?: boolean,
  HTMLContent?: string;
  timestamp: Date;
  replyTo?: string | null;  
  messageId?: string;
  inbound?: boolean;
  // sentAt: string, // only outgoing
}

export interface SMSMessage_readonly extends ClientRecord {
  businessUserId: string, 
  delivered: boolean, 
}
export interface SMSMessage_required {
  enduserId: string, 
  message: string, 
}
export interface SMSMessage_updatesDisabled {}
export interface SMSMessage extends SMSMessage_readonly, SMSMessage_required, SMSMessage_updatesDisabled {
  logOnly?: boolean,
  timestamp: Date, 
  inbound: boolean, 
  newThread: boolean, 
  usingPublicNumber?: boolean, // flagged on outgoing messages from public number
  // sentAt: string, // only outgoing
}

export type ChatRoomType = 'internal' | 'external'
export type ChatRoomTopic = 'enduser' | 'task'

export interface ChatRoom_readonly extends ClientRecord {}
export interface ChatRoom_required {
  type: ChatRoomType; 
  userIds: string[];
}
export interface ChatRoom_updatesDisabled {}
export interface ChatRoom extends ChatRoom_readonly, ChatRoom_required, ChatRoom_updatesDisabled {
  topic?: ChatRoomTopic;
  topicId?: string;
  enduserIds?: string[];
}

export interface ChatMessage_readonly extends ClientRecord {
  senderId: string | null;
}
export interface ChatMessage_required {
  roomId: string; 
  message: string;
}
export interface ChatMessage_updatesDisabled {
  roomId: string; 
  replyId?: string | null; // to support threaded replies to a specific root message
}
export interface ChatMessage extends ChatMessage_readonly, ChatMessage_required, ChatMessage_updatesDisabled {
  replyId?: string | null; // to support threaded replies to a specific root message
  readBy?: { [index: string] : Date };
}

export type MessageTemplateType = 'enduser' | 'team'  // default to 'enduser'

export interface MessageTemplate_readonly extends ClientRecord {}
export interface MessageTemplate_required {
  title: string;
  subject: string;
  message: string;
}
export interface MessageTemplate_updatesDisabled {}
export interface MessageTemplate extends MessageTemplate_readonly, MessageTemplate_required, MessageTemplate_updatesDisabled {
  type?: MessageTemplateType;
}

export type ModelForName_required = {
  endusers: Enduser_required;
  engagement_events: EngagementEvent_required;
  journeys: Journey_required;
  api_keys: APIKey_required;
  tasks: Task_required;
  emails: Email_required;
  sms_messages: SMSMessage_required;
  chat_rooms: ChatRoom_required;
  chats: ChatMessage_required;
  users: User_required;
  templates: MessageTemplate_required;
}
export type ClientModel_required = ModelForName_required[keyof ModelForName_required]

export interface ModelForName_readonly {
  endusers: Enduser_readonly;
  engagement_events: EngagementEvent_readonly;
  journeys: Journey_readonly;
  api_keys: APIKey_readonly;
  tasks: Task_readonly;
  emails: Email_readonly;
  sms_messages: SMSMessage_readonly;
  chat_rooms: ChatRoom_readonly;
  chats: ChatMessage_readonly;
  users: User_readonly;
  templates: MessageTemplate_readonly;
}
export type ClientModel_readonly = ModelForName_readonly[keyof ModelForName_readonly]

export interface ModelForName_updatesDisabled {
  endusers: Enduser_updatesDisabled;
  engagement_events: EngagementEvent_updatesDisabled;
  journeys: Journey_updatesDisabled;
  api_keys: APIKey_updatesDisabled;
  tasks: Task_updatesDisabled;
  emails: Email_updatesDisabled;
  sms_messages: SMSMessage_updatesDisabled;
  chat_rooms: ChatRoom_updatesDisabled;
  chats: ChatMessage_updatesDisabled;
  users: User_updatesDisabled;
  templates: MessageTemplate_updatesDisabled;
}
export type ClientModel_updatesDisabled = ModelForName_updatesDisabled[keyof ModelForName_updatesDisabled]

export interface ModelForName extends ModelForName_required, ModelForName_readonly {
  endusers: Enduser;
  engagement_events: EngagementEvent;
  journeys: Journey;
  api_keys: APIKey;
  tasks: Task;
  emails: Email;
  sms_messages: SMSMessage;
  chat_rooms: ChatRoom;
  chats: ChatMessage;
  users: User;
  templates: MessageTemplate;
}
export type ModelName = keyof ModelForName
export type Model = ModelForName[keyof ModelForName]

