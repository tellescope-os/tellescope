import { ObjectId } from "bson"
export type Indexable<T=any> = { [index: string]: T }

export const first_letter_capitalized = (s='') => s.charAt(0).toUpperCase() + s.slice(1)
export const first_letter_lowercase = (s='') => s.charAt(0).toUpperCase() + s.slice(1)

export const object_is_empty = (o : object) => Object.keys(o).length === 0 && o.constructor === Object
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

export const user_display_name = (user?: { fname?: string, lname?: string, email?: string, phone?: string, id: string }) => {
  if (!user) return ''
  const { fname, lname, email, phone, id } = user

  if (fname && lname) return `${fname} ${lname}`
  if (fname) return fname
  if (email) return email
  if (phone) return phone

  return `User ${id}`
}

export const defined_fields = <T extends {}>(o: T): Partial<T> => {
  const filtered = {} as Partial<T>
  for (const field in o) {
    if (o[field] !== undefined) filtered[field] = o[field]
  }
  return filtered
}