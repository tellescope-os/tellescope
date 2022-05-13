import { ObjectId } from "bson"

import {
  CUD as CUDType,
  CustomUpdateOptions,
  Indexable,
  JSONType,
} from "@tellescope/types-utilities"

import {
  WEBHOOK_MODELS,
  WebhookSupportedModel, 

  FilterType,

  CustomField,
  Preference,
  JourneyState,
  JourneyStatePriority,
  EmailEncoding,
  ChatRoomType,
  AccountType,
  MessageTemplateType,
  MeetingStatus,
  SessionType,
  AttendeeInfo,
  MeetingInfo,
  CUDSubscription,
  FormField,
  AutomationEventType,
  AutomationActionType,
  AutomationEvent,
  AutomationAction,
  EnterStateAutomationEvent,
  LeaveStateAutomationEvent,
  FormResponseAutomationEvent,
  AutomationForForm,
  AutomationForAutomation,
  AutomationForMessage,
  AutomationForFormRequest,
  AutomationForNotification,
  AutomationForJourneyAndState,
  AutomationForWebhook,
  SendEmailAutomationAction,
  SendSMSAutomationAction,
  SendFormAutomationAction,
  // CreateTaskAutomationAction,
  SendNotificationAutomationAction,
  SendWebhookAutomationAction,
  UpdateStateForJourneyAutomationAction,
  RemoveFromSequenceAutomationAction,
  AddToSequenceAutomationAction,
  AutomationEnduserStatus,
  AutomationForTemplate,
  CreateTaskAutomationAction,
  ChatAttachment,
  FormFieldType,
  FormResponseValue,
  ChatAttachmentType,
  CalendarEventReminder,
  CalendarEventReminderType,
  MessageTemplateMode,
  AutomationCondition,
  AutomationConditionType,
  AtJourneyStateAutomationCondition,
  ChatRoomUserInfo,
} from "@tellescope/types-models"
import {
  UserDisplayInfo,
} from "@tellescope/types-client"

import v from 'validator'
export const {
  isDate,
  isEmail,
  isMobilePhone,
  isMongoId,
  isMimeType,
  isURL,
} = v
import isBoolean from "validator/lib/isBoolean" // better for tree-shaking in more configurations

// import {
//   BUSINESS_TYPE,
// } from "@tellescope/constants"

import {
  filter_object,
  is_defined,
  is_object,
  is_whitespace,
  object_is_empty,
  to_object_id,
} from "@tellescope/utilities"

