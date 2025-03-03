import React, { ReactNode } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PersistentSidebar from './PersistentSidebar';
import { SchoolProvider } from './SchoolProvider';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <SchoolProvider>
      <View 
        style={[
          styles.container,
          // Apply safe area insets for iOS and mobile
          Platform.OS === 'web' ? {} : { paddingTop: insets.top }
        ]}
      >
        <PersistentSidebar>
          {children}
        </PersistentSidebar>
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