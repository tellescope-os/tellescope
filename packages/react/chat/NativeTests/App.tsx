/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { useState } from 'react';
import {
   SafeAreaView,
   Text,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { GestureHandlerRootView } from "react-native-gesture-handler"
 
import { Flex } from "@tellescope/react-components/lib/esm/layout"
import { useSession, useEnduserSession, UserProvider, EnduserProvider, UserLogin, EnduserLogin, Logout } from "@tellescope/react-components/lib/esm/authentication"
import { useChats, useChatRooms } from "@tellescope/react-components/lib/esm/state"
import { 
  BottomNavigation,
  // Typography,
  SendIcon,
} from "@tellescope/react-components/lib/esm/mui"
import {
  WithTheme,
} from "@tellescope/react-components/lib/esm/theme"
import { UsersConversations, EndusersConversations, Messages, SendMessage } from "@tellescope/chat/lib/esm/chat"

const Stack = createStackNavigator();
 
const Routes = {
  Home: undefined,
  User: undefined,
  Enduser: undefined,
}
type ViewType = '' | 'user' | 'enduser'
const App = () => { 
  return (
    <WithTheme>
    <GestureHandlerRootView style={{ minHeight: '100%' }}>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Select User">
        <Stack.Screen name="Select User" component={Selector}/>
        <Stack.Screen name="User" component={UserAppRouter}/>
        <Stack.Screen name="Enduser" component={EnduserAppRouter}/>
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
    </WithTheme>
  );
};

const Selector = () => {
  const navigation = useNavigation<StackNavigationProp<typeof Routes>>()
  return (
    <SafeAreaView style={{ minHeight: '100%' }}>
      <Flex column flex={1}>
        <Flex flex={1} onClick={() => navigation.navigate('User')} style={{ backgroundColor: 'azure' }}> 
          <Text>User App</Text>
        </Flex>

        <Flex flex={1} onClick={() => navigation.navigate('Enduser')} style={{ backgroundColor: 'pink' }} > 
          <Text>Enduser App</Text>
        </Flex>
      </Flex>
    </SafeAreaView>
  )
}

const SelectEnduserConversation = () => {
  const session = useEnduserSession()
  const [, { update: updateRoom }] = useChatRooms('enduser')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [messages, { addElementForKey: addMessage }] = useChats(selectedRoom, 'enduser')

  if (selectedRoom) return (
    <Flex column flex={1}>
      <Flex flex={1}>
        <Messages
          messages={messages}
          chatUserId={session.userInfo.id}
        />
      </Flex>
      <Flex style={{ margin: 5 }}>
        <SendMessage session={session} roomId={selectedRoom}
          onNewMessage={m => { 
            addMessage(selectedRoom, m)
            updateRoom(selectedRoom, { recentMessage: m.message, recentSender: m.senderId ?? '' })
          }}
        /> 
      </Flex>
    </Flex>
  )

  return (
    <Flex flex={1}>
      <EndusersConversations 
        enduserId={session.userInfo.id}
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
      />
    </Flex>
  )
}

const EnduserApp = () => {
  const session = useEnduserSession()

  if (!session.authToken) return (
    <EnduserLogin/>
  )

  return (
    <BottomNavigation
      routes={[
        {
          key: 'chat',
          title: "Chat",
          icon: 'chat',
          Component: SelectEnduserConversation,
        },
        {
          key: 'logout',
          title: "Logout",
          icon: 'logout',
          Component: Logout,
        }
      ]} 
    />
  )
}
 
const EnduserAppRouter = () => {
  return (
    <EnduserProvider sessionOptions={{ host: "http://localhost:8080"}}>
      <Stack.Navigator initialRouteName="EnduserHome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="EnduserHome" component={EnduserApp} />
        <Stack.Screen name="EnduserChat" component={EnduserApp} />
      </Stack.Navigator>
    </EnduserProvider>
  )
}

const SelectUserConversation = () => {
  const session = useSession()
  const [, { update: updateRoom }] = useChatRooms('enduser')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [messages, { addElementForKey: addMessage }] = useChats(selectedRoom, 'enduser')

  if (selectedRoom) return (
    <Flex column flex={1}>
      <Flex>
        <Messages
          messages={messages}
          chatUserId={session.userInfo.id}
        />
      </Flex>
      <Flex style={{ marginRight: 5, marginLeft: 5 }}>
        <SendMessage session={session} roomId={selectedRoom}
          onNewMessage={m => { 
            addMessage(selectedRoom, m)
            updateRoom(selectedRoom, { recentMessage: m.message, recentSender: m.senderId ?? '' })
          }}
        /> 
      </Flex>
    </Flex>
  )

  return (
    <Flex flex={1}>
      <EndusersConversations 
        enduserId={session.userInfo.id}
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
      />
    </Flex>
  )
}

const UserApp = () => {
  const session = useSession()

  if (!session.authToken) return <UserLogin/>
  return (
    <BottomNavigation
      routes={[
        {
          key: 'chat',
          title: "Chat",
          icon: 'chat',
          Component: SelectUserConversation,
        },
        {
          key: 'logout',
          title: "Logout",
          icon: 'logout',
          Component: Logout,
        }
      ]} 
    />
  )
}
 
const UserAppRouter = () => {
  return (
    <UserProvider sessionOptions={{ host: "http://localhost:8080"}}>
      <Stack.Navigator initialRouteName="UserHome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="UserHome" component={UserApp} />
      </Stack.Navigator>
    </UserProvider>
  )
}

 
 export default App;
 