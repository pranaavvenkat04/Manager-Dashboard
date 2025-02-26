import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function SettingsScreen() {
  return (
    <View style={styles.mainContent}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerBrand}>BusTrak</ThemedText>
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
        </View>
        <View style={styles.headerRight} />
      </View>
      
      {/* Content */}
      <ThemedView style={styles.container}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText style={styles.description}>
          Settings page content will go here. You can customize appearance, notifications, 
          and other preferences from this screen.
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    height: 70,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // gray-200
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between', // Space between elements
  },
  headerBrand: {
    fontWeight: 'bold',
    color: '#4361ee', // Blue
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1, // This balances the header for centering
  },
  headerTitle: {
    fontWeight: 'normal',
    color: '#6B7280', // Darker gray for better visibility
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  description: {
    marginTop: 20,
    textAlign: 'center',
    maxWidth: 400,
  }
});