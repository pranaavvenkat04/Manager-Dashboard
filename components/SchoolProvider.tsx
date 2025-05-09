import React, { ReactNode, createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, getCurrentSchool, getSchool, getCurrentUserSchoolId } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Define context type with all school-related data
interface SchoolContextType {
  schoolName: string;
  schoolId: string;
  schoolCode: string;
  isLoading: boolean;
  updateSchoolInfo: (data: Partial<SchoolData>) => void;
}

interface SchoolData {
  name: string;
  id: string;
  code: string;
}

// School type from Firebase
interface FirebaseSchool {
  id: string;
  name?: string;
  schoolCode?: string;
  [key: string]: any;
}

// Create context with default values
const SchoolContext = createContext<SchoolContextType>({
  schoolName: '',
  schoolId: '',
  schoolCode: '',
  isLoading: true,
  updateSchoolInfo: () => {},
});

// Storage key for school info
const SCHOOL_INFO_KEY = 'bustrak_school_info';

// Hook to use the school context
export const useSchoolContext = () => useContext(SchoolContext);

interface SchoolProviderProps {
  children: ReactNode;
}

export function SchoolProvider({ children }: SchoolProviderProps) {
  const [schoolData, setSchoolData] = useState<SchoolData>({
    name: '',
    id: '',
    code: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load school info on first render
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        setIsLoading(true);
        
        // Try to load from AsyncStorage first
        const storedData = await AsyncStorage.getItem(SCHOOL_INFO_KEY);
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setSchoolData(parsedData);
        } else {
          // First try to get school ID directly from current user's Manager-School mapping
          let schoolId = await getCurrentUserSchoolId();
          
          // Fall back to legacy method if that fails
          if (!schoolId) {
            console.log('Falling back to getCurrentSchool method');
            schoolId = await getCurrentSchool();
          }
          
          console.log(`SchoolProvider obtained schoolId: ${schoolId}`);
          
          if (schoolId) {
            // Fetch school details from Firestore
            console.log(`SchoolProvider fetching school details for ID: ${schoolId}`);
            const school = await getSchool(schoolId) as FirebaseSchool;
            
            if (school) {
              console.log(`School details fetched: ${school.name}`);
              const schoolInfo = {
                name: school.name || '',
                id: school.id || '',
                code: school.schoolCode || '',
              };
              
              setSchoolData(schoolInfo);
              
              // Store for future use
              AsyncStorage.setItem(SCHOOL_INFO_KEY, JSON.stringify(schoolInfo))
                .catch(err => console.error('Error saving school data:', err));
            } else {
              console.error('Could not get school details even though ID was found');
            }
          } else {
            console.error('No school ID could be determined');
          }
        }
      } catch (error) {
        console.error('Error loading school info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolInfo();
  }, []);

  // Function to update school info
  const updateSchoolInfo = async (newData: Partial<SchoolData>) => {
    try {
      const updatedData = { ...schoolData, ...newData };
      setSchoolData(updatedData);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(SCHOOL_INFO_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error updating school info:', error);
    }
  };

  return (
    <SchoolContext.Provider 
      value={{ 
        schoolName: schoolData.name,
        schoolId: schoolData.id,
        schoolCode: schoolData.code,
        isLoading,
        updateSchoolInfo,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}