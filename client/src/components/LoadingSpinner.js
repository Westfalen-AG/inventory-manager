import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ text = 'Lädt...', size = 40 }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      p={3}
    >
      <CircularProgress size={size} color="primary" />
      {text && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner; 