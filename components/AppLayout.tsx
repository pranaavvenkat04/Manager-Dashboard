import React, { ReactNode } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';

import PersistentSidebar from './PersistentSidebar';
import { SchoolProvider } from './SchoolProvider';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  
  // Determine if we should hide the sidebar based on the current route
  const currentRoute = segments[0] || '';
  const hideSidebar = currentRoute === 'login' || 
                      currentRoute === 'forgot-password' || 
                      currentRoute === 'select-school';

  return (
    <SchoolProvider>
      <View 
        style={[
          styles.container,
          // Apply safe area insets for iOS and mobile
          Platform.OS !== 'web' ? { paddingTop: insets.top } : {}
        ]}
      >
        {hideSidebar ? (
          // Render without sidebar for login/auth screens
          children
        ) : (
          // Render with sidebar for app screens
          <PersistentSidebar>
            {children}
          </PersistentSidebar>
        )}
      </View>
    </SchoolProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});