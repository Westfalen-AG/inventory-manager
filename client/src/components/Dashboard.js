import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  QrCodeScanner,
  Add,
  TrendingUp,
  Inventory,
  CheckCircle,
  Cancel,
  History,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { itemsAPI, transactionsAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, activityResponse] = await Promise.all([
        itemsAPI.getStats(),
        transactionsAPI.getStats(),
      ]);
      
      setStats({
        ...statsResponse.data.totals,
        categories: statsResponse.data.categories,
        recent_activity: statsResponse.data.recent_activity,
      });
      
      setRecentActivity(activityResponse.data.top_items || []);
    } catch (error) {
      showError('Fehler beim Laden der Dashboard-Daten');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type) => {
    return type === 'checkout' ? <Cancel color="error" /> : <CheckCircle color="success" />;
  };

  const getTransactionText = (type) => {
    return type === 'checkout' ? 'Ausgecheckt' : 'Eingecheckt';
  };

  if (loading) {
    return <LoadingSpinner text="Dashboard wird geladen..." />;
  }

  return (
    <Box>
      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Inventory color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats?.items || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats?.available || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verfügbar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Cancel color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats?.checked_out || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ausgecheckt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUp color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats?.categories?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kategorien
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Schnellaktionen
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<QrCodeScanner />}
              onClick={() => navigate('/scanner')}
              sx={{ py: 2 }}
            >
              QR-Code scannen
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Inventory />}
              onClick={() => navigate('/items')}
              sx={{ py: 2 }}
            >
              Inventar anzeigen
            </Button>
          </Grid>
          {isManager() && (
            <>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => navigate('/add-item')}
                  sx={{ py: 2 }}
                >
                  Neues Item
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<History />}
                  onClick={() => navigate('/transactions')}
                  sx={{ py: 2 }}
                >
                  Transaktionen
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Recent Activity */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Letzte Aktivitäten
          </Typography>
          <List>
            {stats.recent_activity.slice(0, 5).map((activity, index) => (
              <ListItem key={index} divider={index < 4}>
                <ListItemIcon>
                  {getTransactionIcon(activity.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {activity.item_name}
                      </Typography>
                      <Chip
                        label={getTransactionText(activity.type)}
                        size="small"
                        color={activity.type === 'checkout' ? 'error' : 'success'}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {activity.username} • {formatTimestamp(activity.timestamp)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button onClick={() => navigate('/transactions')}>
              Alle Transaktionen anzeigen
            </Button>
          </Box>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="QR-Code scannen"
        onClick={() => navigate('/scanner')}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <QrCodeScanner />
      </Fab>
    </Box>
  );
};

export default Dashboard; 