export interface ValidatorOptions {
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
export interface ValidatorOptionsForValue extends ValidatorOptions {
  listOf?: false;
}
export interface ValidatorOptionsForList extends ValidatorOptions {
  listOf: true;
}
export type ValidatorOptionsUnion = ValidatorOptionsForValue | ValidatorOptionsForList

export type EscapeWithOptions<R=any> = (o: ValidatorOptions) => (v: JSONType) => R
export type EscapeFunction<R=any> = (v: JSONType) => R
export type EscapeToList<R=any> = EscapeFunction<R[]>

export type EscapeBuilder <R=any> = {
  (o?: ValidatorOptionsForValue): EscapeFunction<R>;
  (o?: ValidatorOptionsForList):  EscapeFunction<R[]>;
}
export type ComplexEscapeBuilder <C,R=any> = (customization: C) => EscapeBuilder<R>

export type InputValues <T> = { [K in keyof T]: JSONType }
export type InputValidation<T> = { [K in keyof T]: EscapeFunction }

export const MAX_FILE_SIZE = 25000000 // 25 megabytes in bytes
const DEFAULT_MAX_LENGTH = 5000
type BuildValidator_T = {
  (escapeFunction: EscapeFunction, options: ValidatorOptionsForList): EscapeToList;
  (escapeFunction: EscapeFunction, options: ValidatorOptionsForValue): EscapeFunction;
}
export const build_validator: BuildValidator_T = (escapeFunction, options={} as ValidatorOptionsUnion): EscapeToList | EscapeFunction => {
  const { 
    shouldTruncate, isOptional, toLower,
    emptyStringOk, emptyListOk, nullOk,
    isObject, isNumber, listOf, isBoolean,
  } = options

  const minLength = options.minLength || 0
  const maxLength = options.maxLength || DEFAULT_MAX_LENGTH

  return (fieldValue: JSONType) => {
    if (isOptional && fieldValue === undefined) return undefined
    if (nullOk && fieldValue === null) return null
    if ((emptyStringOk || isOptional) && fieldValue === '') return ''
    if (!emptyStringOk && fieldValue === '') throw `Expecting non-empty string but got ${fieldValue}`
    if (isObject && typeof fieldValue !== 'object') {
      try {
        if (typeof fieldValue !== 'string') throw ''

        fieldValue = JSON.parse(fieldValue) // seems necessary for parsing query string
      } catch(err) {
        throw `Expecting an object but got ${fieldValue}`
      }
    }
    if (isNumber && fieldValue === 0) return 0 // avoid falsey issues later

    if (!isOptional && !fieldValue && !(isBoolean && fieldValue === false)) {
      throw 'missing value'
    }

    // asserts for listOf === true, that fieldValue typed as array
    if (listOf && !Array.isArray(fieldValue)) throw `Expecting a list of values but got ${fieldValue}`

    if (listOf && (fieldValue as JSONType[])?.length === 0) {
      if (emptyListOk) return []
      else throw new Error("Expecting a list of values but list is empty")
    }

    if (toLower && typeof fieldValue === 'string') {
      fieldValue = fieldValue.toLowerCase()
    }

    let values = listOf ? fieldValue as JSONType[] : [fieldValue]
    let escapedValues = []

    if (values.length > 1000) throw new Error("Arrays should not contain more than 1000 elements")

    for (let value of values) { 
        if (emptyStringOk && value === '') {
          escapedValues.push(''); continue;
        }
        let escapedValue = escapeFunction(value) // may throw exception, this is fine

        if (typeof escapedValue === 'string') { // is string
            if (escapedValue.length > maxLength) {
                if (shouldTruncate) {
                    escapedValue = escapedValue.substring(0, maxLength)
                } else {
                    throw `Length of escapedValue ${escapedValue} exceeds maxLength ${maxLength}`
                }
            }
            if (escapedValue.length < minLength) {
              throw new Error(`Length of escapedValue ${escapedValue} shorter than minLength ${minLength}`)
            }

            if (!isOptional && escapedValue.length === 0) {
                throw `Value has 0 length after escaping but field is required`
            }
        } else if (isObject && is_object(escapedValue)) { // is parsed JSON
            let parsed = JSON.stringify(escapedValue)
            if (parsed.length > maxLength) {
              throw `Length of JSON ${parsed} exceeds maxLength ${maxLength}`
            }
        } 
        escapedValues.push(escapedValue)
    }
    return listOf ? escapedValues : escapedValues[0]
  }
}

export const fieldsToValidation = <T>(fs: { [K in keyof T]: { validator: EscapeBuilder, required?: boolean } }): InputValidation<T> => {
  const validation = {} as InputValidation<T>

  for (const f in fs) {
    validation[f] = fs[f].validator({ isOptional: !fs[f].required })
  }

  return validation
}

/********************************* VALIDATORS *********************************/
const optionsWithDefaults = (options={} as ValidatorOptions) => {
  return {
    maxLength: options.maxLength || 1000,
    minLength: options.minLength || 0,
    shouldTruncate: options.shouldTruncate || false,
    isOptional: options.isOptional || false,
    emptyStringOk: options.emptyStringOk || false,
    nullOk: options.nullOk || false,
    isObject: options.isObject || false,
    isNumber: options.isNumber || false,
    isBoolean: options.isBoolean || false,
    listOf: options.listOf || false,
    emptyListOk: options.emptyListOk || false,
  }
}

export const binaryOrValidator = <A, B>(f1: EscapeFunction<A>, f2: EscapeFunction<B>): EscapeBuilder<A | B> => (o={}) => build_validator(
  value => {
    try {
      return f1(value)
    } catch(err) {
      return f2(value)
    }
  }, 
  { ...o, listOf: false }
)
export const orValidator = <T>(escapeFunctions: { [K in keyof T]: EscapeFunction<T[K]> }): EscapeBuilder<T[keyof T]> => (o={}) => build_validator(
  value => {
    for (const field in escapeFunctions) {
      const escape = escapeFunctions[field]
      try {
        return escape(value)
      } catch(err) { continue }
    }
    throw 'Value does not match any of the expected options'
  },
  { ...o, listOf: false }
)

export const filterCommandsValidator: EscapeBuilder<FilterType> = (o={}) => build_validator(
  (value: any) => {
    if (!is_object(value)) { throw new Error("Expecting object value for FilterType") }
    
    if (value._exists && typeof value._exists === 'boolean' ) return { _exists: value._exists }
    
    throw new Error(`Unknown filter value ${JSON.stringify(value)}`)
  }, { ...o, isObject: true, listOf: false }
)

export const objectValidator = <T extends object>(i: InputValidation<Required<T>>, objectOptions={ emptyOk: true }): EscapeBuilder<T>  => (o={}) => build_validator(
  (object: any) => {
    const emptyOk = objectOptions.emptyOk ?? true
    const validated = {} as T

    if (!is_object(object)) {
      throw new Error(`Expected a non-null object by got ${object}`)
    }
    if (!emptyOk && object_is_empty(object)) {
      throw new Error(`Expected a non-empty object`)
    }

    const unrecognizedFields = []
    for (const field in object) {
      if (!(i as Indexable)[field]) {
        unrecognizedFields.push(field)
      } 
    }
    if (unrecognizedFields.length > 0) {
      throw new Error(`Got unexpected field(s) [${unrecognizedFields.join(', ')}]`)
    }

    for (const field in i) {
      const value = (object as Indexable)[field] 
      const escaped = i[field](value) // may be required
      if (escaped === undefined) continue

      validated[field] = escaped
    }

    return validated
  }, { ...o, isObject: true, listOf: false }
)

export const objectAnyFieldsValidator = <T=string | number>(valueValidator?: EscapeFunction<T>): EscapeBuilder<Indexable<T>> => (o={}) => build_validator(
  (object: any) => {
    if (!is_object(object)) { throw new Error("Expected a non-null object by got ${object}") }

    const validated = {} as Indexable

    for (const field in object) {
      if (valueValidator) {
        validated[field] = valueValidator(object[field])
      } else if (typeof object[field] === 'number') {
        validated[field] = numberValidator(object[field])
      } else if (typeof object[field] === 'string') {
        validated[field] = stringValidator(object[field])
      } else if (object[field] === null) {
        validated[field] = null
      } else {
        throw new Error(`Field ${field} is not a string or number`)
      }
    }

    return validated
  }, { ...o, isObject: true, listOf: false }
)

export const objectAnyFieldsAnyValuesValidator = objectAnyFieldsValidator()

export const escapeString: EscapeWithOptions<string> = (o={}) => string => {
  if (typeof string !== "string") throw new Error('Expecting string value')

  if (o.trim) {
    string = string.trim()

    if (o.isOptional && string === '') {
      throw new Error(o.errorMessage || "String is only whitespace")
    }
  }
  return string
}
export const stringValidator: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: o.maxLength ?? 1000, listOf: false  } 
)
export const stringValidator100: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 100, listOf: false  } 
)
export const stringValidator250: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 250, listOf: false  } 
)
export const stringValidator5000: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 5000, listOf: false  } 
)
export const stringValidator25000: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 25000, listOf: false  } 
)
export const SMSMessageValidator: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 630, listOf: false  } 
)

