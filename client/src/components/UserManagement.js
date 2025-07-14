import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Fab,
} from '@mui/material';
import {
  People,
  PersonAdd,
  Edit,
  Delete,
  VpnKey,
  AdminPanelSettings,
  Person,
  Add,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { usersAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create', 'edit', 'resetPassword'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    email: '',
  });

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (error) {
      showError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type, user = null) => {
    setDialogType(type);
    setSelectedUser(user);
    
    if (type === 'create') {
      setFormData({
        username: '',
        password: '',
        role: 'user',
        email: '',
      });
    } else if (type === 'edit' && user) {
      setFormData({
        username: user.username,
        password: '',
        role: user.role,
        email: user.email || '',
      });
    } else if (type === 'resetPassword') {
      setFormData({
        ...formData,
        password: '',
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      email: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === 'create') {
        await usersAPI.create(formData);
        showSuccess('Benutzer erfolgreich erstellt');
      } else if (dialogType === 'edit') {
        const updateData = {
          username: formData.username,
          role: formData.role,
          email: formData.email,
        };
        await usersAPI.update(selectedUser.id, updateData);
        showSuccess('Benutzer erfolgreich aktualisiert');
      } else if (dialogType === 'resetPassword') {
        await usersAPI.resetPassword(selectedUser.id, { newPassword: formData.password });
        showSuccess('Passwort erfolgreich zurückgesetzt');
      }
      
      handleCloseDialog();
      loadUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Fehler beim Speichern';
      showError(message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Sind Sie sicher, dass Sie ${user.username} löschen möchten?`)) {
      try {
        await usersAPI.delete(user.id);
        showSuccess('Benutzer erfolgreich gelöscht');
        loadUsers();
      } catch (error) {
        const message = error.response?.data?.error || 'Fehler beim Löschen';
        showError(message);
      }
    }
  };

  const getDialogTitle = () => {
    switch (dialogType) {
      case 'create': return 'Neuen Benutzer erstellen';
      case 'edit': return 'Benutzer bearbeiten';
      case 'resetPassword': return 'Passwort zurücksetzen';
      default: return '';
    }
  };

  const getRoleIcon = (role) => {
    return role === 'manager' ? 
      <AdminPanelSettings color="warning" /> : 
      <Person color="primary" />;
  };

  const getRoleColor = (role) => {
    return role === 'manager' ? 'warning' : 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (loading) {
    return <LoadingSpinner text="Benutzer werden geladen..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Benutzer-Verwaltung
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog('create')}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            Neuer Benutzer
          </Button>
        </Box>
      </Paper>

      {/* Users List */}
      {users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Noch keine Benutzer vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Erstellen Sie den ersten Benutzer
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog('create')}
          >
            Ersten Benutzer erstellen
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid item xs={12} md={6} lg={4} key={user.id}>
              <Card>
                <CardContent>
                  {/* User Info */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, bgcolor: user.role === 'manager' ? 'warning.main' : 'primary.main' }}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6">
                        {user.username}
                      </Typography>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role === 'manager' ? 'Manager' : 'Benutzer'}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </Box>
                  </Box>

                  {/* Details */}
                  {user.email && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      📧 {user.email}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    📅 Erstellt: {formatDate(user.created_at)}
                  </Typography>
                  {user.last_login && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      🕒 Letzte Anmeldung: {formatDate(user.last_login)}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    📊 {user.transaction_count || 0} Transaktionen
                  </Typography>

                  {/* Actions */}
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleOpenDialog('edit', user)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      size="small"
                      startIcon={<VpnKey />}
                      onClick={() => handleOpenDialog('resetPassword', user)}
                    >
                      Passwort
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteUser(user)}
                      title="Benutzer löschen"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {(dialogType === 'create' || dialogType === 'edit') && (
              <>
                <TextField
                  fullWidth
                  name="username"
                  label="Benutzername"
                  value={formData.username}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
                
                <TextField
                  fullWidth
                  name="email"
                  label="E-Mail"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  margin="normal"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Rolle</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    label="Rolle"
                  >
                    <MenuItem value="user">Benutzer</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {(dialogType === 'create' || dialogType === 'resetPassword') && (
              <TextField
                fullWidth
                name="password"
                label={dialogType === 'create' ? 'Passwort' : 'Neues Passwort'}
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="Mindestens 6 Zeichen"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              (dialogType === 'create' && (!formData.username || !formData.password)) ||
              (dialogType === 'edit' && !formData.username) ||
              (dialogType === 'resetPassword' && !formData.password)
            }
          >
            {dialogType === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Neuen Benutzer hinzufügen"
        onClick={() => handleOpenDialog('create')}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { md: 'none' }, // Hide on desktop
        }}
      >
        <Add />
      </Fab>

      {/* Statistics */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          📊 Benutzer-Statistiken
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {users.filter(u => u.role === 'manager').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manager
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {users.filter(u => u.role === 'user').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Benutzer
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.last_login).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aktiv
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default UserManagement; 