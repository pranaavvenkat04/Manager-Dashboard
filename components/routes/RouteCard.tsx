import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, MapPin, Calendar, ChevronDown, ChevronUp, Edit } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { formatDate } from '@/utils/FirebaseUtils';
import { Theme } from '@/constants/Colors';

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

  // Get the route identifier from route_code field if available
  const getRouteIdentifier = () => {
    return route.route_code || route.route_key || route.routeCode || "";
  };

  return (
    <View style={styles.routeCard}>
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.routeIdBadge}>
            <ThemedText style={styles.routeIdText}>
              {getRouteIdentifier()}
            </ThemedText>
          </View>
          <ThemedText style={styles.routeName}>{route.name}</ThemedText>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onEdit(route)}
          >
            <Edit size={18} color={Theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.detailItem}>
            <Clock size={14} color={Theme.colors.text.secondary} />
            <ThemedText style={styles.detailText}>{route.start_time} - {route.end_time}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={14} color={Theme.colors.text.secondary} />
            <ThemedText style={styles.detailText}>{route.stops_count || route.stops || 0} stops</ThemedText>
          </View>
        </View>
        
        {/* Schedule summary - always visible */}
        {route.schedule && (
          <View style={styles.schedulePreview}>
            <View style={styles.scheduleItem}>
              <Calendar size={14} color={Theme.colors.primary} />
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
        
        <View style={styles.bottomSection}>
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
                <ChevronUp size={16} color={Theme.colors.primary} /> : 
                <ChevronDown size={16} color={Theme.colors.primary} />
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  routeCard: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeIdBadge: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIdText: {
    fontSize: 16,
    color: Theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  routeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
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
    color: Theme.colors.text.secondary,
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
    color: Theme.colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  exceptionsBadge: {
    backgroundColor: Theme.colors.warning + '20', // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  exceptionsBadgeText: {
    fontSize: 12,
    color: Theme.colors.warning,
    fontWeight: '500',
  },
  expandedDetails: {
    backgroundColor: Theme.colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  expandedSection: {
    marginBottom: 8,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
    marginBottom: 4,
  },
  effectiveDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  effectiveDateText: {
    fontSize: 13,
    color: Theme.colors.text.secondary,
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
    backgroundColor: Theme.colors.error + '20', // 20% opacity
  },
  specialServiceBadge: {
    backgroundColor: Theme.colors.info + '20', // 20% opacity
  },
  exceptionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
  },
  exceptionDate: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  driverLabel: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginRight: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.primary,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: Theme.colors.primary,
    marginRight: 4,
  },
  actionButton: {
    padding: 8,
  },
});

export default RouteCard;