export const listValidator = <T>(b: EscapeFunction<T>): EscapeBuilder<T[]> => o => build_validator(
  b, { ...o, listOf: true }
)
export const listValidatorEmptyOk = <T>(b: EscapeFunction<T>): EscapeBuilder<T[]> => o => build_validator(
  b, { ...o, listOf: true, emptyListOk: true }
)

export const listOfStringsValidator = listValidator(stringValidator()) 
export const listOfStringsValidatorEmptyOk = listValidatorEmptyOk(stringValidator()) 
export const listOfObjectAnyFieldsAnyValuesValidator = listValidator(objectAnyFieldsAnyValuesValidator())

export const booleanValidator: EscapeBuilder<boolean> = (options={}) => build_validator(
  boolean => {
    if (boolean !== true && boolean !== false) {
      throw new Error(options.errorMessage || "Invalid boolean")
    }
    return boolean
  }, 
  { ...options, isBoolean: true, listOf: false }
)

export const escapeMongoId: EscapeFunction<string> = (mongoId: any) => {
  if (typeof mongoId !== 'string') throw new Error('Expecting string id')
  if (!isMongoId(mongoId)) {
    throw new Error("Invalid id")
  }
  return mongoId
}
export const mongoIdValidator: EscapeBuilder<ObjectId> = (o={}) => build_validator(
  s => to_object_id(escapeMongoId(s)), { ...optionsWithDefaults(o), maxLength: 100, listOf: false } 
) 
export const mongoIdStringValidator: EscapeBuilder<string> = (o={}) => build_validator(
  escapeMongoId, { ...optionsWithDefaults(o), maxLength: 100, listOf: false } 
) 

export const mongoIdRequired = mongoIdValidator()
export const mongoIdOptional = mongoIdValidator({ isOptional: true })
export const mongoIdStringRequired = mongoIdStringValidator()
export const mongoIdStringOptional = mongoIdStringValidator({ isOptional: true })
export const listOfMongoIdValidator = listValidator(mongoIdValidator())
export const listOfMongoIdStringValidator = listValidator(mongoIdStringValidator())

export const first_letter_capitalized = (s='') => s.charAt(0).toUpperCase() + s.slice(1)
export const escape_name = (namestring: string) => namestring.replace(/[^a-zA-Z0-9-_ /.]/, '').substring(0, 100)

// enforces first-letter capitalization
export const nameValidator: EscapeBuilder<string> = (options={}) => build_validator(
  name => {
    if (typeof name !== 'string') throw new Error('Expecting string value')

    name = escape_name(name)  
    if (!name) throw new Error("Invalid name")

    return first_letter_capitalized(name) 
  }, 
  { ...options, maxLength: 100, trim: true, listOf: false }
)


export const emailValidator: EscapeBuilder<string> = (options={}) => build_validator(
  (email) => {
    if (typeof email !== 'string') throw new Error('Expecting string value')
    if (!isEmail(email)) { throw new Error(options.errorMessage || "Invalid email") }

    return email.toLowerCase()
  }, 
  { ...options, maxLength: 250, listOf: false }
)


export const numberValidatorBuilder: ComplexEscapeBuilder<{ lower: number, upper: number }, number> = r => (options={}) => {
  options.isNumber = true

  return build_validator(
   (number: any) => {
      number = Number(number) // ok to throw error!
      if (typeof number !== "number" || isNaN(number)) {
        throw new Error(options.errorMessage || `Not a valid number`)
      }
      if (!r) return number

      if (!(number >= r.lower && number <= r.upper)) {
        throw new Error(options.errorMessage || `Not a valid number for [${r.lower}-${r.upper}]`)
      }
      return number
    }, 
    { ...options, listOf: false }
  )
}

export const nonNegNumberValidator = numberValidatorBuilder({ lower: 0, upper: 10000000000000 }) // max is 2286 in UTC MS
export const numberValidator = numberValidatorBuilder({ lower: -100000000, upper: 10000000000000 }) // max is 2286 in UTC MS
export const fileSizeValidator = numberValidatorBuilder({ lower: 0, upper: MAX_FILE_SIZE })

export const dateValidator: EscapeBuilder<Date> = (options={}) => build_validator(
  (date: any) => {
    if (isDate(date)) throw new Error(options.errorMessage || "Invalid date") 

    return new Date(date)
  }, 
  { ...options, maxLength: 250, listOf: false }
)

export const exactMatchValidator = <T extends string>(matches: T[]): EscapeBuilder<T> => (o={}) => build_validator(
  (match: JSONType) => {
    if (matches.filter(m => m === match).length === 0) {
      throw new Error(`Value must match one of ${matches}`)
    }
    return match
  }, 
  { ...o, listOf: false }
)
export const exactMatchListValidator = <T extends string>(matches: T[]): EscapeBuilder<T[]> => (o={}) => build_validator(
  (match: JSONType) => {
    if (matches.filter(m => m === match).length === 0) {
      throw new Error(`Value must match one of ${matches}`)
    }
    return match
  }, 
  { ...o, listOf: true }
)

export const journeysValidator: EscapeBuilder<Indexable> = (options={}) => build_validator(
  (journeys) => {
    if (typeof journeys !== 'object') {
      throw new Error('Expecting an object')
    }

    const mIdValidator = mongoIdValidator()
    const stateValidator   = stringValidator({ maxLength: 75, errorMessage: "Journey state names may not exceed 75 characters" })
    for (const j in journeys) {
      mIdValidator(j);
      (journeys as Indexable)[j] = stateValidator(journeys[j as keyof typeof journeys]);
    }
    return journeys
  }, 
  { ...options, isObject: true, listOf: false }
)

