import { createContext, useContext, useState } from 'react';
const AppContext = createContext(null);
export function AppProvider({ children }) { const [files, setFiles] = useState([]); const [results, setResults] = useState(null); return <AppContext.Provider value={{ files, setFiles, results, setResults }}>{children}</AppContext.Provider>; }
export const useAppContext = () => useContext(AppContext);
