import React from 'react';
import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // We're using our own sidebar header
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    />
  );
}