export const escape_phone_number = (p='') => p.replace(/[^\d+]/g, '')

export const phoneValidator: EscapeBuilder<string> = (options={}) => build_validator(
  phone => {
    if (typeof phone !== "string") throw new Error(`Expecting phone to be string but got ${phone}`)

    let escaped = escape_phone_number(phone) 
    if (escaped.length < 10) throw new Error(`Phone number must be at least 10 digits`)

    escaped = escaped.startsWith('+') ? escaped
            : escaped.length === 10   ? '+1' + escaped // assume US country code for now
                                      : "+"  + escaped // assume country code provided, but missing leading +

    if (!isMobilePhone(escaped, 'any', { strictMode: true })) {
      throw `Invalid phone number`
    }

    return escaped
  }, 
  { ...options, maxLength: 25, listOf: false }
)

export const fileTypeValidator: EscapeBuilder<string> = (options={}) => build_validator(
  (s: any) => {
    if (typeof s !== 'string') throw new Error("fileType must be a string")
    if (!isMimeType(s)) throw new Error(`${s} is not a valid file type`)

    return s
  }, 
  { ...options, listOf: false }
)

export const urlValidator: EscapeBuilder<string> = (options={}) => build_validator(
  (s: any) => {
    if (typeof s !== 'string') throw new Error("URL must be a string")
    if (!isURL(s)) throw new Error(`${s} is not a valid URL`)

    return s
  }, 
  { ...options, listOf: false }
)

export const safeBase64Validator = (options={}) => build_validator(
  (sb64: any) => {
    if (typeof sb64 !== 'string') throw new Error("Expecting string")

    // https://stackoverflow.com/questions/12930007/how-to-validate-base64-string-using-regex-in-javascript
    // regex with = + and / replaced as get_random_base64_URL_safe 
    if (!/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}..|[A-Za-z0-9_-]{3}.)?$/.test(sb64)) {
      throw `Invalid safe base64`
    }
    return sb64
  },
  { ...options, listOf: false }
)

export const subdomainValidator = (options={}) => build_validator(
  subdomain => {
    if (typeof subdomain !== 'string') throw new Error("Expecting string value") 

    subdomain = subdomain.toLowerCase()
    if (subdomain.startsWith('-')) {
      subdomain = subdomain.substring(1)
    }
    while (subdomain.endsWith('-')) {
      subdomain = subdomain.substring(0, subdomain.length - 1)
    }

    subdomain = subdomain.replace(/[^a-zA-Z\d-]/g, '')

    return subdomain
  }, 
  { ...options, maxLength: 50, listOf: false }
)

type FileResponse = { type: 'file', name: string, secureName: string }
// export const fileResponseValidator: EscapeBuilder<FileResponse> = (options={}) => build_validator(
//   (file: any) => {
//     if (!file.secureName) throw new Error("Missing name")
//     return {
//       type: 'file',
//       name: stringValidator({ shouldTruncate: true, maxLength: 250 })(file.name).substring(0, 250),
//       secureName: safeBase64Validator()(file.secureName)
//     }
//   }, 
//   { ...options, isObject: true, listOf: false }
// )
export const fileResponseValidator = objectValidator<FileResponse>({
  type: exactMatchValidator(['file'])(),
  name: stringValidator({ shouldTruncate: true, maxLength: 250 }),
  secureName: safeBase64Validator(),
})

type SignatureResponse = { type: 'signature', signed: string | null, fullName: string }
export const signatureResponseValidator = objectValidator<SignatureResponse>({
  type: exactMatchValidator(['signature'])(),
  fullName: stringValidator({ maxLength: 100 }),
  signed: booleanValidator(), 
})


type MultipleChoiceOptions = {
  choices: string[],
  other: boolean,
  radio: boolean,
}

const DEFAULT_ENDUSER_FIELDS = [
  '_id', 'email', 'phone', 'fname', 'lname', 'journeys', 'tags', 'preference'
]

