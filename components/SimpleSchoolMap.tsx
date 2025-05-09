import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { GOOGLE_MAPS_CONFIG } from '@/apiKeys';
import { School } from 'lucide-react';

// Get Google Maps API key from the config
const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_CONFIG.apiKey;

interface SimpleSchoolMapProps {
  schoolLocation: {
    lat: number;
    lng: number;
    name: string;
  };
  height?: number;
  width?: number;
  zoom?: number;
  showHeader?: boolean;
}

/**
 * A simple school map component that uses Google Maps embed API
 */
const SimpleSchoolMap: React.FC<SimpleSchoolMapProps> = ({
  schoolLocation,
  height = 400,
  width,
  zoom = 15,
  showHeader = false
}) => {
  // Check if location is valid (not at 0,0 and not undefined)
  const isValidLocation = 
    schoolLocation && 
    typeof schoolLocation.lat === 'number' &&
    typeof schoolLocation.lng === 'number' &&
    !isNaN(schoolLocation.lat) &&
    !isNaN(schoolLocation.lng) &&
    (schoolLocation.lat !== 0 || schoolLocation.lng !== 0); // Allow one coordinate to be 0, but not both

  // Generate Google Maps embed URL
  const getGoogleMapsEmbedUrl = () => {
    if (!isValidLocation) return '';
    
    // Google Maps Embed API URL
    const baseUrl = 'https://www.google.com/maps/embed/v1/place';
    
    // Format coordinates for the query
    const coordinates = `${schoolLocation.lat},${schoolLocation.lng}`;
    const query = encodeURIComponent(`${schoolLocation.name}`);
    
    return `${baseUrl}?key=${GOOGLE_MAPS_API_KEY}&q=${coordinates}&zoom=${zoom}&center=${coordinates}`;
  };
  
  // Create container style with dynamic height and width
  const containerStyle: ViewStyle = {
    ...styles.container,
    height,
    ...(width !== undefined ? { width } : {})
  };
  
  // Create a clickable link to open Google Maps
  const getGoogleMapsLink = () => {
    return `https://www.google.com/maps/search/?api=1&query=${schoolLocation.lat},${schoolLocation.lng}`;
  };
  
  return (
    <View style={containerStyle}>
      {showHeader && (
        <View style={styles.header}>
          <School size={16} color={Theme.colors.primary} style={styles.icon} />
          <ThemedText style={styles.title}>{schoolLocation.name}</ThemedText>
        </View>
      )}
      
      <View style={[styles.mapContainer, !showHeader && styles.noHeaderMap]}>
        {!isValidLocation ? (
          <View style={styles.unsupportedContainer}>
            <School size={32} color={Theme.colors.text.secondary} />
            <ThemedText style={[styles.unsupportedText, { marginTop: 16 }]}>
              School location coordinates not available
            </ThemedText>
            <ThemedText style={[styles.unsupportedText, { marginTop: 8, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }]}>
              Please make sure latitude and longitude are set in the school record as numbers.
            </ThemedText>
          </View>
        ) : Platform.OS === 'web' ? (
          <View style={styles.embedMapContainer}>
            {/* Google Maps Embed iframe */}
            <iframe
              width="100%"
              height="100%"
              style={{
                border: 0,
                borderRadius: showHeader ? '0' : '8px'
              }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={getGoogleMapsEmbedUrl()}
            ></iframe>
          </View>
        ) : (
          <View style={styles.unsupportedContainer}>
            <ThemedText style={styles.unsupportedText}>
              Maps are only supported on web platform
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Theme.colors.background.secondary,
    width: '100%'
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  noHeaderMap: {
    borderRadius: 8,
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsupportedText: {
    color: Theme.colors.text.secondary,
  },
  embedMapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  staticMapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  }
});

export default SimpleSchoolMap; 