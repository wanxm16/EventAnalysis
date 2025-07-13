import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储中的认证状态
    const auth = localStorage.getItem('isAuthenticated');
    const storedUsername = localStorage.getItem('username');
    
    if (auth === 'true' && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
    
    setLoading(false);
  }, []);

  const login = (username) => {
    setIsAuthenticated(true);
    setUsername(username);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', username);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
  };

  const value = {
    isAuthenticated,
    username,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};