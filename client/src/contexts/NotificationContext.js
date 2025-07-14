import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification muss innerhalb eines NotificationProviders verwendet werden');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, severity = 'info', title = null, duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      severity,
      title,
      duration,
      open: true,
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        closeNotification(id);
      }, duration);
    }

    return id;
  };

  const closeNotification = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, open: false }
          : notification
      )
    );

    // Remove from array after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 300);
  };

  // Convenience methods
  const showSuccess = (message, title = 'Erfolgreich') => 
    showNotification(message, 'success', title);

  const showError = (message, title = 'Fehler') => 
    showNotification(message, 'error', title, 7000);

  const showWarning = (message, title = 'Warnung') => 
    showNotification(message, 'warning', title, 6000);

  const showInfo = (message, title = null) => 
    showNotification(message, 'info', title);

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          onClose={() => closeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{
            mb: index * 7, // Stack notifications
          }}
        >
          <Alert
            onClose={() => closeNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              maxWidth: 400,
              fontSize: '0.9rem',
            }}
          >
            {notification.title && (
              <AlertTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {notification.title}
              </AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
}; 