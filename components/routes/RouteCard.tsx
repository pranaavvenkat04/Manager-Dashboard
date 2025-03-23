import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, MapPin, Calendar, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { formatDate } from '@/utils/FirebaseUtils';

// Define props for RouteCard component
interface RouteCardProps {
  route: any;
  drivers: any[];
  onActionMenu: (route: any) => void;
  activeRouteId: string | null;
  actionMenuVisible: boolean;
  onEdit: (route: any) => void;
  onDelete: (route: any) => void;
}

/**
 * RouteCard component displays a route with its schedule information
 */
const RouteCard = ({
  route,
  drivers,
  onActionMenu,
  activeRouteId,
  actionMenuVisible,
  onEdit,
  onDelete
}: RouteCardProps) => {
  const [expanded, setExpanded] = useState(false);

  // Get driver name by ID
  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unassigned';
  };

  // Format operating days for display
  const formatOperatingDays = (days: number[]) => {
    if (!days || days.length === 0) return 'No operating days set';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Handle special cases
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.includes(1) && days.includes(2) && 
        days.includes(3) && days.includes(4) && days.includes(5)) {
      return 'Weekdays (Mon-Fri)';
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return 'Weekends (Sat-Sun)';
    }
    
    // Sort days in order of the week
    const sortedDays = [...days].sort((a, b) => a - b);
    return sortedDays.map(day => dayNames[day]).join(', ');
  };

  // Count upcoming exceptions
  const getUpcomingExceptions = () => {
    if (!route.schedule || !route.schedule.exceptions || route.schedule.exceptions.length === 0) {
      return 0;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return route.schedule.exceptions.filter((exc: any) => {
      const excDate = new Date(exc.date);
      excDate.setHours(0, 0, 0, 0);
      return excDate >= today;
    }).length;
  };

  return (
    <View style={styles.routeCard}>
      <View style={styles.routeInfo}>
        <View style={styles.routeHeader}>
          <View style={styles.routeIdentifier}>
            <ThemedText style={styles.routeKey}>{route.route_key}</ThemedText>
          </View>
          <ThemedText style={styles.routeName}>{route.name}</ThemedText>
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.detailItem}>
            <Clock size={14} color="#6B7280" />
            <ThemedText style={styles.detailText}>{route.start_time} - {route.end_time}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={14} color="#6B7280" />
            <ThemedText style={styles.detailText}>{route.stops_count} stops</ThemedText>
          </View>
        </View>
        
        {/* Schedule summary - always visible */}
        {route.schedule && (
          <View style={styles.schedulePreview}>
            <View style={styles.scheduleItem}>
              <Calendar size={14} color="#4361ee" />
              <ThemedText style={styles.scheduleText}>
                {formatOperatingDays(route.schedule.operatingDays || [])}
              </ThemedText>
            </View>
            {getUpcomingExceptions() > 0 && (
              <View style={styles.exceptionsBadge}>
                <ThemedText style={styles.exceptionsBadgeText}>
                  {getUpcomingExceptions()} upcoming exception{getUpcomingExceptions() !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
          </View>
        )}
        
        {/* Expandable schedule details */}
        {expanded && route.schedule && (
          <View style={styles.expandedDetails}>
            <View style={styles.expandedSection}>
              <ThemedText style={styles.expandedSectionTitle}>Effective Dates</ThemedText>
              <View style={styles.effectiveDates}>
                <ThemedText style={styles.effectiveDateText}>
                  From: {formatDate(route.schedule.effectiveDates.startDate)}
                </ThemedText>
                {route.schedule.effectiveDates.endDate && (
                  <ThemedText style={styles.effectiveDateText}>
                    To: {formatDate(route.schedule.effectiveDates.endDate)}
                  </ThemedText>
                )}
              </View>
            </View>
            
            {route.schedule.exceptions && route.schedule.exceptions.length > 0 && (
              <View style={styles.expandedSection}>
                <ThemedText style={styles.expandedSectionTitle}>Exceptions</ThemedText>
                <View style={styles.exceptionsList}>
                  {route.schedule.exceptions.map((exception: any, index: number) => (
                    <View key={index} style={styles.exceptionItem}>
                      <View style={[
                        styles.exceptionBadge,
                        exception.type === 'no_service' ? styles.noServiceBadge : styles.specialServiceBadge
                      ]}>
                        <ThemedText style={styles.exceptionBadgeText}>
                          {exception.type === 'no_service' ? 'No Service' : 'Special Service'}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.exceptionDate}>
                        {formatDate(exception.date)}
                        {exception.reason ? ` - ${exception.reason}` : ''}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.driverSection}>
          <ThemedText style={styles.driverLabel}>Driver:</ThemedText>
          <ThemedText style={styles.driverName}>
            {getDriverName(route.assigned_driver_id)}
          </ThemedText>
        </View>
        
        {/* Expand/Collapse button */}
        {route.schedule && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <ThemedText style={styles.expandButtonText}>
              {expanded ? 'Hide schedule details' : 'View schedule details'}
            </ThemedText>
            {expanded ? 
              <ChevronUp size={16} color="#4361ee" /> : 
              <ChevronDown size={16} color="#4361ee" />
            }
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onActionMenu(route)}
        >
          <MoreVertical size={20} color="#6B7280" />
        </TouchableOpacity>
        
        {/* Action Menu - displayed inline instead of absolutely positioned */}
        {actionMenuVisible && activeRouteId === route.id && (
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionMenuItem} 
              onPress={() => onEdit(route)}
            >
              <ThemedText style={styles.actionMenuText}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionMenuItem} 
              onPress={() => onDelete(route)}
            >
              <ThemedText style={[styles.actionMenuText, styles.deleteText]}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  routeCard: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  routeInfo: {
    flex: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeIdentifier: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  routeKey: {
    fontWeight: '600',
    fontSize: 14,
    color: '#4F46E5',
  },
  routeName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
  },
  routeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  schedulePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scheduleText: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '500',
    marginLeft: 4,
  },
  exceptionsBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  exceptionsBadgeText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  expandedDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandedSection: {
    marginBottom: 8,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  effectiveDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  effectiveDateText: {
    fontSize: 13,
    color: '#4B5563',
    marginRight: 12,
  },
  exceptionsList: {
    marginTop: 4,
  },
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exceptionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  noServiceBadge: {
    backgroundColor: '#FEE2E2',
  },
  specialServiceBadge: {
    backgroundColor: '#DBEAFE',
  },
  exceptionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1F2937',
  },
  exceptionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  driverLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#4361ee',
    marginRight: 4,
  },
  actionContainer: {
    position: 'relative',
  },
  actionButton: {
    padding: 8,
  },
  actionMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: 150,
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  actionMenuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  deleteText: {
    color: '#EF4444',
  },
});

export default RouteCard;