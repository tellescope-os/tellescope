import { Indexable, UserIdentity } from "@tellescope/types-utilities"

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
  skills?: string[];
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
  businessId: string,
  iat: number,
  exp: number,
}
  
export type SessionType = "user" | "enduser"
export interface EnduserSession extends Session, Enduser {
  type: "enduser",
}

export interface UserSession extends Session, User, OrganizationLimits { // User joined with organization, access, and other details
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
  avatar?: string,
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
  externalId?: string;
  email? : string;
  emailConsent? : boolean;
  phone? : string;
  phoneConsent? : boolean;
  fname? : string;
  lname? : string;
  dateOfBirth?: Date;
  journeys?: Indexable<string>;
  tags? : string[];
  fields? : Indexable<string | CustomField>;
  preference? : Preference;
  assignedTo? : string;
  avatar?: string,
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

export interface ChatRoom_readonly extends ClientRecord {
  recentMessage?: string,
  recentSender?: string,
}
export interface ChatRoom_required {}
export interface ChatRoom_updatesDisabled {}
export interface ChatRoom extends ChatRoom_readonly, ChatRoom_required, ChatRoom_updatesDisabled {
  type?: ChatRoomType; 
  userIds?: string[];
  title?: string
  topic?: ChatRoomTopic;
  topicId?: string;
  enduserIds?: string[];
  ticketId?: string; // for connecting with a related ticket
  endedAt?: Date;
  tags?: string[];
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

export interface File_readonly extends ClientRecord {
  secureName: string,
}
export interface File_required {
  name: string;
  type: string;
  size: number;
}
export interface File_updatesDisabled {}
export interface File extends File_readonly, File_required, File_updatesDisabled {
  enduserId?: string;
}

export interface Ticket_readonly extends ClientRecord {}
export interface Ticket_required {
  title: string;
  enduserId: string;
}
export interface Ticket_updatesDisabled {}
export interface Ticket extends Ticket_readonly, Ticket_required, Ticket_updatesDisabled {
  closedAt?: Date;
  message?: string;
  type?: string;
  owner?: string;
  skillsRequired?: string[];
  chatRoomId?: string;
}

export type AttendeeInfo = {
  ExternalUserId: string,
  AttendeeId: string,
  JoinToken: string,
}
export type Attendee = UserIdentity & { info: { Attendee: AttendeeInfo }}
export type MeetingStatus = 'scheduled' | 'live' | 'ended'
export type MeetingInfo = {
  MeetingId: string,
  ExternalMeetingId: string,
  MediaPlacement: object,
}
export interface Meeting_readonly extends ClientRecord {}
export interface Meeting_required {}
export interface Meeting_updatesDisabled {}
export interface Meeting extends Meeting_readonly, Meeting_required, Meeting_updatesDisabled {
  attendees: Attendee[],
  meetingInfo: { Meeting: MeetingInfo },
  status: MeetingStatus,
}

export interface Note_readonly extends ClientRecord {}
export interface Note_required {
  enduserId: string,
}
export interface Note_updatesDisabled {}
export interface Note extends Note_readonly, Note_required, Note_updatesDisabled {
  text?: string,
  title?: string,
  type?: string,
  ticketId?: string,
  fields?: Indexable<string | CustomField>,
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
  files: File_required;
  tickets: Ticket_required;
  meetings: Meeting_required;
  notes: Note_required;
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
  files: File_readonly;
  tickets: Ticket_readonly;
  meetings: Meeting_readonly;
  notes: Note_readonly;
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
  files: File_updatesDisabled;
  tickets: Ticket_updatesDisabled;
  meetings: Meeting_updatesDisabled;
  notes: Note_updatesDisabled;
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
  files: File;
  tickets: Ticket;
  meetings: Meeting;
  notes: Note;
}
export type ModelName = keyof ModelForName
export type Model = ModelForName[keyof ModelForName]

export type ConfiguredSessionInfo = { username: string, orgEmail: string, orgName: string, fname: string, lname: string }
export type ConfiguredSession = UserSession & ConfiguredSessionInfo