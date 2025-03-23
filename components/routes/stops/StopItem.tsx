import React, { useState, memo } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { StopItemProps } from '@/types/RouteTypes';
import styles from '@/styles/RouteModalStyles';

/**
 * Individual stop item component with edit functionality
 * Memoized to prevent unnecessary re-renders
 */
const StopItem = ({ 
  stop, 
  index,
  total,
  onEdit, 
  onDelete,
  onMoveUp,
  onMoveDown
}: StopItemProps) => {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="stop-item"
      style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        marginBottom: '8px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Stop number indicator */}
      <div 
        className="stop-number"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: '#3050ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
          flexShrink: 0
        }}
      >
        <span style={{
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          lineHeight: '1'
        }}>
          {index + 1}
        </span>
      </div>
      
      {/* Stop content */}
      <View style={[styles.stopContent, { flex: 1, overflow: 'hidden' }]}>
        {editing ? (
          <View style={styles.editStopForm}>
            <ThemedText style={styles.editStopTitle}>Edit Stop Name</ThemedText>
            <TextInput
              style={[
                styles.editStopInput,
                { borderWidth: 0, borderColor: 'transparent', outline: 'none' },
                stop.name ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={stop.name}
              onChangeText={(text) => onEdit(stop.id, 'name', text)}
              placeholder="Stop name"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
            
            {/* Display address as non-editable field */}
            <View style={styles.addressDisplayRow}>
              <ThemedText style={styles.addressDisplayLabel}>Address:</ThemedText>
              <ThemedText style={styles.addressDisplayText}>{stop.address}</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={styles.doneEditingButton}
              onPress={() => setEditing(false)}
              className="doneEditingButton"
            >
              <ThemedText style={styles.doneEditingText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.stopInfo, { overflow: 'hidden' }]}
            onPress={() => setEditing(true)}
          >
            <View style={styles.stopNameContainer}>
              <ThemedText 
                style={[styles.stopName, { overflow: 'hidden' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {stop.name}
              </ThemedText>
            </View>
            <ThemedText 
              style={[styles.stopAddress, { overflow: 'hidden', fontWeight: 'bold' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stop.address}
            </ThemedText>
            {stop.eta && (
              <ThemedText style={styles.stopEta}>ETA: {stop.eta}</ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {/* Up/Down Arrows + Delete button */}
      <View style={[styles.stopActions, { flexShrink: 0 }]}>
        <View style={styles.arrowButtons}>
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              index === 0 && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => index > 0 && onMoveUp(stop.id)}
            disabled={index === 0}
            className="arrowButton"
          >
            <ChevronUp size={16} color={index === 0 ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              index === total - 1 && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => index < total - 1 && onMoveDown(stop.id)}
            disabled={index === total - 1}
            className="arrowButton"
          >
            <ChevronDown size={16} color={index === total - 1 ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.stopActionButton, styles.deleteStopButton]}
          onPress={() => onDelete(stop.id)}
          className="deleteStopButton"
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(StopItem);