// todo: move preference to FIELD_TYPES with drop-down option in user-facing forms
// const FIELD_TYPES = ['string', 'number', 'email', 'phone', 'multiple_choice', 'file', 'signature']
// const VALIDATE_OPTIONS_FOR_FIELD_TYPES = {
//   'multiple_choice': {
//     choices: listOfStringsValidator({  maxLength: 100, errorMessage: "Multiple choice options must be under 100 characters, and you must have at least one option." }),
//     radio: booleanValidator({ errorMessage: "radio must be a boolean" }),
//     other: booleanValidator({ isOptional: true, errorMessage: "other must be a boolean" }),
//     REQUIRED: ['choices', 'radio'],
//   }
// }
export const FORM_FIELD_VALIDATORS_BY_TYPE: { [K in FormFieldType]: (value?: FormResponseValue, options?: any, isOptional?: boolean) => any } = {
  'string': stringValidator({ maxLength: 5000, emptyStringOk: true, errorMessage: "Response must not exceed 5000 characters" }),
  'number': numberValidator({ errorMessage: "Response must be a number" }),
  'email': emailValidator(),
  'phoneNumber': phoneValidator(),
  'file': (fileInfo: FileResponse | undefined, _, isOptional) => {
    if (isOptional && (!fileInfo || object_is_empty(fileInfo))) { 
      return { type: 'file', secureName: null }
    }
    return fileResponseValidator()(fileInfo)
  },
  'signature': (sigInfo: SignatureResponse | undefined, _, isOptional) => {
    if (isOptional && (!sigInfo || object_is_empty(sigInfo)))  {
      return { type: 'signature', signed: null }
    }
    return signatureResponseValidator()(sigInfo)
  },
  'multiple_choice': (choiceInfo: { indexes: [], otherText?: string }, fieldOptions: MultipleChoiceOptions, isOptional) => {
    if (isOptional && !choiceInfo) return []

    const { indexes, otherText } = choiceInfo

    if (!indexes || indexes.length === undefined) { // no indexes (or empty array) provided
      throw new Error('At least 1 choice is required')
    }

    const parsed = []
    for (const i of indexes) {
      if (typeof i !== 'number') throw new Error(`Choice ${i} is not a valid index`)
      if (i < 0 || i >= fieldOptions.choices.length) throw new Error(`Choice ${i} is not a valid index`)

      parsed.push(fieldOptions.choices[i])
    }
    if (otherText && fieldOptions.other === true) parsed.push(otherText)
    // todo: add length limit to otherText?

    if (parsed.length === 0) throw new Error(`No options provided`)
    if (parsed.length > 1 && fieldOptions.radio === true) throw new Error(`Only 1 choice is allowed`)


    return parsed
   },
}
export const fieldsValidator: EscapeBuilder<Indexable<string | CustomField>> = (options={}) => build_validator(
  (fields: any) => {
    if (!is_object(fields)) throw new Error("Expecting an object")

    for (const k in fields) {
      if (DEFAULT_ENDUSER_FIELDS.includes(k)) throw new Error(`key ${k} conflicts with a built-in field.`)
      if (k.startsWith('_')) throw new Error("Fields that start with '_' are not allowed")
      if (is_whitespace(k)) {
        delete fields[k]
        continue
      }

      if (k.length > 32) throw new Error(`key ${k} is greater than 32 characters`)

      const val = fields[k]
      if (typeof val === 'string') {
        if (val.length > 512) fields[k] = val.substring(0, 512)
        continue
      } else if (typeof val === 'number' || val === null || typeof val === 'boolean') {
        continue // nothing to restrict on number type yet
      } else if (typeof val === 'object') {
        if (JSON.stringify(val).length > 1024) throw new Error(`object value for key ${k} exceeds the maximum length of 1024 characters in string representation`)
        // previous restricted structure for fields object
        // try {
        //   if (val.type && typeof val.type === 'string') { // form responses can be stored as custom fields (form responses is simple array)
        //     FORM_FIELD_VALIDATORS_BY_TYPE[val.type as keyof typeof FORM_FIELD_VALIDATORS_BY_TYPE](val, undefined as never, undefined as never)
        //     continue
        //   }
        //   if (val.length && typeof val.length === 'number') { // array of strings is ok too, (inclusive of multiple-choice responses)
        //     if (val.find((s: any) => typeof s !== 'string') !== undefined) {
        //       throw new Error('List must contain only strings')
        //     }
        //     continue 
        //   }

        //   if (val.value === undefined) throw new Error(`value field is undefined for key ${k}`)
        //   if (JSON.stringify(val).length > 1024) throw new Error(`object value for key ${k} exceeds the maximum length of 1024 characters in string representation`)

        //   const escaped = { value: val.value } as Indexable // create new object to omit unrecognized fields
        //   escaped.title = val.title // optional
        //   escaped.description = val.description // optional
        //   fields[k] = escaped
        // } catch(err) {
        //   throw new Error(`object value is invalid JSON for key ${k}`)
        // }
      } else {
        throw new Error(`Expecting value to be a string or object but got ${typeof val} for key {k}`)
      }
    }

    return fields
  }, 
  { ...options, isObject: true, listOf: false }
)

export const preferenceValidator = exactMatchValidator<Preference>(['email', 'sms', 'call', 'chat'])

export const updateOptionsValidator = objectValidator<CustomUpdateOptions>({
  replaceObjectFields: booleanValidator({ isOptional: true }),
})

export const journeyStatePriorityValidator = exactMatchValidator<JourneyStatePriority>(["Disengaged", "N/A", "Engaged"])

export const journeyStateValidator = objectValidator<JourneyState>({
  name: stringValidator100(),
  priority: journeyStatePriorityValidator(),
  description: stringValidator({ isOptional: true }),
  requiresFollowup: booleanValidator({ isOptional: true }),
})
export const journeyStateUpdateValidator = objectValidator<JourneyState>({
  name: stringValidator100({ isOptional: true }),
  priority: journeyStatePriorityValidator({ isOptional: true }),
  description: stringValidator({ isOptional: true }),
  requiresFollowup: booleanValidator({ isOptional: true }),
})
export const journeyStatesValidator = listValidator(journeyStateValidator())

export const emailEncodingValidator = exactMatchValidator<EmailEncoding>(['', 'base64'])

export const validateIndexable = <V>(keyValidator: EscapeFunction<string | number>, valueValidator: EscapeFunction<V>): EscapeBuilder<{ [index: string | number]: V }> => o => build_validator(
    v => {
      if (!is_object(v)) throw new Error("Expecting an object")

      const validated = {} as Indexable

      for (const k in v) {
        validated[keyValidator(k)] = valueValidator(v[k as keyof typeof v])
      }
    },
    { ...o, isObject: true, listOf: false }
  )
export const indexableValidator = <V>(keyValidator: EscapeFunction<string>, valueValidator: EscapeFunction<V>): EscapeBuilder<{ [index: string]: V }> => (
  validateIndexable(keyValidator, valueValidator)
)
export const indexableNumberValidator = <V>(keyValidator: EscapeFunction<number>, valueValidator: EscapeFunction<V>): EscapeBuilder<{ [index: number]: V }> => (
  validateIndexable(keyValidator, valueValidator)
)

export const rejectionWithMessage: EscapeBuilder<undefined> = o => build_validator(
  v => { throw new Error(o?.errorMessage || 'This field is not valid') }, 
  { ...o, isOptional: true, listOf: false, }
)

