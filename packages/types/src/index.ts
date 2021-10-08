export const isStringArray = (a: any): a is string[] =>
  Array.isArray(a) && a.filter(s => typeof s === 'string').length === a.length 

export const isDate = (d: any): d is Date => 
  d && typeof d.getMonth === 'function'

export const isErrorCode = (c: any): c is ErrorCode => 
  [400, 401, 402, 403, 404, 405, 406, 407, 408, 409].includes(c)