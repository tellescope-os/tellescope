import { CUD, Indexable, UserIdentity } from "@tellescope/types-utilities"

export interface SearchOptions {
  query: string,
}

export type AccessType = "All" | "Default" | "Assigned" | null
export type AccessAction = "create" | "read" | "update" | "delete"
export type AccessResources = ModelName
  | 'apiKeys'
  | "automations"
  | "automationSteps"
  | "automationUsers"
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

export type ExistsFilter = { _exists: boolean } 
export type FilterType = ExistsFilter
export type FilterKey = '_exists'
export const FilterKeys = ['_exists'] as const
export type ReadFilter<T> = { [K in keyof T]?: T[K] | FilterType }

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
  username?: string;
  orgEmail?: string;
  lastActive?: Date;
  lastLogout?: Date;
}
export interface User_required {  
  email: string;
}
export interface User_updatesDisabled {}
export interface User extends User_required, User_readonly, User_updatesDisabled {
  phone?: string;
  fname?: string;
  lname?: string;
  accountType?: AccountType;
  roles?: string[];
  avatar?: string,
  fields?: CustomFields;
}

export type Preference = 'email' | 'sms' | 'call' | 'chat'
export type CustomField  = string | number | object | {
  value: string | object;
  title?: string;
  description?: string;
}
export type CustomFields = Indexable<boolean | null | string | CustomField>;

export interface Enduser_readonly extends UserActivityInfo, ClientRecord {
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
  fields? : CustomFields;
  preference? : Preference;
  assignedTo? : string[];
  avatar?: string,
  unread?: boolean,
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
  fields? : CustomFields;
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
  userId: string;
  delivered: boolean; 
  threadId: string; 
  source: string; // email address of sender
  linkOpens?: { [index: number]: Date };
  openedAt?: Date;
  textEncoding?: EmailEncoding,
  htmlEncoding?: EmailEncoding,
  s3id: string | null,
}
export interface Email_required {
  enduserId: string | null;
  subject: string; 
  textContent: string; 
}
export interface Email_updatesDisabled {
  HTMLContent?: string;
  messageId?: string;
  inbound?: boolean;
  logOnly?: boolean,
}
export interface Email extends Email_required, Email_readonly, Email_updatesDisabled {
  replyTo?: string | null;  
  readBy?: { [index: string] : Date };
  // sentAt: string, // only outgoing
}

export interface SMSMessage_readonly extends ClientRecord {
  delivered: boolean, 
  internalMessageId?: string,
  linkOpens?: { [index: number]: Date };
}
export interface SMSMessage_required {
  enduserId: string, 
  message: string, 
}
export interface SMSMessage_updatesDisabled {
  inbound: boolean, 
  newThread: boolean, 
  logOnly?: boolean,
}
export interface SMSMessage extends SMSMessage_readonly, SMSMessage_required, SMSMessage_updatesDisabled {
  userId?: string, // defaults to self, but should allow future options to send as other user
  readBy?: { [index: string] : Date };
  // usingPublicNumber?: boolean, // flagged on outgoing messages from public number
  // sentAt: string, // only outgoing
}
export type ChatRoomType = 'internal' | 'external'

export interface ChatRoom_readonly extends ClientRecord {
  recentMessage?: string,
  recentSender?: string,
  recentMessageSentAt?: number,
  numMessages: number,
}
export type ChatRoomUserInfo = {
  unreadCount: number
}
export interface ChatRoom_required {}
export interface ChatRoom_updatesDisabled {}
export interface ChatRoom extends ChatRoom_readonly, ChatRoom_required, ChatRoom_updatesDisabled {
  description?: string;
  type?: ChatRoomType; 
  userIds?: string[];
  title?: string
  topic?: string;
  topicId?: string;
  enduserIds?: string[];
  ticketId?: string; // for connecting with a related ticket
  endedAt?: Date;
  tags?: string[];
  infoForUser?: {
    [index: string]: ChatRoomUserInfo,
  }
}

export type ChatAttachmentType = 'image' | 'file'
export type ChatAttachment = {
  type: ChatAttachmentType,
  secureName: string,
}

export interface ChatMessage_readonly extends ClientRecord {
  senderId: string | null;
  linkOpens?: { [index: number]: Date };
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
  html?: string,
  readBy?: { [index: string] : Date };
  attachments?: ChatAttachment[]
}

