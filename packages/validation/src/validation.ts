//import "@tellescope/types"
import { ObjectId } from "bson"

import {
  RequestHandler,
  Request,
} from "express"

import v from 'validator'
export const {
  isDate,
  isEmail,
  isMobilePhone,
  isMongoId,
} = v

// import {
//   BUSINESS_TYPE,
// } from "@tellescope/constants"

import {
  is_object,
  is_whitespace,
  object_is_empty,
  to_object_id,
} from "@tellescope/utilities"

// type EscapeWithOptions<R=any> = (o: ValidatorOptions) => (v: JSONType) => R
// type EscapeFunction<R=any> = (v: JSONType) => R
// type EscapeToList<R=any> = EscapeFunction<R[]>

// interface ValidatorOptions {
//   maxLength?: number;
//   minLength?: number; 
//   shouldTruncate?: boolean; 
//   toLower?: boolean;
//   isOptional?: boolean; 
//   emptyStringOk?: boolean; 
//   emptyListOk?: boolean; 
//   nullOk?: boolean;
//   isObject?: boolean; 
//   isNumber?: boolean; 
//   listOf?: boolean; 
//   isBoolean?: boolean;
//   errorMessage?: string;
//   trim?: boolean;
// }  
// interface ValidatorOptionsForValue extends ValidatorOptions {
//   listOf?: false;
// }
// interface ValidatorOptionsForList extends ValidatorOptions {
//   listOf: true;
// }
// type ValidatorOptionsUnion = ValidatorOptionsForValue | ValidatorOptionsForList

// export type EscapeBuilder <R=any> = {
//   (o?: ValidatorOptionsForValue): EscapeFunction<R>;
//   (o?: ValidatorOptionsForList):  EscapeFunction<R[]>;
// }
// type ComplexEscapeBuilder <C,R=any> = (customization: C) => EscapeBuilder<R>

// type InputValues <T> = { [K in keyof T]: JSONType }
// export type InputValidation<T> = { [K in keyof T]: EscapeFunction }

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
    if (emptyStringOk && fieldValue === '') return ''
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
      else throw new Error("Expecting a list of values but got none")
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

export const objectValidator = <T extends object>(i: InputValidation<Required<T>>): EscapeBuilder<T>  => (o={}) => build_validator(
  (object: any) => {
    const validated = {} as T

    if (!is_object(object)) {
      throw new Error("Expected a non-null object by got ${object}")
    }

    for (const field in i) {
      const value = (object as Indexable)[field] 
      const escaped = i[field](value) // may be required
      if (escaped) { // omit undefined, optional arguments
        validated[field] = escaped
      }
    }

    return validated
  }, { ...o, isObject: true, listOf: false }
)