export const numberToDateValidator = indexableNumberValidator(numberValidator(), dateValidator())
export const idStringToDateValidator = indexableValidator(mongoIdStringValidator(), dateValidator())

// todo: move preference to FIELD_TYPES with drop-down option in user-facing forms
const FIELD_TYPES = ['string', 'number', 'email', 'phone', 'multiple_choice', 'file', 'signature']
const VALIDATE_OPTIONS_FOR_FIELD_TYPES = {
  'multiple_choice': {
    choices: listOfStringsValidator({ maxLength: 100, errorMessage: "Multiple choice options must be under 100 characters, and you must have at least one option." }),
    radio: booleanValidator({ errorMessage: "radio must be a boolean" }),
    other: booleanValidator({ isOptional: true, errorMessage: "other must be a boolean" }),
    REQUIRED: ['choices', 'radio'],
  }
}
export const RESERVED_INTAKE_FIELDS = ['_id', 'id', 'externalId', 'phoneConsent', 'emailConsent', 'tags', 'journeys', 'updatedAt', 'preference', 'assignedTo', 'lastCommunication']

export const ENDUSER_FIELD_TYPES = {
  'email': 'email',
  'phone': 'phone',
  'fname': 'string',
  'lname': 'string',
} 
export const INTERNAL_NAME_TO_DISPLAY_FIELD = { 
  "string": 'Text',
  "number": 'Number',
  "email": "Email",
  "phone": "Phone Number",
  multiple_choice: "Multiple Choice",
  "signature": "Signature",
}

const isFormField = (f: JSONType, fieldOptions={ forUpdate: false }) => {
  if (!is_object(f)) throw new Error("Expecting an object")
  const field = f as Indexable

  const { forUpdate } = fieldOptions
  if (forUpdate) {
    const { isOptional, type, title, description, intakeField, options } = field 
    if (
      object_is_empty(filter_object({
        isOptional, type, title, description, intakeField, options
      }, is_defined))
    )
    { 
      throw `No update provided` 
    }
  } 

  if (forUpdate === false || field.isOptional !== undefined)
    field.isOptional = !!field.isOptional // coerce to bool, defaulting to false (required)


  if (!forUpdate && !field.type) throw `field.type is required` // fieldName otherwise given as 'field' in validation for every subfield
  if (field.type) exactMatchValidator(FIELD_TYPES)(field.type)

  if (!forUpdate && !field.title) throw `field.title is required` // fieldName otherwise given as 'field' in validation for every subfield
  if (field.title) {
    field.title = stringValidator({ 
      maxLength: 100, 
      errorMessage: "field title is required and must not exceed 100 characters" 
    })(field.title)
  }

  if (!forUpdate || field.description !== undefined){ // don't overwrite description on update with ''
    field.description = stringValidator({ 
      isOptional: true,
      maxLength: 500, 
      errorMessage: "field description must be under 500 characters" 
    })(field.description) || ''
  }

  field.options = field.options || {} // ensure at least an empty object is provided
  if (VALIDATE_OPTIONS_FOR_FIELD_TYPES[field.type as keyof typeof VALIDATE_OPTIONS_FOR_FIELD_TYPES] !== undefined) {
    if (typeof field.options !== 'object') throw new Error(`Expected options to be an object but got ${typeof field.options}`)

    const validators = VALIDATE_OPTIONS_FOR_FIELD_TYPES[field.type as keyof typeof VALIDATE_OPTIONS_FOR_FIELD_TYPES]
    const requiredOptions = validators.REQUIRED
    if (requiredOptions.length > Object.keys(field.options).length) {
      for (const k of requiredOptions) {
        if (field.options[k] === undefined) {
          throw new Error(`Missing required field ${k}`)
        }
      }
    }

    for (const k in field.options) {
      if (validators[k as keyof typeof validators] === undefined) {
        throw new Error(`Got unexpected option ${k} for field of type ${INTERNAL_NAME_TO_DISPLAY_FIELD[field.type as keyof typeof INTERNAL_NAME_TO_DISPLAY_FIELD] || 'Text'}`)
      }
      field.options[k] = (validators[k as keyof typeof validators] as EscapeFunction)(field.options[k])
    }
  }

  if (field.intakeField !== undefined) { // allow null to unset intake
    if (RESERVED_INTAKE_FIELDS.includes(field.intakeField)) {
      throw new Error(`${field.intakeField} is reserved for internal use only and cannot be used as an intake field`)
    }

    const intakeType = ENDUSER_FIELD_TYPES[field.intakeField as keyof typeof ENDUSER_FIELD_TYPES]
    if (intakeType && intakeType !== field.type) {
      throw new Error(
        `Intake field ${field.intakeField} requires a form field type of ${INTERNAL_NAME_TO_DISPLAY_FIELD[intakeType as keyof typeof INTERNAL_NAME_TO_DISPLAY_FIELD] || 'Text'}`
      )
    }
  }

  return field
}

export const formResponsesValidator = (options={}) => build_validator(
  responses => responses, // naively allow all types, to be validated by endpoint, 
  { ...options, isOptional: true, listOf: true } // isOptional allows for optional fields, but should validate required vs missing in endpoint
)

export const intakePhoneValidator = exactMatchValidator<'optional' | 'required'>(['optional', 'required'])

export const formFieldValidator: EscapeBuilder<FormField> = (options={}, fieldOptions={ forUpdate: false }) => build_validator(
  v => isFormField(v, fieldOptions), 
  { ...options, isObject: true, listOf: false }
)
export const listOfFormFieldsValidator: EscapeBuilder<FormField[]> = (options={}, fieldOptions={ forUpdate: false }) => build_validator(
  v => isFormField(v, fieldOptions), 
  { ...options, isObject: true, listOf: true, emptyListOk: true }
)