export type MessageTemplateType = 'enduser' | 'team'  // default to 'enduser'
export type MessageTemplateMode = 'html' | 'richtext'
export interface MessageTemplate_readonly extends ClientRecord {}
export interface MessageTemplate_required {
  title: string;
  subject: string;
  message: string;
}
export interface MessageTemplate_updatesDisabled {}
export interface MessageTemplate extends MessageTemplate_readonly, MessageTemplate_required, MessageTemplate_updatesDisabled {
  html: string;
  type?: MessageTemplateType;
  editorState?: string
  mode?: MessageTemplateMode,
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
}
export interface Ticket_updatesDisabled {}
export interface Ticket extends Ticket_readonly, Ticket_required, Ticket_updatesDisabled {
  enduserId?: string;
  closedAt?: Date;
  dueDateInMS?: number;
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
export type Attendee = UserIdentity & { info: AttendeeInfo }
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
  endedAt?: Date,
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

export type FormFieldType = 'string' | 'number' | 'email' | 'phoneNumber' | "multiple_choice" | "file" | "signature"
export interface MultipleChoiceOptions {
  choices: string[];
  radio?: boolean; // absent indicates not radio
  other?: boolean; // include an 'other' option
}

export type FormFieldOptions = MultipleChoiceOptions
export interface FormField {
  isOptional  ?: boolean,
  title        : string,
  type         : FormFieldType,
  description ?: string,
  options     ?: FormFieldOptions | {},
  intakeField ?: string | null,
}
export interface Form_readonly extends ClientRecord {}
export interface Form_required {
  title: string,
  fields: FormField[], 
}
export interface Form_updatesDisabled {}
export interface Form extends Form_readonly, Form_required, Form_updatesDisabled {
  customSubject?: string,
  customGreeting?: string,
  customSignature?: string,
  allowPublicURL?: boolean,
  intakePhone?: 'required' | 'optional',
  thanksMessage?: string,
}

export type FormResponseValue = any

export interface FormResponse_readonly extends ClientRecord {}
export interface FormResponse_required {
  formId: string,
  enduserId: string,
  formTitle: string,
  responses: FormResponseValue[],
  submittedBy?: string,
  submittedAt?: Date,
  accessCode?: string,
  userEmail?: string,
}
export interface FormResponse_updatesDisabled {
  submissionExpiresAt?: number,
}
export interface FormResponse extends FormResponse_readonly, FormResponse_required, FormResponse_updatesDisabled {}

export const WEBHOOK_MODELS = {
  'chats': '',
  'meetings': '',
}
export type WebhookSupportedModel = keyof typeof WEBHOOK_MODELS
export type CUDSubscription = {
  [K in CUD]?: boolean
}
export type WebhookSubscriptionsType = { [K in WebhookSupportedModel]?: CUDSubscription }
export const is_webhook_supported_model = (m: ModelName): m is WebhookSupportedModel => (
  WEBHOOK_MODELS[m as keyof typeof WEBHOOK_MODELS] !== undefined
)

export interface WebHook_readonly extends ClientRecord {}
export interface WebHook_required {}
export interface WebHook_updatesDisabled {}
export interface WebHook extends WebHook_readonly, WebHook_required, WebHook_updatesDisabled {
  url: string,
  secret: string,
  subscriptions: WebhookSubscriptionsType
}

export type CalendarEventReminderType = "webhook"
export type CalendarEventReminder = {
  type: CalendarEventReminderType,
  remindAt: number,
  didRemind?: boolean,
}
export interface CalendarEvent_readonly extends ClientRecord {}
export interface CalendarEvent_required {
  title: string,
  startTimeInMS: number,
  durationInMinutes: number,
}
export interface CalendarEvent_updatesDisabled {}
export interface CalendarEvent extends CalendarEvent_readonly, CalendarEvent_required, CalendarEvent_updatesDisabled {
  attendees: UserIdentity[],
  chatRoomId?: string,
  description?: string,
  fields?: Indexable<string | CustomField>,
  reminders?: CalendarEventReminder[],
}

export type WebhookRecord = {
  id: string,
  [index: string]: any,
}
export interface WebhookCall {  
  model: WebhookSupportedModel,
  message: string,
  type: CUD,
  event?: CalendarEvent & { id: string },
  records: WebhookRecord[],
  relatedRecords: { [index: string]: WebhookRecord },
  timestamp: string,
  integrity: string,
}

export type AutomationEventType = "enterState" | "leaveState" | "formResponse"
interface AutomationEventBuilder <T extends AutomationEventType, V extends object> {
  type: T,
  info: V,
}

export interface AutomationForJourney { journeyId: string }
export interface AutomationForJourneyState { state: string }
export interface AutomationForJourneyAndState extends AutomationForJourney, AutomationForJourneyState {}
export interface AutomationForAutomation { automationId: string }

export interface AutomationForForm { formId: string }
export interface AutomationForTemplate { templateId: string }
export interface AutomationForSender { senderId: string }
export interface AutomationForFormRequest extends AutomationForForm, AutomationForSender {}
export interface AutomationForMessage extends AutomationForTemplate, AutomationForSender {}
export interface AutomationForWebhook { message: string }
export interface AutomationForNotification extends AutomationForTemplate { destination: string }

export type EnterStateAutomationEvent = AutomationEventBuilder<'enterState', AutomationForJourneyAndState>
export type LeaveStateAutomationEvent = AutomationEventBuilder<'leaveState', AutomationForJourneyAndState> 
export type FormResponseAutomationEvent = AutomationEventBuilder<'formResponse', AutomationForForm> 
export type AutomationEvent = EnterStateAutomationEvent
  | LeaveStateAutomationEvent
  | FormResponseAutomationEvent

interface AutomationActionBuilder <T extends AutomationActionType, V extends object> {
  type: T,
  info: V,
}
export type SendNotificationAutomationAction = AutomationActionBuilder<'sendNotification', AutomationForNotification>
export type SendEmailAutomationAction = AutomationActionBuilder<'sendEmail', AutomationForMessage>
export type SendSMSAutomationAction = AutomationActionBuilder<'sendSMS', AutomationForMessage>
export type SendFormAutomationAction = AutomationActionBuilder<'sendForm', AutomationForFormRequest>
export type UpdateStateForJourneyAutomationAction = AutomationActionBuilder<'updateStateForJourney', AutomationForJourneyAndState>
export type CreateTaskAutomationAction = AutomationActionBuilder<'createTask', AutomationForTemplate>
export type AddToSequenceAutomationAction = AutomationActionBuilder<'addToSequence', AutomationForAutomation>
export type RemoveFromSequenceAutomationAction = AutomationActionBuilder<'removeFromSequence', AutomationForAutomation>
export type SendWebhookAutomationAction = AutomationActionBuilder<'sendWebhook', AutomationForWebhook>

export type AutomationConditionType = 'atJourneyState'
export type AutomationConditionBuilder <T extends AutomationConditionType, V extends object>  = {
  type: T,
  info: V,
}
export type AtJourneyStateAutomationCondition = AutomationConditionBuilder<'atJourneyState', AutomationForJourneyAndState>
export type AutomationCondition = AtJourneyStateAutomationCondition

export type AutomationActionForType = {
  "sendNotification" : SendNotificationAutomationAction,
  "sendEmail" : SendEmailAutomationAction,
  "sendSMS": SendSMSAutomationAction,
  "sendForm": SendFormAutomationAction,
  "updateStateForJourney": UpdateStateForJourneyAutomationAction,
  "createTask": CreateTaskAutomationAction,
  'addToSequence': AddToSequenceAutomationAction,
  'removeFromSequence': RemoveFromSequenceAutomationAction,
  'sendWebhook': SendWebhookAutomationAction
}
export type AutomationActionType = keyof AutomationActionForType
export type AutomationAction = AutomationActionForType[AutomationActionType]

export interface EventAutomation_readonly extends ClientRecord {}
export interface EventAutomation_required {
  event: AutomationEvent
  conditions?: AutomationCondition[],
  action: AutomationAction,
}
export interface EventAutomation_updatesDisabled {}
export interface EventAutomation extends EventAutomation_readonly, EventAutomation_required, EventAutomation_updatesDisabled {
  journeyId?: string,
  formId?: string,
}

export type RelatedRecord = { type: string, id: string }
export interface UserNotification_readonly extends ClientRecord {}
export interface UserNotification_required {
  userId: string,
  type: string,
  message: string,
}
export interface UserNotification_updatesDisabled {}
export interface UserNotification extends UserNotification_readonly, UserNotification_required, UserNotification_updatesDisabled {
  read?: boolean,
  relatedRecords?: RelatedRecord[],
}

export type AutomationEnduserStatus = 'active' | 'paused' | 'finished' 
export interface AutomationEnduser_readonly extends ClientRecord {}
export interface AutomationEnduser_required {
  enduserId: string,
  automationId: string,
  event: AutomationEvent,
  action: AutomationAction,
  status: AutomationEnduserStatus,
}
export interface AutomationEnduser_updatesDisabled {
  stepNumber: number,
}
export interface AutomationEnduser extends AutomationEnduser_readonly, AutomationEnduser_required, AutomationEnduser_updatesDisabled {

}

// type SequencedAutomationEvent = "noDelay" | "delay"

export interface SequenceAutomation_readonly extends ClientRecord {}
export interface SequenceAutomation_required {
  title: string,
}
export interface SequenceAutomation_updatesDisabled {}
export interface SequenceAutomation extends SequenceAutomation_readonly, SequenceAutomation_required, SequenceAutomation_updatesDisabled {

}

export interface UserLog_readonly extends ClientRecord {
  userId: string,
  resource: string,
  resourceId: string,
  action: CUD,
}
export interface UserLog_required {}
export interface UserLog_updatesDisabled {}
export interface UserLog extends UserLog_readonly, UserLog_required, UserLog_updatesDisabled {}

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
  forms: Form_required,
  form_responses: FormResponse_required,
  calendar_events: CalendarEvent_required,
  event_automations: EventAutomation_required,
  automation_endusers: AutomationEnduser_required,
  sequence_automations: SequenceAutomation_required,
  webhooks: WebHook_required;
  user_logs: UserLog_required;
  user_notifications: UserNotification_required;
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
  forms: Form_readonly;
  form_responses: FormResponse_readonly;
  calendar_events: CalendarEvent_readonly,
  event_automations: EventAutomation_readonly,
  automation_endusers: AutomationEnduser_readonly,
  sequence_automations: SequenceAutomation_readonly,
  webhooks: WebHook_readonly;
  user_logs: UserLog_readonly;
  user_notifications: UserNotification_readonly;
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
  forms: Form_updatesDisabled;
  form_responses: FormResponse_updatesDisabled;
  calendar_events: CalendarEvent_updatesDisabled,
  event_automations: EventAutomation_updatesDisabled,
  automation_endusers: AutomationEnduser_updatesDisabled, 
  sequence_automations: SequenceAutomation_updatesDisabled,
  webhooks: WebHook_updatesDisabled;
  user_logs: UserLog_updatesDisabled;
  user_notifications: UserNotification_updatesDisabled;
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
  forms: Form;
  form_responses: FormResponse;
  calendar_events: CalendarEvent,
  event_automations: EventAutomation,
  automation_endusers: AutomationEnduser,
  sequence_automations: SequenceAutomation,
  webhooks: WebHook;
  user_logs: UserLog;
  user_notifications: UserNotification;
}
export type ModelName = keyof ModelForName
export type Model = ModelForName[keyof ModelForName]

export type ConfiguredSessionInfo = { username: string, orgEmail: string, orgName: string, fname: string, lname: string }
export type ConfiguredSession = UserSession & ConfiguredSessionInfo

export interface UserActivityInfo {
  lastActive: string | Date, 
  lastLogout: string | Date,
}
export type UserActivityStatus = 'Active' | 'Away' | 'Unavailable'

export const modelNameChecker: { [K in ModelName] : true } = {
  endusers: true,
  engagement_events: true,
  journeys: true,
  api_keys: true,
  tasks: true,
  emails: true,
  sms_messages: true,
  chat_rooms: true,
  chats: true,
  users: true,
  templates: true,
  files: true, 
  tickets: true,
  meetings: true, 
  notes: true, 
  forms: true,
  form_responses: true,
  calendar_events: true,
  event_automations: true,
  automation_endusers: true,
  sequence_automations: true,
  webhooks: true, 
  user_logs: true,
  user_notifications: true,
}

export const isModelName = (s: string): s is ModelName => modelNameChecker[s as ModelName]