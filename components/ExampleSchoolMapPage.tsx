import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import SchoolMap from '@/components/SchoolMap';

/**
 * Example page that demonstrates the SchoolMap component
 */
const ExampleSchoolMapPage = () => {
  // You can replace this with your actual school coordinates
  const schoolLocation = {
    lat: 40.7128, // Replace with your school's latitude
    lng: -74.0060, // Replace with your school's longitude
    name: 'NYIT' // Replace with your school's name
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>School Location</ThemedText>
        <ThemedText style={styles.description}>
          This map shows the location of our school. Click on the marker for more details.
        </ThemedText>
        
        {/* School Map Component with fixed dimensions to ensure it renders properly */}
        <View style={styles.mapContainer}>
          <SchoolMap 
            schoolLocation={schoolLocation} 
            height={400}
          />
        </View>
        
        <ThemedText style={styles.footer}>
          You can use the + and - buttons to zoom in and out.
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  mapContainer: {
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

export default ExampleSchoolMapPage; 