// // to ensure all topics in type have coverage at compile-time
// const _CHAT_ROOM_TOPICS: { [K in ChatRoomTopic]: any } = {
//   task: '',
//   enduser: '',
// }
// export const CHAT_ROOM_TOPICS = Object.keys(_CHAT_ROOM_TOPICS) as ChatRoomTopic[]
// export const chatRoomTopicValidator = exactMatchValidator<ChatRoomTopic>(CHAT_ROOM_TOPICS)

// to ensure all topics in type have coverage at compile-time
const _CHAT_ROOM_TYPES: { [K in ChatRoomType]: any } = {
  internal: '',
  external: '',
}
export const CHAT_ROOM_TYPES = Object.keys(_CHAT_ROOM_TYPES) as ChatRoomType[]
export const chatRoomTypeValidator = exactMatchValidator<ChatRoomType>(CHAT_ROOM_TYPES)


const _ACCOUNT_TYPES: { [K in AccountType]: any } = {
  Business: '',
}
export const ACCOUNT_TYPES = Object.keys(_ACCOUNT_TYPES) as AccountType[]
export const accountTypeValidator = exactMatchValidator<AccountType>(ACCOUNT_TYPES)

const _MESSAGE_TEMPLATE_TYPES: { [K in MessageTemplateType]: any } = {
  enduser: '',
  team: '',
}
export const MESSAGE_TEMPLATE_TYPES = Object.keys(_MESSAGE_TEMPLATE_TYPES) as MessageTemplateType[]
export const messageTemplateTypeValidator = exactMatchValidator<MessageTemplateType>(MESSAGE_TEMPLATE_TYPES)

const _MEETING_STATUSES: { [K in MeetingStatus]: any } = {
  ended: '',
  live: '',
  scheduled: '',
}
export const MEETING_STATUSES = Object.keys(_MEETING_STATUSES) as MeetingStatus[]
export const meetingStatusValidator = exactMatchValidator<MeetingStatus>(MEETING_STATUSES)

const _CUD: { [K in CUDType]: any } = {
  create: '',
  update: '',
  delete: '',
}
export const CUD = Object.keys(_CUD) as CUDType[]

export const CUDStringValidator = exactMatchValidator<CUDType>(CUD)

export const CUDValidator = objectValidator<CUDSubscription>({
  create: booleanValidator({ isOptional: true }),
  update: booleanValidator({ isOptional: true }),
  delete: booleanValidator({ isOptional: true }),
})

const WebhookSubscriptionValidatorObject = {} as { [K in WebhookSupportedModel]: EscapeFunction<CUDSubscription> } 
for (const model in WEBHOOK_MODELS) {
  WebhookSubscriptionValidatorObject[model as WebhookSupportedModel] = CUDValidator({ listOf: false, isOptional: true })
}
export const WebhookSubscriptionValidator = objectValidator<{ [K in WebhookSupportedModel]: CUDSubscription}>(
  WebhookSubscriptionValidatorObject
)

export const sessionTypeValidator = exactMatchValidator<SessionType>(['user', 'enduser'])

export const listOfDisplayNameInfo = listValidator(objectValidator<{ fname: string, lname: string, id: string }>({ 
  fname: nameValidator(), 
  lname: nameValidator(),
  id: listOfMongoIdStringValidator(),
})())

export const attendeeInfoValidator = objectValidator<AttendeeInfo>({
  AttendeeId: stringValidator(),
  ExternalUserId: mongoIdStringValidator(),
  JoinToken: stringValidator(),
})

export const attendeeValidator = objectValidator<{
  type: SessionType,
  id: string,
  info: { Attendee: AttendeeInfo },
}>({ 
  type: sessionTypeValidator(),
  id: mongoIdStringValidator(),
  info: attendeeInfoValidator(),
}) 
export const listOfAttendeesValidator = listValidator(attendeeValidator())
export const meetingInfoValidator = objectValidator<{ Meeting: MeetingInfo }>({ 
  Meeting: objectAnyFieldsAnyValuesValidator(),
}) 

export const userIdentityValidator = objectValidator<{
  type: SessionType,
  id: string,
}>({ 
  type: sessionTypeValidator(),
  id: mongoIdStringValidator(),
}) 
export const listOfUserIndentitiesValidator = listValidator(userIdentityValidator())

export const chatAttachmentValidator = objectValidator<ChatAttachment>({ 
  type: exactMatchValidator<ChatAttachmentType>(['image', 'file'])(),
  secureName: stringValidator250(),
}) 
export const listOfChatAttachmentsValidator = listValidator(chatAttachmentValidator())

export const meetingsListValidator = listValidator(objectValidator<{
  id: string,
  updatedAt: string,
  status: MeetingStatus,
}>({
  id: mongoIdStringValidator(),
  updatedAt: stringValidator(),
  status: meetingStatusValidator(),
})())

export const userDisplayInfoValidator = objectValidator<UserDisplayInfo>({
  id: mongoIdRequired,
  createdAt: dateValidator(),
  avatar: stringValidator(),
  fname: nameValidator(), 
  lname: nameValidator(),
  lastActive: dateValidator(),
  lastLogout: dateValidator(),
  email: emailValidator(),
})
export const meetingDisplayInfoValidator = indexableValidator(mongoIdStringRequired, userDisplayInfoValidator())

export const chatRoomUserInfoValidator = objectAnyFieldsValidator(objectValidator<ChatRoomUserInfo>({
  unreadCount: nonNegNumberValidator(),
})())

const _AUTOMATION_ENDUSER_STATUS: { [K in AutomationEnduserStatus]: any } = {
  active: '',
  paused: '',
  finished: '',
}
export const AUTOMATION_ENDUSER_STATUS = Object.keys(_AUTOMATION_ENDUSER_STATUS) as AutomationEnduserStatus[]
export const automationEnduserStatusValidator = exactMatchValidator<AutomationEnduserStatus>(AUTOMATION_ENDUSER_STATUS)

