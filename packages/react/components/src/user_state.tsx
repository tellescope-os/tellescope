import React, { useRef } from 'react'

import { Provider, useSelector, TypedUseSelectorHook, createSelectorHook } from 'react-redux'
import { configureStore, EnhancedStore, Action } from '@reduxjs/toolkit'

import {
  useSession,
} from "./index"

import {
  sharedConfig,
  createSliceForList,
  useListStateHook,
  // useMappedListStateHook,
  HookOptions,
  WithFetchContext,

  useChats as useChatsShared,
  useChatRooms as useChatRoomsShared,
  useCalendarEvents as useCalendarEventsShared,
  ChatRoomDisplayInfo,
  useChatRoomDisplayInfo as useChatRoomDisplayInfoShared,
  useEngagementEvents as useEngagementEventsShared,
  TellescopeStoreContext,
  // createSliceForMappedList,
} from "./state"

import {
  ChatMessage,
  ChatRoom,
  Enduser,
  Form,
  FormResponse,
  Meeting,
  Task,
  Template,
  Ticket,
  File,
  Note,
  CalendarEvent,
  EngagementEvent,
  Journey,
  EventAutomation,
  SequenceAutomation,
  User,
} from "@tellescope/types-client"

const endusersSlice = createSliceForList<Enduser, 'endusers'>('endusers')
const tasksSlice = createSliceForList<Task, 'tasks'>('tasks')
const ticketsSlice = createSliceForList<Ticket, 'tickets'>('tickets')
const meetingsSlice = createSliceForList<Meeting, 'meetings'>('meetings')
const filesSlice = createSliceForList<File, 'files'>('files')
const notesSlice = createSliceForList<Note, 'notes'>('notes')
const templatesSlice = createSliceForList<Template, 'templates'>('templates')
const formsSlice = createSliceForList<Form, 'forms'>('forms')
const formResponsesSlice = createSliceForList<FormResponse, 'form_response'>('form_response')
const journeysSlice = createSliceForList<Journey, 'journeys'>('journeys')
const usersSlice = createSliceForList<User, 'users'>('users')
const eventAutomationsSlice = createSliceForList<EventAutomation, 'event_automations'>('event_automations')
const sequenceAutomationsSlice = createSliceForList<SequenceAutomation, 'sequence_automations'>('sequence_automations')

export const userConfig = {
  reducer: { 
    endusers: endusersSlice.reducer,
    tasks: tasksSlice.reducer,
    tickets: ticketsSlice.reducer,
    meetings: meetingsSlice.reducer,
    files: filesSlice.reducer,
    notes: notesSlice.reducer,
    templates: templatesSlice.reducer,
    forms: formsSlice.reducer,
    form_responses: formResponsesSlice.reducer,
    journeys: journeysSlice.reducer,
    users: usersSlice.reducer,
    event_automations: eventAutomationsSlice.reducer,
    sequence_automations: sequenceAutomationsSlice.reducer,
    ...sharedConfig.reducer,
  }
}
const store = configureStore(userConfig)
type RootState = ReturnType<typeof store.getState>
export const useTypedSelector = createSelectorHook(TellescopeStoreContext) as any as TypedUseSelectorHook<RootState>

export const UserProvider = (props: { children: React.ReactNode }) => (
  <WithFetchContext>
  <Provider store={store} context={TellescopeStoreContext}>
    {props.children}
  </Provider>
  </WithFetchContext>
)

export const ExtendedUserProvider = <A,B extends Action<any>>(props: { children: React.ReactNode, store: EnhancedStore<A,B> }) => (
  <WithFetchContext>
  <Provider context={TellescopeStoreContext} store={props.store}>
    {props.children}
  </Provider>
  </WithFetchContext>
)

