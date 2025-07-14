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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Paper,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  Search,
  History,
  CheckCircle,
  Cancel,
  FilterList,
  Download,
  Person,
  Cable,
  Today,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { transactionsAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const { isManager } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, searchTerm, typeFilter, tabValue]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let response;
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        type: typeFilter || undefined,
      };

      if (tabValue === 0 && isManager()) {
        // All transactions (Manager only)
        response = await transactionsAPI.getAll(params);
      } else {
        // My transactions
        response = await transactionsAPI.getMyHistory(params);
      }
      
      setTransactions(response.data.transactions);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages,
      }));
    } catch (error) {
      showError('Fehler beim Laden der Transaktionen');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTypeFilter = (e) => {
    setTypeFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type) => {
    return type === 'checkout' ? 
      <Cancel sx={{ color: 'error.main' }} /> : 
      <CheckCircle sx={{ color: 'success.main' }} />;
  };

  const getTransactionColor = (type) => {
    return type === 'checkout' ? 'error' : 'success';
  };

  const getTransactionText = (type) => {
    return type === 'checkout' ? 'Ausgecheckt' : 'Eingecheckt';
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.item_name?.toLowerCase().includes(searchLower) ||
      transaction.qr_code?.toLowerCase().includes(searchLower) ||
      transaction.username?.toLowerCase().includes(searchLower)
    );
  });

  if (loading && transactions.length === 0) {
    return <LoadingSpinner text="Transaktionen werden geladen..." />;
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ mb: 3 }}>
        {/* Tabs */}
        {isManager() && (
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Alle Transaktionen" />
            <Tab label="Meine Transaktionen" />
          </Tabs>
        )}

        {/* Search and Filter */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Suche nach Item, QR-Code oder Benutzer..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={handleTypeFilter}
                  label="Typ"
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="checkout">Auschecken</MenuItem>
                  <MenuItem value="checkin">Einchecken</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                disabled // TODO: Implement export
              >
                Export
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm || typeFilter ? 'Keine Transaktionen gefunden' : 'Noch keine Transaktionen'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || typeFilter ? 'Versuchen Sie andere Filter' : 'Transaktionen erscheinen hier, sobald Items aus- oder eingecheckt werden'}
          </Typography>
        </Paper>
      ) : (
        <Card>
          <List>
            {filteredTransactions.map((transaction, index) => (
              <ListItem
                key={transaction.id}
                divider={index < filteredTransactions.length - 1}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  {getTransactionIcon(transaction.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h6" component="span">
                        {transaction.item_name}
                      </Typography>
                      <Chip
                        label={getTransactionText(transaction.type)}
                        color={getTransactionColor(transaction.type)}
                        size="small"
                        variant="outlined"
                      />
                      {transaction.quantity > 1 && (
                        <Chip
                          label={`${transaction.quantity}x`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <Cable sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        QR-Code: {transaction.qr_code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        {transaction.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Today sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        {formatTimestamp(transaction.timestamp)}
                      </Typography>
                      {transaction.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          "{transaction.notes}"
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Card>
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

      {/* Statistics Card */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          📊 Statistiken
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {pagination.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {filteredTransactions.filter(t => t.type === 'checkout').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ausgecheckt
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {filteredTransactions.filter(t => t.type === 'checkin').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Eingecheckt
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {new Set(filteredTransactions.map(t => t.item_id)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verschiedene Items
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TransactionHistory; 