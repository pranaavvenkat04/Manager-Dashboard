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

// CSS styles for web date picker (to be injected directly)
export const webDatepickerStyles = `
  .react-datepicker-wrapper {
    width: 100%;
  }
  .react-datepicker__input-container {
    width: 100%;
  }
  .react-datepicker {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    border-radius: 8px;
    border: 1px solid #E5E7EB;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .react-datepicker__header {
    background-color: #F3F4F6;
    border-bottom: 1px solid #E5E7EB;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  .react-datepicker__day--selected {
    background-color: #4361ee;
    border-radius: 0.3rem;
  }
  .react-datepicker__day--keyboard-selected {
    background-color: #93c5fd;
  }
  .react-datepicker__day:hover {
    background-color: #E5E7EB;
  }
  .datePickerInput {
    background-color: #F3F4F6;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    width: 100%;
    cursor: pointer;
    font-size: 14px;
    color: #4B5563;
  }
  .datePickerInput:hover {
    background-color: #E5E8EB;
  }
  .addExceptionButton {
    transition: all 0.2s ease;
  }
  .addExceptionButton:hover {
    background-color: #2341CE;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

export default scheduleStyles;