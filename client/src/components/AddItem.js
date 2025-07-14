import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add,
  Cable,
  QrCode,
  Print,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { itemsAPI, labelsAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const AddItem = () => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'rj45',
    category: 'cable',
    length: '',
    color: '',
    cat_version: '',
    indoor_outdoor: '',
    location: '',
    manufacturer: '',
    quantity_total: 1,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const colorOptions = [
    'Schwarz', 'Blau', 'Rot', 'Grün', 'Gelb', 'Orange', 
    'Violett', 'Grau', 'Weiß', 'Rosa'
  ];

  const catVersions = [
    'CAT5', 'CAT5e', 'CAT6', 'CAT6a', 'CAT7', 'CAT7a', 'CAT8'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (formData.length && (isNaN(formData.length) || parseFloat(formData.length) <= 0)) {
      newErrors.length = 'Länge muss eine positive Zahl sein';
    }

    if (formData.quantity_total && (isNaN(formData.quantity_total) || parseInt(formData.quantity_total) <= 0)) {
      newErrors.quantity_total = 'Anzahl muss eine positive Zahl sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Create item
      const response = await itemsAPI.create({
        ...formData,
        length: formData.length ? parseFloat(formData.length) : null,
        quantity_total: parseInt(formData.quantity_total),
      });

      const newItem = response.data.item;
      setCreatedItem(newItem);
      
      showSuccess(`${newItem.name} erfolgreich erstellt!`);

      // Reset form
      setFormData({
        name: '',
        type: 'rj45',
        category: 'cable',
        length: '',
        color: '',
        cat_version: '',
        indoor_outdoor: '',
        location: '',
        manufacturer: '',
        quantity_total: 1,
        description: '',
      });

    } catch (error) {
      const message = error.response?.data?.error || 'Fehler beim Erstellen des Items';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabel = async (labelSize) => {
    if (!createdItem) return;

    try {
      setLoading(true);
      const response = await labelsAPI.generate(createdItem.id, { label_size: labelSize });
      
      showSuccess(`${labelSize} Label erfolgreich generiert!`);
      
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
      
    } catch (error) {
      showError('Fehler beim Generieren des Labels');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Verarbeitung läuft..." />;
  }

  return (
    <Box>
      {/* Success Message */}
      {createdItem && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            🎉 Item erfolgreich erstellt!
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>{createdItem.name}</strong> (QR-Code: {createdItem.qr_code})
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              startIcon={<Print />}
              onClick={() => handleGenerateLabel('12mm')}
            >
              12mm Label
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Print />}
              onClick={() => handleGenerateLabel('24mm')}
            >
              24mm Label
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/items/${createdItem.id}`)}
            >
              Item anzeigen
            </Button>
          </Box>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Cable sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5">
              Neues RJ45-Kabel hinzufügen
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                  Basis-Informationen
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  name="name"
                  label="Name/Bezeichnung"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  error={!!errors.name}
                  helperText={errors.name || 'z.B. "Patchkabel Cat6 3m blau"'}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  name="quantity_total"
                  label="Anzahl"
                  type="number"
                  value={formData.quantity_total}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 1 }}
                  error={!!errors.quantity_total}
                  helperText={errors.quantity_total}
                />
              </Grid>

              {/* Cable Specifications */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                  Kabel-Spezifikationen
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  name="length"
                  label="Länge (m)"
                  type="number"
                  value={formData.length}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={!!errors.length}
                  helperText={errors.length || 'Länge in Metern'}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Farbe</InputLabel>
                  <Select
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    label="Farbe"
                  >
                    <MenuItem value="">
                      <em>Keine Angabe</em>
                    </MenuItem>
                    {colorOptions.map(color => (
                      <MenuItem key={color} value={color}>
                        {color}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>CAT-Version</InputLabel>
                  <Select
                    name="cat_version"
                    value={formData.cat_version}
                    onChange={handleChange}
                    label="CAT-Version"
                  >
                    <MenuItem value="">
                      <em>Keine Angabe</em>
                    </MenuItem>
                    {catVersions.map(cat => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Indoor/Outdoor</InputLabel>
                  <Select
                    name="indoor_outdoor"
                    value={formData.indoor_outdoor}
                    onChange={handleChange}
                    label="Indoor/Outdoor"
                  >
                    <MenuItem value="">
                      <em>Keine Angabe</em>
                    </MenuItem>
                    <MenuItem value="indoor">Indoor</MenuItem>
                    <MenuItem value="outdoor">Outdoor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="location"
                  label="Standort"
                  value={formData.location}
                  onChange={handleChange}
                  helperText="z.B. Lager A, Schrank 3"
                />
              </Grid>

              {/* Additional Info */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                  Zusätzliche Informationen
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="manufacturer"
                  label="Hersteller"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  helperText="Optional"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Beschreibung"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  helperText="Zusätzliche Notizen oder Beschreibungen"
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/items')}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    disabled={loading}
                  >
                    Item erstellen
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <QrCode sx={{ mr: 1, verticalAlign: 'middle' }} />
          Nach der Erstellung
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Nach dem Erstellen des Items wird automatisch ein eindeutiger QR-Code generiert. 
          Sie können dann sofort Labels für Ihren Brother PT-P950NW Drucker generieren.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Chip label="12mm Labels" size="small" sx={{ mr: 1 }} />
          <Chip label="24mm Labels" size="small" sx={{ mr: 1 }} />
          <Chip label="QR-Code" size="small" />
        </Box>
      </Paper>
    </Box>
  );
};

export default AddItem; 