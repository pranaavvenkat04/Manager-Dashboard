import React, { useState, memo, useEffect, useRef } from 'react';
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
  const [isMoving, setIsMoving] = useState(false);
  const previousIndex = useRef(index);
  
  // Track if the item's position changed
  useEffect(() => {
    if (previousIndex.current !== index) {
      // Position changed, trigger animation
      setIsMoving(true);
      
      // Reset after animation completes
      const timer = setTimeout(() => {
        setIsMoving(false);
        previousIndex.current = index;
      }, 300); // Match transition duration
      
      return () => clearTimeout(timer);
    }
  }, [index]);

  return (
    <div
      className="stop-item"
      style={{
        position: 'relative',
        backgroundColor: isMoving ? '#F3F9FF' : 'white',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        marginBottom: '8px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        boxShadow: isMoving ? '0px 2px 6px rgba(0, 0, 0, 0.2)' : '0px 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out, transform 0.3s ease-in-out',
        transform: isMoving ? 'translateX(4px)' : 'translateX(0)',
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
          flexShrink: 0,
          transition: 'all 0.3s ease-in-out',
          transform: isMoving ? 'scale(1.1)' : 'scale(1)'
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
                { borderWidth: 0, borderColor: 'transparent' },
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
            <View style={{ marginBottom: 2 }}>
              <ThemedText 
                style={[styles.stopName, { overflow: 'hidden' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {stop.name}
              </ThemedText>
            </View>
            <ThemedText 
              style={[styles.stopAddress, { overflow: 'hidden' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stop.address}
            </ThemedText>
            {stop.eta && (
              <View style={styles.etaContainer}>
                <ThemedText style={[styles.stopAddress, { fontWeight: '500' }]}>
                  ETA: {stop.eta}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {/* Up/Down Arrows + Delete button */}
      <View style={[styles.stopActions, { flexShrink: 0 }]}>
        <View style={styles.arrowButtons}>
          {/* Move up button */}
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              (index === 0 || isMoving) && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => {
              if (index > 0 && !isMoving) {
                // Set moving state to prevent rapid clicks
                setIsMoving(true);
                onMoveUp(stop.id);
              }
            }}
            disabled={index === 0 || isMoving}
            className="arrowButton"
          >
            <ChevronUp size={16} color={(index === 0 || isMoving) ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>

          {/* Move down button */}
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              (index === total - 1 || isMoving) && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => {
              if (index < total - 1 && !isMoving) {
                // Set moving state to prevent rapid clicks
                setIsMoving(true);
                onMoveDown(stop.id);
              }
            }}
            disabled={index === total - 1 || isMoving}
            className="arrowButton"
          >
            <ChevronDown size={16} color={(index === total - 1 || isMoving) ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>
        </View>
        
        {/* Delete button */}
        <TouchableOpacity 
          style={[styles.stopActionButton, styles.deleteStopButton]}
          onPress={() => onDelete(stop.id)}
          disabled={isMoving}
          className="deleteStopButton"
          aria-label="Delete stop"
        >
          <Trash2 size={16} color={isMoving ? "#F3A5A5" : "#EF4444"} />
        </TouchableOpacity>
      </View>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(StopItem);