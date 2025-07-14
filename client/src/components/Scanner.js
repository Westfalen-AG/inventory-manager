import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { QrCodeScanner } from '@mui/icons-material';

const Scanner = () => {
  return (
    <Box>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <QrCodeScanner sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 2 }}>
          QR-Code Scanner
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Die Scanner-Funktionalität wird in der nächsten Version implementiert.
          Sie können Items über das Inventar suchen und verwalten.
        </Typography>
        <Button variant="contained" href="/items">
          Zum Inventar
        </Button>
      </Paper>
    </Box>
  );
};

export default Scanner; 