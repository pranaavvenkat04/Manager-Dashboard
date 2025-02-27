import React, { ReactNode, createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Create context with default values
const SchoolContext = createContext<SchoolContextType>({
  schoolName: 'School',
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
    name: 'NYIT',
    id: 'school1',
    code: 'NYT001',
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
          // If no stored data, fetch from API (mocked for now)
          // In a real app, you might fetch this from Firebase or another backend
          setTimeout(() => {
            const mockData = {
              name: 'NYIT',
              id: 'school1',
              code: 'NYT001',
            };
            setSchoolData(mockData);
            
            // Store for future use
            AsyncStorage.setItem(SCHOOL_INFO_KEY, JSON.stringify(mockData))
              .catch(err => console.error('Error saving school data:', err));
          }, 500);
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