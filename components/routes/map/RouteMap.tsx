import React, { memo } from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { RouteMapProps } from '@/types/RouteTypes';
import { formatDuration } from '@/utils/TimeUtils';
import styles from '@/styles/RouteModalStyles';

/**
 * Route map component that displays the route on a map
 * In a real implementation, this would use Google Maps or a similar mapping service
 * Currently displays a placeholder
 */
const RouteMap = ({ stops, estimatedDuration }: RouteMapProps) => {
  return (
    <View style={styles.mapSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Route Map</ThemedText>
        {estimatedDuration > 0 && (
          <ThemedText style={styles.durationText}>
            Est. Duration: {formatDuration(estimatedDuration)}
          </ThemedText>
        )}
      </View>
      
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <MapPin size={32} color="#4361ee" />
          <ThemedText style={styles.mapPlaceholderText}>
            {stops.length > 0 
              ? `Route with ${stops.length} stop${stops.length !== 1 ? 's' : ''}`
              : 'Map will be displayed here'
            }
          </ThemedText>
          <ThemedText style={styles.mapPlaceholderSubtext}>
            {stops.length > 0 
              ? 'In a real implementation, a map would be shown here' 
              : 'Add stops to visualize the route'
            }
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(RouteMap);