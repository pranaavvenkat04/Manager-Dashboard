import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="routes" />
      <Stack.Screen name="users" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
