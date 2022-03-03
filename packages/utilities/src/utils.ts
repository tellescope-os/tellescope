import { ObjectId } from "bson"
import { UserActivityInfo, UserActivityStatus } from "@tellescope/types-models"
export type Indexable<T=any> = { [index: string]: T }

export const first_letter_capitalized = (s='') => s.charAt(0).toUpperCase() + s.slice(1)
export const first_letter_lowercase = (s='') => s.charAt(0).toUpperCase() + s.slice(1)

export const object_is_empty = (o : object) => Object.keys(o).length === 0 && o.constructor === Object

export const is_truthy = (f?: any) => !!f
export const is_defined = (f?: any) => f !== undefined
export const filter_object = (o={} as Indexable, validator=is_defined) => {
  const newObject = {} as Indexable
  for (const f in o) {
    const value = o[f]
    if (validator(value))
      newObject[f] = value  
  } 
  
  return newObject
}
export const is_object = (obj: any): obj is Indexable => typeof obj === "object" && obj !== null

// fields that are defined and match by equality
export const matching_fields = (fields: string[], o1: Indexable, o2: Indexable) => {
  const matches = {} as Indexable
  for (const k of fields) {
    if (o1[k] && o1[k] === o2[k]) { // may need deeper equality check for objects
      matches[k] = o1[k]
    }
  }
  return matches
}

const WHITE_SPACE_EXP = /^\s*$/
export const is_whitespace = (s='') => WHITE_SPACE_EXP.test(s)

export const url_safe_path = (p='' as string | string) => p.replace(/_/g, '-')

export const to_object_id = (s='') => new ObjectId(s)

export const objects_equivalent = (o1?: Indexable, o2?: Indexable) => {
  if (o1 === null || o2 === null) return o1 === o2 // null is base case for typeof === object
  if (typeof o1 !== "object" || typeof o2 !== 'object') return o1 === o2 // base case  

  const k1 = Object.keys(o1), k2 = Object.keys(o2);
  for (const k of k1) { // keys must be equal sets
    if (!k2.includes(k)) return false
  }
  for (const k of k2) { // keys must be equal sets
    if (!k1.includes(k)) return false
  }
  
  for (const k of k1) { // recurse in case 
    if (!objects_equivalent(o1[k], o2[k])) {
      return false
    }
  }

  return true
}

export const user_display_name = (user?: { fname?: string, lname?: string, email?: string, phone?: string, id?: string }) => {
  if (!user) return ''
  const { fname, lname, email, phone, id } = user

  if (fname && lname) return `${fname} ${lname}`
  if (fname) return fname
  if (email) return email
  if (phone) return phone
  if (id) return `User ${id}`

  return ''
}

export interface ActivityOptions {
  activeThresholdMS?: number, 
  inactiveThresholdMS?: number 
}
export const user_is_active = (user?: UserActivityInfo, options?: ActivityOptions): UserActivityStatus | null => {
  if (!user) return null 

  const activeThresholdMS = options?.activeThresholdMS || 300000 // 5 minutes
  const inactiveThresholdMS = options?.inactiveThresholdMS || 1500000 // 15 minutes
  if (activeThresholdMS < 0) throw new Error('activeThresholdMS must be positive')
  if (inactiveThresholdMS < 0) throw new Error('inactiveThresholdMS must be positive')

  const lastLogout = new Date(user.lastLogout).getTime()
  const lastActive = new Date(user.lastActive).getTime()

  if (lastLogout > lastActive) return 'Unavailable'
  if (Date.now() - lastActive < activeThresholdMS) return 'Active'
  if (Date.now() - lastActive < inactiveThresholdMS) return 'Away'

  return 'Unavailable'
}

export const defined_fields = <T extends {}>(o: T): Partial<T> => {
  const filtered = {} as Partial<T>
  for (const field in o) {
    if (o[field] !== undefined) filtered[field] = o[field]
  }
  return filtered
}

export const truncate_string = (s='', options={} as { showEllipsis?: boolean, length?: number }) => {
  if (typeof options.length === 'number' && options.length < 0) throw new Error("Length must be positive")

  const showEllipsis = options.showEllipsis ?? true
  const length = options.length ?? 25

  return (
    s.substring(0, length) + 
      (showEllipsis && s.length > length ? '...' : '')
  )
}

export const map_object = <T extends object, R>(object: T, handler: (key: keyof T, value: T[typeof key]) => R): R[] => (
  Object.keys(object).map((key) => handler(key as keyof typeof object, object[key as keyof typeof object]))
)

const [ LINK_START, LINK_END, TEXT_START, TEXT_END ] = [0, 1, 2, 3]
export const parse_link_template = (text: string, startFrom?: number) => {
  let start = 0
  let state = LINK_START
  let linkChars = []
  const linkTextChars = []
  
  for (let i = startFrom || 0; i < text.length; i++) {
    const char = text[i]
    if (state === LINK_START) {
      if (char === '{') {
        start = i;
        state = LINK_END
      }
    } 
    else if (state === LINK_END) {
      if (char === '}') {
        state = TEXT_START
      } else {
        linkChars.push(char)
      }
    } 
    else if (state === TEXT_START) {
      if (char === '[') {
        state = TEXT_END
      }
      else if (!is_whitespace(char)) { // only allow whitespace between {link} and [linkText]
        start = 0; linkChars = []; state = LINK_START; // start seeking new link
      }
    }
    else {
      if (char === ']') {
        return {
          url: linkChars.join(''),
          displayName: linkTextChars.join('')
        }
      } else {
        linkTextChars.push(char)
      }
    } 
  }

  return null
}

const findTemplateElement = (text: string) => {
  const startIndex = text.indexOf('{{')
  if (startIndex === -1) return undefined

  const endIndex = text.indexOf('}}')
  if (endIndex === -1) return undefined

  // omits start '{{' with +2, endIndex is not inclusive, so it omits last '}}' 
  return text.substring(startIndex + 2, endIndex) 
}

export const getTemplatedData = (text: string) => {
  const value = findTemplateElement(text)

  const badValue = (reason='') => { throw Error(`Unrecognized template field: ${value}${reason && ` (${reason})`}`) }

  if (value === undefined) return badValue()
  if (value.startsWith('forms')) {
    const [_, formId, field] = value.split('.')
    
    if (field.startsWith('link')) { return { id: formId, displayName: field.substring(5) } }
    return badValue()
  }
  if (value.startsWith('files')) {
    const [_, fileId, field] = value.split('.')

    if (field.startsWith('link')) { return { id: fileId, displayName: field.substring(5) } }
    throw Error(`Unrecognized template field: ${value}`)
  } 
  
  return badValue()
}

type ToTemplateString <T> = (data: T) => string
export const build_link_string: ToTemplateString<{ url: string, displayName: string }> = d => `{${d.url}}[${d.displayName}]`
export const build_form_link_string: ToTemplateString<{ id: string, displayName: string }> = d => `{{forms.${d.id}.link:${d.displayName}}}`
export const build_file_link_string: ToTemplateString<{ id: string, displayName: string }> = d => `{{files.${d.id}.link:${d.displayName}}}`

export const to_absolute_url = (link : string) => link.startsWith('http') ? link : '//' + link // ensure absolute url 

export const throwFunction = (s: string) => { throw s }