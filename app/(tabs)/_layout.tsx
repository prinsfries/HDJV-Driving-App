import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/navigation/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UI } from '@/constants/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: UI.colors.white,
        tabBarInactiveTintColor: '#D7F2E5',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: UI.colors.green,
          borderTopWidth: 0,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