export const useEndusers = (options={} as HookOptions<Enduser>) => {
  const session = useSession()
  return useListStateHook(
    'endusers', 
    useTypedSelector(s => s.endusers), 
    session, 
    endusersSlice, 
    { 
      loadQuery: session.api.endusers.getSome,
      findOne: session.api.endusers.getOne,
      addOne: session.api.endusers.createOne,
      addSome: session.api.endusers.createSome,
      deleteOne: session.api.endusers.deleteOne,
      updateOne: session.api.endusers.updateOne,
     },
    {...options}
  )
}
export const useTasks = (options={} as HookOptions<Task>) => {
  const session = useSession()
  return useListStateHook(
    'tasks', useTypedSelector(s => s.tasks), session, tasksSlice, 
    { 
      loadQuery: session.api.tasks.getSome,
      findOne: session.api.tasks.getOne,
      addOne: session.api.tasks.createOne,
      addSome: session.api.tasks.createSome,
      deleteOne: session.api.tasks.deleteOne,
      updateOne: session.api.tasks.updateOne,
    }, 
    {...options}
  )
}
export const useTickets = (options={} as HookOptions<Ticket>) => {
  const session = useSession()
  return useListStateHook(
    'tickets', useTypedSelector(s => s.tickets), session, ticketsSlice, 
    { 
      loadQuery: session.api.tickets.getSome,
      findOne: session.api.tickets.getOne,
      addOne: session.api.tickets.createOne,
      addSome: session.api.tickets.createSome,
      deleteOne: session.api.tickets.deleteOne,
      updateOne: session.api.tickets.updateOne,
    }, 
    {...options}
  )
}
export const useMeetings = (options={} as HookOptions<Meeting>) => {
  const session = useSession()
  return useListStateHook(
    'meetings', useTypedSelector(s => s.meetings), session, meetingsSlice, 
    { 
      loadQuery: session.api.meetings.my_meetings,
      findOne: session.api.meetings.getOne,
      addOne: session.api.meetings.createOne,
      addSome: session.api.meetings.createSome,
      deleteOne: session.api.meetings.deleteOne,
      updateOne: session.api.meetings.updateOne,
    }, 
    {...options}
  )
}
export const useFiles = (options={} as HookOptions<File>) => {
  const session = useSession()
  return useListStateHook(
    'files', useTypedSelector(s => s.files), session, filesSlice, 
    { 
      loadQuery: session.api.files.getSome,
      findOne: session.api.files.getOne,
      deleteOne: session.api.files.deleteOne,
      updateOne: session.api.files.updateOne,
    }, 
    {...options}
  )
}
export const useJourneys = (options={} as HookOptions<Journey>) => {
  const session = useSession()
  return useListStateHook(
    'journeys', useTypedSelector(s => s.journeys), session, journeysSlice, 
    { 
      loadQuery: session.api.journeys.getSome,
      findOne: session.api.journeys.getOne,
      addOne: session.api.journeys.createOne,
      addSome: session.api.journeys.createSome,
      deleteOne: session.api.journeys.deleteOne,
      updateOne: session.api.journeys.updateOne,
    }, 
    {...options}
  )
}
export const useSequenceAutomations = (options={} as HookOptions<SequenceAutomation>) => {
  const session = useSession()
  return useListStateHook(
    'sequence_automations', useTypedSelector(s => s.sequence_automations), session, sequenceAutomationsSlice, 
    { 
      loadQuery: session.api.sequence_automations.getSome,
      findOne: session.api.sequence_automations.getOne,
      addOne: session.api.sequence_automations.createOne,
      addSome: session.api.sequence_automations.createSome,
      deleteOne: session.api.sequence_automations.deleteOne,
      updateOne: session.api.sequence_automations.updateOne,
    }, 
    {...options}
  )
}
export const useUsers = (options={} as HookOptions<User>) => {
  const session = useSession()
  return useListStateHook(
    'users', useTypedSelector(s => s.users), session, usersSlice, 
    { 
      loadQuery: session.api.users.getSome,
      findOne: session.api.users.getOne,
      addOne: session.api.users.createOne,
      addSome: session.api.users.createSome,
      deleteOne: session.api.users.deleteOne,
      updateOne: session.api.users.updateOne,
    }, 
    {...options}
  )
}
export const useEventAutomations = (options={} as HookOptions<EventAutomation>) => {
  const session = useSession()
  return useListStateHook(
    'event_automations', useTypedSelector(s => s.event_automations), session, eventAutomationsSlice, 
    { 
      loadQuery: session.api.event_automations.getSome,
      findOne: session.api.event_automations.getOne,
      addOne: session.api.event_automations.createOne,
      addSome: session.api.event_automations.createSome,
      deleteOne: session.api.event_automations.deleteOne,
      updateOne: session.api.event_automations.updateOne,
    }, 
    {...options}
  )
}
export const useNotes = (options={} as HookOptions<Note>) => {
  const session = useSession()
  return useListStateHook(
    'notes', useTypedSelector(s => s.notes), session, notesSlice, 
    { 
      loadQuery: session.api.notes.getSome,
      findOne: session.api.notes.getOne,
      addOne: session.api.notes.createOne,
      addSome: session.api.notes.createSome,
      deleteOne: session.api.notes.deleteOne,
      updateOne: session.api.notes.updateOne,
    }, 
    {...options}
  )
}
export const useTemplates = (options={} as HookOptions<Template>) => {
  const session = useSession()
  return useListStateHook(
    'templates', useTypedSelector(s => s.templates), session, templatesSlice, 
    { 
      loadQuery: session.api.templates.getSome,
      findOne: session.api.templates.getOne,
      addOne: session.api.templates.createOne,
      addSome: session.api.templates.createSome,
      deleteOne: session.api.templates.deleteOne,
      updateOne: session.api.templates.updateOne,
    }, 
    {...options}
  )
}
export const useForms = (options={} as HookOptions<Form>) => {
  const session = useSession()
  return useListStateHook(
    'forms', useTypedSelector(s => s.forms), session, formsSlice, 
    { 
      loadQuery: session.api.forms.getSome,
      findOne: session.api.forms.getOne,
      addOne: session.api.forms.createOne,
      addSome: session.api.forms.createSome,
      deleteOne: session.api.forms.deleteOne,
      updateOne: session.api.forms.updateOne,
    }, 
    {...options}
  )
}

export const useFormResponses = (options={} as HookOptions<FormResponse>) => {
  const session = useSession()
  return useListStateHook(
    'forms_responses', useTypedSelector(s => s.form_responses), session, formResponsesSlice, 
    { 
      loadQuery: session.api.form_responses.getSome,
      findOne: session.api.form_responses.getOne,
      addOne: session.api.form_responses.createOne,
      addSome: session.api.form_responses.createSome,
      deleteOne: session.api.form_responses.deleteOne,
      updateOne: session.api.form_responses.updateOne,
    }, 
    {
      ...options,
    }
  ) 
}

export const useChatRooms = (o={} as HookOptions<ChatRoom>) => useChatRoomsShared('user', o)
export const useChats = (roomId: string, o={} as HookOptions<ChatMessage>) => useChatsShared(roomId, 'user', o)
export const useChatRoomDisplayInfo = (roomId: string, o={} as HookOptions<ChatRoomDisplayInfo>) =>
               useChatRoomDisplayInfoShared(roomId, 'user', o)

export const useCalendarEvents = (o={} as HookOptions<CalendarEvent>) => useCalendarEventsShared('user', o)
export const useEngagementEvents = (o={} as HookOptions<EngagementEvent>) => useEngagementEventsShared('user', o)