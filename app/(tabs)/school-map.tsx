import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import SimpleSchoolMap from '@/components/SimpleSchoolMap';
import { useSchoolContext } from '@/components/SchoolProvider';
import { School, Save, Search, MapPin, Building, Hash } from 'lucide-react';
import { Theme } from '@/constants/Colors';
import { AuthContext } from '@/app/_layout';
import { db, Timestamp } from '@/utils/firebase'; 
import { doc, updateDoc } from 'firebase/firestore';
import { GOOGLE_MAPS_CONFIG } from '@/apiKeys';

// Get Google Maps API key from config
const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_CONFIG.apiKey;

export default function SchoolInformationScreen() {
  const { schoolName, schoolCode } = useSchoolContext();
  const { schoolData } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolLocation, setSchoolLocation] = useState({
    lat: 40.7128, // Default coordinates (NYC)
    lng: -74.0060,
    name: schoolName || 'School Location'
  });
  const [error, setError] = useState<string | null>(null);
  
  // State for school information form fields
  const [schoolNameField, setSchoolNameField] = useState(schoolName || '');
  const [schoolAddressField, setSchoolAddressField] = useState('');
  const [schoolCodeField, setSchoolCodeField] = useState(schoolCode || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Hidden latitude and longitude state
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Add state for address search
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Get school data from Auth Context on component mount
  useEffect(() => {
    try {
      console.log('Retrieving school location data...');
      console.log('School data available:', schoolData ? 'Yes' : 'No');
      
      if (schoolData) {
        // Log all available keys to help troubleshoot
        console.log('SchoolData keys:', Object.keys(schoolData));
        
        // Since the schoolData contains schoolData.school, check that object first
        if (schoolData.school) {
          console.log('School object keys:', Object.keys(schoolData.school));
          console.log('School ID:', schoolData.school.id);
          
          // Access the latitude and longitude directly from the school object
          const schoolObj = schoolData.school;
          console.log('School latitude:', schoolObj.latitude);
          console.log('School longitude:', schoolObj.longitude);
          
          // Check if latitude and longitude exist as direct properties on the school object
          if (typeof schoolObj.latitude === 'number' && typeof schoolObj.longitude === 'number') {
            console.log('Found latitude/longitude directly on school object');
            setSchoolLocation({
              lat: schoolObj.latitude,
              lng: schoolObj.longitude,
              name: schoolObj.name || schoolName || 'School Location'
            });
            setError(null);
            setIsLoading(false);
            return;
          }
          
          // If we couldn't find direct properties, check if they're in schoolData.schoolData.school
          if (schoolData.schoolData && schoolData.schoolData.school) {
            const detailedSchool = schoolData.schoolData.school;
            console.log('Detailed school object:', detailedSchool);
            
            if (typeof detailedSchool.latitude === 'number' && typeof detailedSchool.longitude === 'number') {
              console.log('Found latitude/longitude in schoolData.schoolData.school');
              setSchoolLocation({
                lat: detailedSchool.latitude,
                lng: detailedSchool.longitude,
                name: detailedSchool.name || schoolName || 'School Location'
              });
              setError(null);
              setIsLoading(false);
              return;
            }
          }
          
          // Try to find location in any part of the school data as a fallback
          const findLocationInObject = (obj: any): {lat: number, lng: number} | null => {
            if (!obj || typeof obj !== 'object') return null;
            
            // Direct check for latitude/longitude properties
            if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
              return { lat: obj.latitude, lng: obj.longitude };
            }
            
            // Check for lat/lng properties
            if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
              return { lat: obj.lat, lng: obj.lng };
            }
            
            // Check for location object with lat/lng properties
            if (obj.location && typeof obj.location === 'object') {
              if (typeof obj.location.latitude === 'number' && typeof obj.location.longitude === 'number') {
                return { lat: obj.location.latitude, lng: obj.location.longitude };
              }
              if (typeof obj.location.lat === 'number' && typeof obj.location.lng === 'number') {
                return { lat: obj.location.lat, lng: obj.location.lng };
              }
            }
            
            return null;
          };
          
          // Search in schoolData
          let location = findLocationInObject(schoolData);
          if (!location) location = findLocationInObject(schoolData.school);
          if (!location && schoolData.schoolData) location = findLocationInObject(schoolData.schoolData);
          if (!location && schoolData.schoolData && schoolData.schoolData.school) {
            location = findLocationInObject(schoolData.schoolData.school);
          }
          
          if (location) {
            console.log('Found location through deep search:', location);
            setSchoolLocation({
              lat: location.lat,
              lng: location.lng,
              name: schoolData.school.name || schoolName || 'School Location'
            });
            setError(null);
            setIsLoading(false);
            return;
          }
          
          // Still no location found, try parsing from a string as a last resort
          if (typeof schoolObj.location === 'string') {
            console.log('Found location string:', schoolObj.location);
            // Try to parse coordinates from a format like [40.8081° N, 73.6033° W]
            const match = schoolObj.location.match(/\[([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])\]/);
            if (match) {
              const [_, latVal, latDir, lngVal, lngDir] = match;
              const lat = parseFloat(latVal) * (latDir === 'S' ? -1 : 1);
              const lng = parseFloat(lngVal) * (lngDir === 'W' ? -1 : 1);
              
              console.log(`Parsed coordinates from string: ${lat}, ${lng}`);
              setSchoolLocation({
                lat,
                lng,
                name: schoolData.school.name || schoolName || 'School Location'
              });
              setError(null);
              setIsLoading(false);
              return;
            }
          }
        }
        
        // If we reach here, we couldn't find the location data
        console.log('No location data found in the expected format');
        setError('School location data not available. Please ensure latitude and longitude are set in the school record.');
      } else {
        console.log('No school data available');
        setError('School information not available');
      }
    } catch (err) {
      console.error('Error processing school data:', err);
      setError('Failed to process school information');
    } finally {
      setIsLoading(false);
    }
  }, [schoolData, schoolName]);
  
  // Update the form fields when school data changes
  useEffect(() => {
    console.log('School data changed, updating form fields');
    console.log('Full schoolData:', JSON.stringify(schoolData, null, 2));
    
    if (schoolData) {
      // Try multiple paths to find the school data
      let schoolInfo = null;
      
      if (schoolData.school) {
        console.log('Found school data at schoolData.school:', schoolData.school);
        schoolInfo = schoolData.school;
      } else if (schoolData.schoolData && schoolData.schoolData.school) {
        console.log('Found school data at schoolData.schoolData.school:', schoolData.schoolData.school);
        schoolInfo = schoolData.schoolData.school;
      }
      
      if (schoolInfo) {
        console.log('School info found:', schoolInfo);
        console.log('School name:', schoolInfo.name);
        console.log('School address:', schoolInfo.address);
        
        // More detailed debugging for school code
        console.log('Checking all possible school code paths:');
        console.log('- schoolInfo.schoolCode:', schoolInfo.schoolCode);
        console.log('- schoolInfo.code:', schoolInfo.code);
        console.log('- schoolData.school.code:', schoolData.school?.code);
        console.log('- schoolContext schoolCode:', schoolCode);
        
        // Determine school code from various possible sources
        const foundSchoolCode = schoolInfo.schoolCode || schoolInfo.code || schoolData.school?.code || schoolCode || '';
        console.log('Final determined school code:', foundSchoolCode);
        
        setSchoolNameField(schoolInfo.name || schoolName || '');
        setSchoolAddressField(schoolInfo.address || '');
        setSchoolCodeField(foundSchoolCode);
        
        if (schoolLocation) {
          setLatitude(schoolLocation.lat.toString());
          setLongitude(schoolLocation.lng.toString());
        }
      } else {
        console.error('Could not find school information in the provided data');
      }
    }
  }, [schoolData, schoolLocation, schoolName, schoolCode]);

  // Function to search for an address and get coordinates
  const handleAddressSearch = async () => {
    if (!schoolAddressField.trim()) {
      Alert.alert('Empty Address', 'Please enter the school address to search.');
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Use Google Maps Geocoding API to convert address to coordinates
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(schoolAddressField)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;
        
        // Update coordinates
        setLatitude(location.lat.toString());
        setLongitude(location.lng.toString());
        
        // Update map preview
        setSchoolLocation({
          lat: location.lat,
          lng: location.lng,
          name: schoolNameField || 'School Location'
        });
        
        // Update the address field with the proper formatted address
        setSchoolAddressField(formattedAddress);
        
        // Show success message
        Alert.alert('Location Found', `Address found: ${formattedAddress}\n\nLocation has been updated on the map. Click 'Save School Information' to update the school record.`);
      } else {
        Alert.alert('Location Not Found', 'Could not find coordinates for the provided address. Please verify the address and try again.');
      }
    } catch (err) {
      console.error('Error searching for address:', err);
      Alert.alert('Error', 'Failed to search for address. Please check your internet connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle saving updated school information
  const handleSaveSchoolInfo = async () => {
    try {
      // Validate inputs
      if (!schoolNameField.trim()) {
        Alert.alert('Missing Information', 'Please enter a school name.');
        return;
      }
      
      if (!schoolAddressField.trim()) {
        Alert.alert('Missing Information', 'Please enter a school address.');
        return;
      }
      
      if (!schoolCodeField.trim()) {
        Alert.alert('Missing Information', 'Please enter a school code.');
        return;
      }
      
      // Convert coordinates to numbers if they exist
      const lat = latitude ? parseFloat(latitude) : null;
      const lng = longitude ? parseFloat(longitude) : null;
      
      if (!schoolData || !schoolData.school || !schoolData.school.id) {
        Alert.alert('Error', 'School information not available. Cannot update school record.');
        return;
      }
      
      setIsSaving(true);
      
      // Reference to the school document
      const schoolId = schoolData.school.id;
      const schoolRef = doc(db, 'Schools', schoolId);
      
      // Prepare update data
      const updateData: any = {
        name: schoolNameField,
        address: schoolAddressField,
        schoolCode: schoolCodeField,
        updated_at: Timestamp.now()
      };
      
      // Add coordinates if they exist
      if (lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng)) {
        updateData.latitude = lat;
        updateData.longitude = lng;
      }
      
      // Update the school document
      await updateDoc(schoolRef, updateData);
      
      // Update local state for the map
      if (lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng)) {
        setSchoolLocation({
          lat,
          lng,
          name: schoolNameField
        });
      }
      
      Alert.alert('Success', 'School information has been updated.');
      
      // Reload the page to reflect changes
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Error updating school information:', err);
      Alert.alert('Error', 'Failed to update school information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>School Information</ThemedText>
        <ThemedText style={styles.subtitle}>{schoolName || 'School'}</ThemedText>
      </View>
      
      {/* Page Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapSection}>
          <ThemedText style={styles.sectionTitle}>School Location</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            This map shows the location of your school. You can use this location
            as a reference point when planning transportation routes.
          </ThemedText>
          
          {/* School Map Component */}
          <View style={styles.mapContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
                <ThemedText style={styles.loadingText}>Loading school information...</ThemedText>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : (
              <SimpleSchoolMap 
                schoolLocation={schoolLocation}
                height={400}
                zoom={15}
                showHeader={false}
              />
            )}
          </View>
        </View>
        
        {/* School Information Form */}
        <View style={styles.formSection}>
          <ThemedText style={styles.sectionTitle}>Update School Information</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Update your school's information below. The address will be used to determine the school's location on the map.
          </ThemedText>
          
          <View style={styles.formContainer}>
            {/* School Name Field */}
            <View style={styles.formField}>
              <View style={styles.labelContainer}>
                <School size={16} color={Theme.colors.text.secondary} style={styles.fieldIcon} />
                <ThemedText style={styles.fieldLabel}>School Name</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={schoolNameField}
                onChangeText={setSchoolNameField}
                placeholder="Enter school name"
                placeholderTextColor={Theme.colors.text.tertiary}
              />
            </View>
            
            {/* School Code Field */}
            <View style={styles.formField}>
              <View style={styles.labelContainer}>
                <Hash size={16} color={Theme.colors.text.secondary} style={styles.fieldIcon} />
                <ThemedText style={styles.fieldLabel}>School Code</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={schoolCodeField}
                onChangeText={setSchoolCodeField}
                placeholder="Enter school code"
                placeholderTextColor={Theme.colors.text.tertiary}
              />
            </View>
            
            {/* School Address Field with Search Button */}
            <View style={styles.formField}>
              <View style={styles.labelContainer}>
                <Building size={16} color={Theme.colors.text.secondary} style={styles.fieldIcon} />
                <ThemedText style={styles.fieldLabel}>School Address</ThemedText>
              </View>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={schoolAddressField}
                  onChangeText={setSchoolAddressField}
                  placeholder="Enter complete school address"
                  placeholderTextColor={Theme.colors.text.tertiary}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleAddressSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <MapPin size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.searchHint}>
                Enter the full address including city, state, and ZIP/postal code, then click the pin icon to locate
              </ThemedText>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveSchoolInfo}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Save size={18} color="white" style={styles.saveIcon} />
                  <ThemedText style={styles.saveButtonText}>Save School Information</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  mapSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  mapContainer: {
    width: '100%',
    height: 400,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Theme.colors.error,
    textAlign: 'center',
    fontSize: 16,
  },
  formSection: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formContainer: {
    marginTop: 8,
  },
  formField: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  searchButton: {
    backgroundColor: Theme.colors.primary,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  searchHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 6,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 