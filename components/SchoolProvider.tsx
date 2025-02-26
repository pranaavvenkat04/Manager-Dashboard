import React, { ReactNode, createContext, useState, useEffect, useContext } from 'react';

// Define context type
interface SchoolContextType {
  schoolName: string;
  setSchoolName: (name: string) => void;
}

// Create context with default values
const SchoolContext = createContext<SchoolContextType>({
  schoolName: 'School',
  setSchoolName: () => {},
});

// Hook to use the school context
export const useSchoolContext = () => useContext(SchoolContext);

interface SchoolProviderProps {
  children: ReactNode;
}

export function SchoolProvider({ children }: SchoolProviderProps) {
  const [schoolName, setSchoolName] = useState('NYIT');

  // Load school info on first render (could fetch from API or local storage)
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        // In a real app, you might fetch this from an API or AsyncStorage
        // For now, we'll just use a mock timeout
        setTimeout(() => {
          setSchoolName('NYIT');
        }, 500);
      } catch (error) {
        console.error('Error loading school info:', error);
      }
    };

    fetchSchoolInfo();
  }, []);

  return (
    <SchoolContext.Provider value={{ schoolName, setSchoolName }}>
      {children}
    </SchoolContext.Provider>
  );
}