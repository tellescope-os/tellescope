import "@tellescope/types"

export const BUSINESS_TYPE = "Business"
export const CREATOR_ONLY_ACCESS = 'creatorOnly'
export const DEFAULT_OPERATIONS: { [K in Operation]: { title?: string, description?: string, sideEffects?: [] }} = {
  create: {}, 
  createMany: {}, 
  update: {}, 
  read: {}, 
  readMany: {}, 
  delete: {}
}

export const ACCESS_ACTION_FOR_OPERATION: { [K in Operation]: AccessAction} = {
  create: 'create', 
  createMany: 'create',
  update: 'update', 
  read:   'read', 
  readMany: 'read', 
  delete: 'delete'
}

export const PLACEHOLDER_ID = "60398bb15da8abef87ef41f5"