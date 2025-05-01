import { StyleSheet } from 'react-native';

// React Native styles for schedule components
const scheduleStyles = StyleSheet.create({
  // Container styles
  scheduleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Day selector styles
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  // Date picker container
  datePickerContainer: {
    marginBottom: 16,
  }
});

export default scheduleStyles;