const _AUTOMATION_EVENTS: { [K in AutomationEventType]: any } = {
  enterState: '',
  formResponse: '',
  leaveState: '',
}
export const AUTOMATION_EVENTS = Object.keys(_AUTOMATION_EVENTS) as AutomationEventType[]
export const automationEventTypeValidator = exactMatchValidator<AutomationEventType>(AUTOMATION_EVENTS)

const _AUTOMATION_ACTIONS: { [K in AutomationActionType]: any } = {
  addToSequence: '',
  removeFromSequence: '',
  createTask: '',
  sendEmail: '',
  sendSMS: '',
  sendForm: '',
  sendNotification: '',
  updateStateForJourney: '',
  sendWebhook: '',
}
export const AUTOMATION_ACTIONS = Object.keys(_AUTOMATION_ACTIONS) as AutomationActionType[]
export const automationActionTypeValidator = exactMatchValidator<AutomationActionType>(AUTOMATION_ACTIONS)


const _MESSAGE_TEMPLATE_MODES: { [K in MessageTemplateMode]: any } = {
  richtext: '',
  html: '',
}
export const MESSAGE_TEMPLATE_MODES = Object.keys(_MESSAGE_TEMPLATE_MODES) as MessageTemplateMode[]
export const messageTemplateModeValidator = exactMatchValidator<MessageTemplateMode>(MESSAGE_TEMPLATE_MODES)

export const calendarEventReminderValidator = objectValidator<CalendarEventReminder>({
  type: exactMatchValidator<CalendarEventReminderType>(['webhook'])(),
  remindAt: nonNegNumberValidator(),
  didRemind: booleanValidator({ isOptional: true }),
})()
export const listOfCalendarEventRemindersValidator = listValidator(calendarEventReminderValidator)

export const automationEventValidator = orValidator<{ [K in AutomationEventType]: AutomationEvent & { type: K } } >({
  enterState: objectValidator<EnterStateAutomationEvent>({
    type: exactMatchValidator(['enterState'])(),
    info: objectValidator<AutomationForJourneyAndState>({ state: stringValidator100(), journeyId: mongoIdStringRequired })(),
  })(),
  leaveState: objectValidator<LeaveStateAutomationEvent>({
    type: exactMatchValidator(['leaveState'])(),
    info: objectValidator<AutomationForJourneyAndState>({ state: stringValidator100(), journeyId: mongoIdStringRequired })(),
  })(),
  formResponse: objectValidator<FormResponseAutomationEvent>({
    type: exactMatchValidator(['formResponse'])(),
    info: objectValidator<AutomationForForm>({ formId: mongoIdStringValidator() })(),
  })(),
})

export const automationConditionValidator = orValidator<{ [K in AutomationConditionType]: AutomationCondition & { type: K } } >({
  atJourneyState: objectValidator<AtJourneyStateAutomationCondition>({
    type: exactMatchValidator(['atJourneyState'])(),
    info: objectValidator<AutomationForJourneyAndState>({ state: stringValidator100(), journeyId: mongoIdStringRequired })(),
  })(),
})
export const listOfAutomationConditionsValidator = listValidatorEmptyOk(automationConditionValidator())

export const automationActionValidator = orValidator<{ [K in AutomationActionType]: AutomationAction & { type: K } } >({
  sendEmail: objectValidator<SendEmailAutomationAction>({
    type: exactMatchValidator(['sendEmail'])(),
    info: objectValidator<AutomationForMessage>({ senderId: mongoIdStringValidator(), templateId: mongoIdStringValidator() })(),
  })(),
  sendSMS: objectValidator<SendSMSAutomationAction>({
    type: exactMatchValidator(['sendSMS'])(),
    info: objectValidator<AutomationForMessage>({ senderId: mongoIdStringValidator(), templateId: mongoIdStringValidator() })(),
  })(),
  sendForm: objectValidator<SendFormAutomationAction>({
    type: exactMatchValidator(['sendForm'])(),
    info: objectValidator<AutomationForFormRequest>({ senderId: mongoIdStringValidator(), formId: mongoIdStringValidator() })(),
  })(),
  createTask: objectValidator<CreateTaskAutomationAction>({
    type: exactMatchValidator(['createTask'])(),
    info: objectValidator<AutomationForTemplate>({ templateId: mongoIdStringValidator() })(),
  })(),
  sendNotification: objectValidator<SendNotificationAutomationAction>({
    type: exactMatchValidator(['sendNotification'])(),
    info: objectValidator<AutomationForNotification>({ templateId: mongoIdStringRequired, destination: stringValidator5000() })(),
  })(),
  sendWebhook: objectValidator<SendWebhookAutomationAction>({
    type: exactMatchValidator(['sendWebhook'])(),
    info: objectValidator<AutomationForWebhook>({ message: stringValidator5000() })(),
  })(),
  updateStateForJourney: objectValidator<UpdateStateForJourneyAutomationAction>({
    type: exactMatchValidator(['updateStateForJourney'])(),
    info: objectValidator<AutomationForJourneyAndState>({ journeyId: mongoIdStringRequired, state: stringValidator100() })(),
  })(),
  addToSequence: objectValidator<AddToSequenceAutomationAction>({
    type: exactMatchValidator(['addToSequence'])(),
    info: objectValidator<AutomationForAutomation>({ automationId: mongoIdStringValidator() })(),
  })(),
  removeFromSequence: objectValidator<RemoveFromSequenceAutomationAction>({
    type: exactMatchValidator(['removeFromSequence'])(),
    info: objectValidator<AutomationForAutomation>({ automationId: mongoIdStringValidator() })(),
  })(),
})

