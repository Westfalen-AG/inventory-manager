import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';
import AddItem from './components/AddItem';
import TransactionHistory from './components/TransactionHistory';
import UserManagement from './components/UserManagement';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Theme für mobile Optimierung
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
      dark: '#1976d2',
      light: '#64b5f6',
    },
    secondary: {
      main: '#ff9800',
      dark: '#f57c00',
      light: '#ffb74d',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1.1rem',
      },
    },
    h6: {
      fontWeight: 500,
      fontSize: '1.1rem',
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '1rem',
          '@media (max-width:600px)': {
            padding: '12px 20px',
            fontSize: '1rem',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            width: 48,
            height: 48,
          },
        },
      },
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children, requireManager = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Public Route Component (redirects if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/scanner"
                element={
                  <ProtectedRoute>
                    <Scanner />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/items"
                element={
                  <ProtectedRoute>
                    <ItemList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/items/:id"
                element={
                  <ProtectedRoute>
                    <ItemDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-item"
                element={
                  <ProtectedRoute requireManager={true}>
                    <AddItem />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <TransactionHistory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute requireManager={true}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App; 