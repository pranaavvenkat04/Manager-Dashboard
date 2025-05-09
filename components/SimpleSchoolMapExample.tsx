import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import SimpleSchoolMap from '@/components/SimpleSchoolMap';

/**
 * Example page that demonstrates the SimpleSchoolMap component
 */
const SimpleSchoolMapExample = () => {
  // You can replace this with your actual school coordinates
  const schoolLocation = {
    lat: 40.7128, // Replace with your school's latitude
    lng: -74.0060, // Replace with your school's longitude
    name: 'Example School Location' // Replace with your school's name
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>School Location</ThemedText>
        <ThemedText style={styles.description}>
          This map shows the location of our school. It uses an embedded Google Maps iframe
          which is much more reliable than the JavaScript API.
        </ThemedText>
        
        {/* School Map Component */}
        <View style={styles.mapWrapper}>
          <SimpleSchoolMap 
            schoolLocation={schoolLocation} 
            height={400}
            zoom={15}
          />
        </View>
        
        <ThemedText style={styles.footer}>
          This map is powered by Google Maps Embed API.
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    marginBottom: 16,
  },
  mapWrapper: {
    width: '100%',
    height: 400,
    marginBottom: 16,
  },
  footer: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.8,
  }
});

export default SimpleSchoolMapExample; 