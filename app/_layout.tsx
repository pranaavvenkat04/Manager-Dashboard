import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLayout from '@/components/AppLayout';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppLayout>
        <Stack
          screenOptions={{
            headerShown: false, // Hide default header as we'll have our own in the sidebar
            contentStyle: { backgroundColor: '#F8FAFC' },
          }}
        />
      </AppLayout>
    </SafeAreaProvider>
  );
}