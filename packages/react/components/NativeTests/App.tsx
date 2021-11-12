/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  useColorScheme,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from "react-native-gesture-handler"

import { Flex, UserProvider, EnduserProvider } from "@tellescope/react-components/lib/layout"
import { useSession, useEnduserSession } from "@tellescope/react-components/lib/authentication"

const Stack = createStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? "#000000" : "#ffffff",
  };

  return (
    <GestureHandlerRootView>
    <NavigationContainer>
    <SafeAreaView style={backgroundStyle}>
      <Stack.Navigator initialRouteName="User">
        <Stack.Screen name="User" component={UserApp} />
        <Stack.Screen name="Enduser" component={EnduserApp} />
        {/* <Stack.Screen name="Logout" component={Logout} /> */}
      </Stack.Navigator>
    </SafeAreaView>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const UserApp = () => {
  return (
    <UserProvider>
      <Text>User</Text>
    </UserProvider>
  )
}

const EnduserApp = () => {
  return (
    <EnduserProvider>
      <Text>Enduser</Text>
    </EnduserProvider>
  )
}

export default App;
