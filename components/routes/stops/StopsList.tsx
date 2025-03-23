import React, { memo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StopItem from './StopItem';
import { StopsListProps } from '@/types/RouteTypes';
import styles from '@/styles/RouteModalStyles';

/**
 * Component for displaying and managing the list of stops
 */
const StopsList = ({ 
  stops, 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  fieldErrors 
}: StopsListProps) => {
  
  if (stops.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        backgroundColor: '#F3F4F6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        boxSizing: 'border-box',
        border: fieldErrors.stops ? '1px solid #EF4444' : '1px solid #E5E7EB'
      }} className="stops-container search-bar-width">
        <div style={{
          textAlign: 'center',
          width: '100%'
        }}>
          <ThemedText style={[styles.noStopsText, fieldErrors.stops && { color: '#EF4444' }]}>
            {fieldErrors.stops ? fieldErrors.stops : 'No stops added yet. Use the search above to add stops.'}
          </ThemedText>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      width: '100%',
      position: 'relative',
      backgroundColor: '#F3F4F6',
      borderRadius: '8px',
      padding: '6px',
      height: '400px',
      boxSizing: 'border-box',
      border: fieldErrors.stops ? '1px solid #EF4444' : '1px solid #E5E7EB',
      overflowY: 'auto'
    }} className="stops-container search-bar-width">
      <div style={{
        backgroundColor: '#F3F4F6',
        padding: '8px 10px',
        textAlign: 'left',
        borderBottom: '1px solid #E5E7EB',
        marginBottom: '8px'
      }}>
        <ThemedText style={styles.dragInstructions}>
          Use arrows to reorder stops
        </ThemedText>
        {fieldErrors.stops && (
          <ThemedText style={[styles.errorText, { marginTop: 4 }]}>
            {fieldErrors.stops}
          </ThemedText>
        )}
      </div>
      
      {stops.map((stop, index) => (
        <StopItem
          key={stop.id}
          stop={stop}
          index={index}
          total={stops.length}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(StopsList);