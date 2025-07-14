import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Pagination,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  QrCode,
  Cable,
  CheckCircle,
  Cancel,
  Edit,
  Print,
  Visibility,
  SwapHoriz,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { itemsAPI, transactionsAPI, labelsAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', item: null });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadItems();
  }, [pagination.page, searchTerm]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await itemsAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      });
      
      setItems(response.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages,
      }));
    } catch (error) {
      showError('Fehler beim Laden der Items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleCheckout = async (item, quantity = 1) => {
    try {
      const response = await transactionsAPI.checkout({
        item_id: item.id,
        quantity,
        notes: 'Ausgecheckt über Inventar-Liste'
      });
      
      showSuccess(response.data.message);
      loadItems(); // Refresh list
      setActionDialog({ open: false, type: '', item: null });
    } catch (error) {
      showError(error.response?.data?.error || 'Fehler beim Auschecken');
    }
  };

  const handleCheckin = async (item, quantity = 1) => {
    try {
      const response = await transactionsAPI.checkin({
        item_id: item.id,
        quantity,
        notes: 'Eingecheckt über Inventar-Liste'
      });
      
      showSuccess(response.data.message);
      loadItems(); // Refresh list
      setActionDialog({ open: false, type: '', item: null });
    } catch (error) {
      showError(error.response?.data?.error || 'Fehler beim Einchecken');
    }
  };

  const handleGenerateLabel = async (item, labelSize) => {
    try {
      const response = await labelsAPI.generate(item.id, { label_size: labelSize });
      
      // Download the label
      const downloadResponse = await labelsAPI.download(response.data.label.filename);
      const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.label.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess(`${labelSize} Label für ${item.name} generiert!`);
    } catch (error) {
      showError('Fehler beim Generieren des Labels');
    }
  };

  const getAvailabilityColor = (item) => {
    if (item.quantity_available === 0) return 'error';
    if (item.quantity_available < item.quantity_total * 0.3) return 'warning';
    return 'success';
  };

  const getAvailabilityText = (item) => {
    return `${item.quantity_available}/${item.quantity_total}`;
  };

  if (loading && items.length === 0) {
    return <LoadingSpinner text="Inventar wird geladen..." />;
  }

  return (
    <Box>
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Suche nach Name, QR-Code, Farbe oder Standort..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <IconButton
                onClick={(e) => setFilterAnchor(e.currentTarget)}
              >
                <FilterList />
              </IconButton>
              {isManager() && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/add-item')}
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  Neues Item
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Items Grid */}
      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Cable sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'Keine Items gefunden' : 'Noch keine Items vorhanden'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm ? 'Versuchen Sie andere Suchbegriffe' : 'Erstellen Sie Ihr erstes Item'}
          </Typography>
          {isManager() && !searchTerm && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/add-item')}
            >
              Erstes Item erstellen
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  {/* Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.qr_code}
                      </Typography>
                    </Box>
                    <Chip
                      label={getAvailabilityText(item)}
                      color={getAvailabilityColor(item)}
                      size="small"
                    />
                  </Box>

                  {/* Details */}
                  <Box mb={2}>
                    {item.length && (
                      <Chip label={`${item.length}m`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    )}
                    {item.cat_version && (
                      <Chip label={item.cat_version} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    )}
                    {item.color && (
                      <Chip label={item.color} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    )}
                    {item.indoor_outdoor && (
                      <Chip label={item.indoor_outdoor} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    )}
                  </Box>

                  {item.location && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      📍 {item.location}
                    </Typography>
                  )}

                  {/* Actions */}
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/items/${item.id}`)}
                    >
                      Details
                    </Button>
                    
                    {item.quantity_available > 0 && (
                      <Button
                        size="small"
                        startIcon={<Cancel />}
                        color="error"
                        onClick={() => setActionDialog({ 
                          open: true, 
                          type: 'checkout', 
                          item 
                        })}
                      >
                        Auschecken
                      </Button>
                    )}
                    
                    {item.quantity_available < item.quantity_total && (
                      <Button
                        size="small"
                        startIcon={<CheckCircle />}
                        color="success"
                        onClick={() => setActionDialog({ 
                          open: true, 
                          type: 'checkin', 
                          item 
                        })}
                      >
                        Einchecken
                      </Button>
                    )}

                    {isManager() && (
                      <IconButton
                        size="small"
                        onClick={() => handleGenerateLabel(item, '24mm')}
                        title="Label drucken"
                      >
                        <Print />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: '', item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'checkout' ? 'Item auschecken' : 'Item einchecken'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.item && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {actionDialog.item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                QR-Code: {actionDialog.item.qr_code}
              </Typography>
              <Typography variant="body1">
                {actionDialog.type === 'checkout' 
                  ? `Verfügbar: ${actionDialog.item.quantity_available}`
                  : `Ausgecheckt: ${actionDialog.item.quantity_total - actionDialog.item.quantity_available}`
                }
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, type: '', item: null })}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color={actionDialog.type === 'checkout' ? 'error' : 'success'}
            onClick={() => {
              if (actionDialog.type === 'checkout') {
                handleCheckout(actionDialog.item);
              } else {
                handleCheckin(actionDialog.item);
              }
            }}
          >
            {actionDialog.type === 'checkout' ? 'Auschecken' : 'Einchecken'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem onClick={() => setFilterAnchor(null)}>
          Alle Items
        </MenuItem>
        <MenuItem onClick={() => setFilterAnchor(null)}>
          Nur verfügbare
        </MenuItem>
        <MenuItem onClick={() => setFilterAnchor(null)}>
          Nur ausgecheckte
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      {isManager() && (
        <Fab
          color="primary"
          aria-label="Neues Item hinzufügen"
          onClick={() => navigate('/add-item')}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { md: 'none' }, // Hide on desktop (button in header)
          }}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default ItemList; 