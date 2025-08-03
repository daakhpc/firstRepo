
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Spinner } from './components/common';
import { User } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const checkAuthStatus = async () => {
        const loggedInUserId = localStorage.getItem('loggedInUserId');
        if (loggedInUserId) {
            const users = await db.getUsers();
            const user = users.find(u => u.id === loggedInUserId);
            db.setCurrentUser(user || null); // Set user for DB context
            setCurrentUser(user || null);
        } else {
            db.setCurrentUser(null);
            setCurrentUser(null);
        }
    };
    checkAuthStatus();
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const users = await db.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem('loggedInUserId', user.id);
      db.setCurrentUser(user); // Set user for DB context
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUserId');
    db.setCurrentUser(null); // Clear user from DB context
    setCurrentUser(null);
  };

  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {currentUser ? <Dashboard currentUser={currentUser} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
    </div>
  );
};

export default App;