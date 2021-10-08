type ObjectId = { // fixes monorepo (lerna)-related type issues
  toString: () => string,
} & import('mongodb').ObjectId

type SortOption = "oldFirst" | "newFirst"

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

interface Indexable<T=any> { [index: string] : T }

type JSONType = null | number | boolean | string | object | undefined
type EscapeWithOptions<R=any> = (o: ValidatorOptions) => (v: JSONType) => R
type EscapeFunction<R=any> = (v: JSONType) => R
type EscapeToList<R=any> = EscapeFunction<R[]>

type ErrorType = "User" | "Internal"
type ErrorCode = 400 | 401

interface ErrorInfo {
  message: string;
  info: object;
}

interface APIError extends ErrorInfo {
  code: ErrorCode;
}

interface RecordInfo {
  businessId: string;
  updatedAt: Date;
  creator: string;
}

interface DatabaseRecord extends RecordInfo { _id: ObjectId } 
interface ClientRecord   extends RecordInfo { id: string }

type OrganizationLimit = 'endusersLimit'
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

type OrganizationLimits = {
  [K in OrganizationLimit]?: number;
}

interface OrganizationInfo {
  _id: string;
  creator: string;
  name: string;
  subscriptionExpiresAt: Date;
  subscriptionPeriod: number;
  roles?: string[];
  logoVersion?: number; // missing if no logo set
  themeColor?: string;
}
interface Organization extends OrganizationInfo, OrganizationLimits {}

type AccessType = "All" | "Assigned" | null
type AccessAction = "create" | "read" | "update" | "delete"
type AccessResources = ModelName
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
type AccessForResource = {
  [K in AccessAction]: AccessType
}
type AccessPermissions = {
  [K in AccessResources]: AccessForResource
}

interface Session {
  _id: ObjectId,
  type: "user" | "enduser",
  iat: number,
  exp: number,
}

type SessionType = "user" | "enduser"
interface EnduserSession extends Session, Enduser {
  type: "enduser",
  enduserId: string,
}
type ClientEnduserSession = ToClient<EnduserSession>

interface UserSession extends Session, User, OrganizationLimits { // User joined with organization, access, and other details
  type: "user";
  userId: string;
  subscriptionExpiresAt: Date;
  subscriptionPeriod: number;
  access: AccessPermissions;
  orgName: string;
  verifiedEmail: boolean;
  wasAutomated: boolean;
}
type ClientUserSession = ToClient<UserSession>
type ConfiguredSessionInfo = { organization: string, username: string, orgEmail: string, orgName: string, fname: string, lname: string }
type ConfiguredSession = UserSession & ConfiguredSessionInfo

interface PublicOrganizationInfo {
  name: string;
  businessId: string;
  logoVersion?: number; // missing if no logo set
  themeColor?: string;
}

interface OrganizationInfo {
  _id: string;
  creator: string;
  name: string;
  subscriptionExpiresAt: Date;
  subscriptionPeriod: number;
  roles?: string[];
  logoVersion?: number; // missing if no logo set
  themeColor?: string;
}
type OrganizationLimitFields = 'smsLimit' | 'endusersLimit' | 'journeysLimit' | 'automationsLimit'

interface Organization extends OrganizationInfo {
  'smsLimit'?: number;
  'emailsLimit'?: number;
  'endusersLimit'?: number;
  'journeysLimit'?: number;
  'automationsLimit'?: number;
}

type AccountType = "Business"// | "joining org"

interface User_readonly extends DatabaseRecord {
  organization?: string 
  orgEmail?: string;
}
interface User_required {  
  email: string;
}
interface User_updatesDisabled {}
interface User extends User_required, User_readonly, User_updatesDisabled {
  phone?: string;
  username?: string;
  fname?: string;
  lname?: string;
  accountType?: AccountType;
  roles?: string[];
}

