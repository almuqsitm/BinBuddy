import { Tabs, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Green.primary,
        tabBarInactiveTintColor: '#888',
        tabBarButton: HapticTab,
        headerShown: true,
        headerStyle: { backgroundColor: Green.primary },
        headerTintColor: '#fff',
        headerTitle: user
          ? `${user.first_name} ${user.last_name} · ${user.role}`
          : 'BinBuddy',
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Log out">
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutBtn:  { marginRight: 16 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
