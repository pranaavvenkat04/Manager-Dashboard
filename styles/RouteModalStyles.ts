import { StyleSheet, Dimensions, Platform } from 'react-native';

// Get window dimensions for responsive sizing
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

// Platform specific style helper
export const webFocusReset = Platform.OS === 'web' ? {
  outlineWidth: 0,
  outlineColor: 'transparent',
  WebkitTapHighlightColor: 'rgba(0,0,0,0)',
} : {};

// Create optimized styles
const styles = StyleSheet.create({
  // Modal container styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'relative',
    zIndex: 1000,
  },
  modalView: {
    width: Platform.OS === 'web' ? Math.min(1100, windowWidth - 40) : windowWidth - 40,
    height: Platform.OS === 'web' ? Math.min(700, windowHeight - 80) : windowHeight - 80,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
    zIndex: 1000,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 6,
  },
  modalContent: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    position: 'relative',
  },
  
  // Column layout styles
  stopsColumn: {
    flex: 1,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: '#E5E7EB',
    maxWidth: Platform.OS === 'web' ? '40%' : '100%',
    position: 'relative',
    zIndex: 50,
    overflow: 'hidden',
    paddingRight: 16,
    paddingLeft: 16,
    boxSizing: 'border-box',
  },
  mapDetailsColumn: {
    flex: 1.5,
    padding: 16,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderLeftColor: '#E5E7EB',
  },
  
  // Section styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formInputContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    width: '100%',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  formInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
    boxSizing: 'border-box',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  
  // Day selection styles
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  dayButtonError: {
    borderColor: '#EF4444',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  dayButtonTextActive: {
    color: 'white',
  },

  // Time input styles
  timeInputContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    width: '100%',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
    boxSizing: 'border-box',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  timeIcon: {
    marginRight: 8,
  },
  
  // Map styles
  mapSection: {
    padding: 16,
  },
  mapContainer: {
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  
  // Route details section
  routeDetailsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  
  // Timing section styles
  timingSummary: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  timingDetails: {
    paddingLeft: 22,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timingLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 100,
  },
  timingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  useCalculatedButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calculatedButtonIcon: {
    marginRight: 4,
  },
  useCalculatedText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  
  // Stops section styles
  stopsSection: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    boxSizing: 'border-box',
    paddingRight: 0,
    paddingLeft: 0,
    paddingTop: 0,
    paddingBottom: 16,
  },
  stopsList: {
    marginTop: 8,
    position: 'relative',
    width: '100%',
    minHeight: 100,
    boxSizing: 'border-box',
  },
  stopCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  noStopsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  dragInstructions: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Error styles
  errorMessageBar: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    paddingRight: 4,
    borderRadius: 4,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorMessageContent: {
    flex: 1,
  },
  errorMessageText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  closeErrorButton: {
    padding: 4,
    borderRadius: 50,
  },
  requiredLabel: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderStyle: 'solid',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // Address search styles
  addressSearchContainer: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 20,
  },
  addressHelpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  searchBarContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
    marginBottom: 2,
    position: 'relative',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    position: 'relative',
    zIndex: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: '100%',
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  addressSearchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    padding: 4,
  },
  addressResultsScroll: {
    maxHeight: 200,
  },
  noResultsMessage: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Stop item styles
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stopItemActive: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dragHandle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dragLine: {
    width: 16,
    height: 2,
    backgroundColor: '#9CA3AF',
    marginVertical: 1,
    borderRadius: 1,
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3050ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3
  },
  stopNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  stopContent: {
    flex: 1,
    paddingVertical: 4,
    marginRight: 8,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  stopAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  deleteButton: {
    padding: 4,
  },
  emptyStops: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  emptyStopsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  
  // Stop editing form
  editStopForm: {
    flex: 1,
  },
  editStopTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  editStopInput: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    color: '#1F2937',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 8,
    height: 40,
    width: '100%',
    boxSizing: 'border-box',
    textAlignVertical: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressDisplayLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
    fontWeight: '500',
  },
  addressDisplayText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: 'bold',
    flex: 1,
  },
  doneEditingButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  doneEditingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Reordering controls
  arrowButtons: {
    flexDirection: 'column',
    marginRight: 8,
  },
  arrowButton: {
    padding: 8,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#E5E7EB',
  },
  stopActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  deleteStopButton: {
    marginLeft: 8,
  },
  
  // Skeleton loader styles
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#4361ee',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Driver dropdown styles
  selectContainer: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
    marginBottom: 2,
    position: 'relative',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Duration display
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4361ee',
  },
  
  // Exceptions styles
  exceptionsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  exceptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exceptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  addExceptionButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addExceptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  exceptionsList: {
    marginTop: 8,
  },
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exceptionDateContainer: {
    width: 100,
    marginRight: 8,
  },
  exceptionDate: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  exceptionReasonContainer: {
    flex: 1,
    marginRight: 8,
  },
  exceptionReasonInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    borderWidth: 0,
    padding: 6,
    fontSize: 12,
    color: '#1F2937',
  },
  deleteExceptionButton: {
    padding: 4,
  },
  noExceptions: {
    padding: 12,
    alignItems: 'center',
  },
  noExceptionsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default styles;