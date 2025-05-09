import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { Theme } from '@/constants/Colors';

export default function TabLayout() {
  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: '#F8FAFC' },
    animation: 'fade' as const,
    animationDuration: 150,
  }), []);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="routes" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="users" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="school-map" />
    </Stack>
  );
}