type Preference = 'email' | 'sms' | 'call' | 'chat'
interface CustomField {
  value: string | object;
  title?: string;
  description?: string;
}

interface Enduser_readonly extends DatabaseRecord {
  unread: boolean;
  lastCommunication?: Date;
  recentMessagePreview?: string;
  hashedPassword: string;
} 
interface Enduser_required {}
interface Enduser_updatesDisabled {}
interface Enduser extends Enduser_readonly, Enduser_required, Enduser_updatesDisabled {
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

interface APIKey_readonly extends DatabaseRecord { 
  hashedKey: string, // stored as hash
}
interface APIKey_required {}
interface APIKey_updatesDisabled {}
interface APIKey extends APIKey_readonly, APIKey_required, APIKey_updatesDisabled {}

interface EngagementEvent_readonly extends DatabaseRecord {}
interface EngagementEvent_required {
  enduserId: string,
  type: string,
  significance: number,
}
interface EngagementEvent_updatesDisabled {
  enduserId: string,  
}
interface EngagementEvent extends EngagementEvent_readonly, EngagementEvent_required, EngagementEvent_updatesDisabled {  
  timestamp: Date,
  fields?: Indexable<string | number | null>,
}

type JourneyStatePriority = "Disengaged" | "N/A" | "Engaged"

interface JourneyState { // info needed to create a state
  name: string;
  priority: JourneyStatePriority; // may still include High/Medium/Low as old states
  requiresFollowup?: boolean; // missing => false
  description?: string;
}

interface Journey_readonly extends DatabaseRecord {}
interface Journey_updatesDisabled {}
interface Journey_required {
  title: string;
}
interface Journey extends Journey_readonly, Journey_required, Journey_updatesDisabled {
  defaultState: string;
  states: JourneyState[];
  description?: string;
}

interface Task_readonly extends DatabaseRecord {}
interface Task_required {
  text: string;
}
interface Task_updatesDisabled {}
interface Task extends Task_required, Task_readonly, Task_updatesDisabled { 
  completed?: boolean;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  enduserId?: string;
  subscribers?: string[];
  subscriberRoles?: string[];
}

type EmailEncoding = '' | 'base64'

interface Email_readonly extends DatabaseRecord {
  businessUserId: string;
  delivered: boolean; 
  threadId: string; 
  source: string; // email address of sender
  openedAt?: Date;
  linkOpens?: { [index: number]: Date };
  textEncoding?: EmailEncoding,
  htmlEncoding?: EmailEncoding,
}
interface Email_required {
  enduserId: string | null;
  subject: string; 
  textContent: string; 
}
interface Email_updatesDisabled {}
interface Email extends Email_required, Email_readonly, Email_updatesDisabled {
  logOnly?: boolean,
  HTMLContent?: string;
  timestamp: Date;
  replyTo?: string | null;  
  messageId?: string;
  inbound?: boolean;
  // sentAt: string, // only outgoing
}

interface SMSMessage_readonly extends DatabaseRecord {
  businessUserId: string, 
  delivered: boolean, 
}
interface SMSMessage_required {
  enduserId: string, 
  message: string, 
}
interface SMSMessage_updatesDisabled {}
interface SMSMessage extends SMSMessage_readonly, SMSMessage_required, SMSMessage_updatesDisabled {
  logOnly?: boolean,
  timestamp: Date, 
  inbound: boolean, 
  newThread: boolean, 
  usingPublicNumber?: boolean, // flagged on outgoing messages from public number
  // sentAt: string, // only outgoing
}

type ChatRoomType = 'internal' | 'external'
type ChatRoomTopic = 'enduser' | 'task'

interface ChatRoom_readonly extends DatabaseRecord {}
interface ChatRoom_required {
  type: ChatRoomType; 
  userIds: string[];
}
interface ChatRoom_updatesDisabled {}
interface ChatRoom extends ChatRoom_readonly, ChatRoom_required, ChatRoom_updatesDisabled {
  topic?: ChatRoomTopic;
  topicId?: string;
  enduserIds?: string[];
}

interface ChatMessage_readonly extends DatabaseRecord {
  senderId: string | null;
}
interface ChatMessage_required {
  roomId: string; 
  message: string;
}
interface ChatMessage_updatesDisabled {
  roomId: string; 
  replyId?: string | null; // to support threaded replies to a specific root message
}
interface ChatMessage extends ChatMessage_readonly, ChatMessage_required, ChatMessage_updatesDisabled {
  replyId?: string | null; // to support threaded replies to a specific root message
  readBy?: { [index: string] : Date };
}

type MessageTemplateType = 'enduser' | 'team'  // default to 'enduser'

interface MessageTemplate_readonly extends DatabaseRecord {}
interface MessageTemplate_required {
  title: string;
  subject: string;
  message: string;
}
interface MessageTemplate_updatesDisabled {}
interface MessageTemplate extends MessageTemplate_readonly, MessageTemplate_required, MessageTemplate_updatesDisabled {
  type?: MessageTemplateType;
}

type CRUD = 'create' | 'update' | 'read' | 'delete' 
type HTTPMethod = 'post' | 'get' | 'patch' | 'delete' 
type Operation = CRUD | 'createMany' | 'readMany' 

type ModelForName_required = {
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
type DatabaseModel_required = ModelForName_required[keyof ModelForName_required]

interface ModelForName_readonly {
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
type DatabaseModel_readonly = ModelForName_readonly[keyof ModelForName_readonly]

interface ModelForName_updatesDisabled {
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
type DatabaseModel_updatesDisabled = ModelForName_updatesDisabled[keyof ModelForName_updatesDisabled]

interface ModelForName extends ModelForName_required, ModelForName_readonly {
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
type ModelName = keyof ModelForName
type DatabaseModel = ModelForName[keyof ModelForName]

interface ClientModelForName extends ModelForName {
  endusers: ToClient<Enduser>;
  engagement_events: ToClient<EngagementEvent>;
  journeys: ToClient<Journey>;
  api_keys: ToClient<APIKey>;
  tasks: ToClient<Task>;
  emails: ToClient<Email>;
  sms_messages: ToClient<SMSMessage>;
  chat_rooms: ToClient<ChatRoom>;
  chats: ToClient<ChatMessage>;
  users: ToClient<User>;
  templates: ToClient<MessageTemplate>;
}
type ClientModel = ClientModelForName[keyof ClientModelForName]

type ToClient<T> = Omit<T, 'id'> & { id: string }

interface ValidatorOptions {
  maxLength?: number;
  minLength?: number; 
  shouldTruncate?: boolean; 
  toLower?: boolean;
  isOptional?: boolean; 
  emptyStringOk?: boolean; 
  emptyListOk?: boolean; 
  nullOk?: boolean;
  isObject?: boolean; 
  isNumber?: boolean; 
  listOf?: boolean; 
  isBoolean?: boolean;
  errorMessage?: string;
  trim?: boolean;
}  
interface ValidatorOptionsForValue extends ValidatorOptions {
  listOf?: false;
}
interface ValidatorOptionsForList extends ValidatorOptions {
  listOf: true;
}
type ValidatorOptionsUnion = ValidatorOptionsForValue | ValidatorOptionsForList

type EscapeBuilder <R=any> = {
  (o?: ValidatorOptionsForValue): EscapeFunction<R>;
  (o?: ValidatorOptionsForList):  EscapeFunction<R[]>;
}
type ComplexEscapeBuilder <C,R=any> = (customization: C) => EscapeBuilder<R>

type InputValues <T> = { [K in keyof T]: JSONType }
type InputValidation<T> = { [K in keyof T]: EscapeFunction }

type ParamType = 'string' | 'mongoId' | 'mongoIdOptional' | 'limitType' 


type RelationshipConstraint<T> = {
  explanation: string; // human readable, for documentation purposes
  evaluate: (v: T, dependencies: Indexable<Partial<DatabaseModel>>) => string | void;
}

type DependencyAccessConstraint <T> = { type: 'dependency', foreignModel: ModelName, foreignField: string, accessField: keyof T  }

type AccessConstraint <T> = { type: 'creatorOnly' } 
  | { type: 'filter', field: string }
  | DependencyAccessConstraint<T>

type UniqueArrayConstraint <T> = { array: keyof T, itemKey?: string }

type Constraint <T> = {
  unique: (keyof T & string | UniqueArrayConstraint<T>)[];
  globalUnique?: (keyof T)[];
  relationship: RelationshipConstraint<Partial<T>>[];
  access?: AccessConstraint<T>[];
}

type Initializer <T, R> = (a: T, s: ConfiguredSession) => R

type EndpointOptions = {
  // parameters used for endpoint that aren't stored in the model
  parameters?: { [index: string]: EscapeBuilder<any> }, 
}

type DependencyDeletionAction = 'delete' | 'unset' | 'setNull' | 'nop'
type DependecyRelationship = 'foreignKey' | 'value'

type Dependency <T=DatabaseRecord> = {
  dependsOn: ModelName[], // list of => OR, multiple dependency records => AND
  dependencyField: string,
  relationship: DependecyRelationship,
  onDependencyDelete: DependencyDeletionAction,
  getDependentValues?: (t: T) => JSONType[], // for accessing the values of a Dependency 
  filterByDependency?: (foreignValue: JSONType, foreignModel?: DatabaseModel) => { // for filtering against a Dependency
    field: string,
    value: JSONType | 'any',
  },
}

type ModelFieldInfo <T, R> = {
  validator: EscapeBuilder<R>,
  readonly?:  boolean,
  required?:  boolean,
  updatesDisabled?: boolean,
  examples?:  JSONType[],
  initializer?: Initializer<Partial<T>, R>, // should include the required fields of T, not just partial
  dependencies?: Dependency<Partial<T>>[],
}

type ModelFields<T> = {
  [K in keyof T]: ModelFieldInfo<T, T[K]>
}
type extractFields<Type> = Type extends ModelFields<infer X> ? X : never

type ArgumentInfo = {
  description?: string;
}

type ActionInfo = {
  name?: string,
  description?: string,
  notes?: string[],
  warnings?: string[],
}

type CustomAction <P=any, R=any> = {
  op: Operation | 'custom',
  access: CRUD,
  // parameters: InputValidation<P>,
  parameters: ModelFields<P>,
  returns: ModelFields<R>,
  path?: string,
  method?: HTTPMethod,
} & ActionInfo

type CustomActionsForModel = {
  [K in ModelName]: { [index: string]: CustomAction }
}

type ReadFilter <T> = { [K in keyof T]?: { required: boolean } }



type SideEffect <T, O=any> = {
  description: string;
  // m is the original model (or undefined, if create)
  // allows for easier event handling based on specific updates (by comparing args to pre-update model)
  handler: (args: Partial<T>[], m: (Partial<T> | undefined)[] | undefined, n: (Partial<T> & { _id: ObjectId })[], s: ConfiguredSession, o: O) => Promise<ErrorInfo[]>;
}

type Model<T, N extends ModelName> = {
  info: { 
    name?: string, 
    description?: string, 
    sideEffects?: { [K in Operation]?: SideEffect<T>[] }
  },
  fields: ModelFields<T>,
  constraints: Constraint<T>,
  defaultActions: { [K in Operation]?: ActionInfo },
  customActions: CustomActionsForModel[N],
  readFilter?: ReadFilter<T>,
  options?: {
    create?: EndpointOptions,
  }
}
type extractModelType<Type> = Type extends Model<infer T, infer N> ? T : never

type Schema = {
  [N in keyof ModelForName]: Model<ModelForName[N], ModelName>
}