export const objectAnyFieldsValidator: EscapeBuilder<Indexable<string | number>> = (o={}) => build_validator(
  (object: any) => {
    if (!is_object(object)) { throw new Error("Expected a non-null object by got ${object}") }

    const validated = {} as Indexable

    for (const field in object) {
      if (typeof object[field] === 'number') {
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
export const SMSMessageValidator: EscapeBuilder<string> = (o={}) => build_validator(
  escapeString(o), { ...o, maxLength: 630, listOf: false  } 
)

export const listValidator = <T>(b: EscapeFunction<T>): EscapeBuilder<T[]> => o => build_validator(
  b, { ...o, listOf: true }
)

export const listOfStringsValidator = listValidator(stringValidator()) 

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

export const nonNegNumberValidator = numberValidatorBuilder({ lower: 0, upper: 100000000 })
export const numberValidator = numberValidatorBuilder({ lower: -100000000, upper: 100000000 })

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

    if (!isMobilePhone(phone)) {
      throw `Invalid phone number`
    }
    let escaped = escape_phone_number(phone)

    if (escaped.length < 10) throw new Error(`Phone number must be at least 10 digits`)

    escaped = escaped.startsWith('+') ? escaped
            : escaped.length === 10   ? '+1' + escaped // assume US country code for now
                                      : "+" + escaped 
    return escaped
  }, 
  { ...options, maxLength: 25, listOf: false }
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
  '_id', 'email', 'phone', 'userEmail', 'phoneNumber', 
  'fname', 'lname', 'journeys', 'tags', 'preference'
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
export const FORM_FIELD_VALIDATORS_BY_TYPE = {
  'string': stringValidator({ maxLength: 5000, emptyStringOk: true, errorMessage: "Response must not exceed 5000 characters" }),
  'number': numberValidator({ errorMessage: "Response must be a number" }),
  'email': emailValidator(),
  'phone': phoneValidator(),
  'file': (fileInfo: FileResponse | undefined, _=undefined, isOptional: boolean) => 
    (isOptional && (!fileInfo || object_is_empty(fileInfo))) 
      ? { type: 'file', secureName: null }
      : fileResponseValidator()(fileInfo),
  'signature': (sigInfo: SignatureResponse | undefined, _=undefined, isOptional: boolean) => 
    (isOptional && (!sigInfo || object_is_empty(sigInfo))) 
      ? { type: 'signature', signed: null }
      : signatureResponseValidator()(sigInfo),
  'multiple_choice': (choiceInfo: { indexes: [], otherText?: string }, fieldOptions: MultipleChoiceOptions, isOptional: boolean) => {
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
      if (is_whitespace(k)) {
        delete fields[k]
        continue
      }

      if (k.length > 32) throw new Error(`key ${k} is greater than 32 characters`)

      const val = fields[k]
      if (typeof val === 'string') {
        if (val.length > 512) fields[k] = val.substring(0, 512)
        continue
      } else if (typeof val === 'object') {
        try {
          if (val.type && typeof val.type === 'string') { // form responses can be stored as custom fields (form responses is simple array)
            FORM_FIELD_VALIDATORS_BY_TYPE[val.type as keyof typeof FORM_FIELD_VALIDATORS_BY_TYPE](val, undefined as never, undefined as never)
            continue
          }
          if (val.length && typeof val.length === 'number') { // array of strings is ok too, (inclusive of multiple-choice responses)
            if (val.find((s: any) => typeof s !== 'string') !== undefined) {
              throw new Error('List must contain only strings')
            }
            continue 
          }

          if (val.value === undefined) throw new Error(`value field is undefined for key ${k}`)
          if (JSON.stringify(val).length > 1024) throw new Error(`object value for key ${k} exceeds the maximum length of 1024 characters in string representation`)

          const escaped = { value: val.value } as Indexable // create new object to omit unrecognized fields
          escaped.title = val.title // optional
          escaped.description = val.description // optional
          fields[k] = escaped
        } catch(err) {
          throw new Error(`object value is invalid JSON for key ${k}`)
        }
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
export const journeyStatesValidator = listValidator(journeyStateValidator())

export const emailEncodingValidator = exactMatchValidator<EmailEncoding>(['', 'base64'])

export const indexableValidator = <V>(keyValidator: EscapeFunction<string | number>, valueValidator: EscapeFunction<V>): EscapeBuilder<{ [index: string | number]: V }> =>
  o => build_validator(
    v => {
      if (!is_object(v)) throw new Error("Expecting an object")

      const validated = {} as Indexable

      for (const k in v) {
        validated[keyValidator(k)] = valueValidator(v[k as keyof typeof v])
      }
    },
    { ...o, isObject: true, listOf: false }
  )

export const rejectionWithMessage: EscapeBuilder<undefined> = o => build_validator(
  v => { throw new Error(o?.errorMessage || 'This field is not valid') }, 
  { ...o, isOptional: true, listOf: false, }
)

export const numberToDateValidator = indexableValidator(numberValidator(), dateValidator())
export const idStringToDateValidator = indexableValidator(mongoIdStringValidator(), dateValidator())

// to ensure all topics in type have coverage at compile-time
const _CHAT_ROOM_TOPICS: { [K in ChatRoomTopic]: any } = {
  task: '',
  enduser: '',
}
export const CHAT_ROOM_TOPICS = Object.keys(_CHAT_ROOM_TOPICS) as ChatRoomTopic[]
export const chatRoomTopicValidator = exactMatchValidator<ChatRoomTopic>(CHAT_ROOM_TOPICS)

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

