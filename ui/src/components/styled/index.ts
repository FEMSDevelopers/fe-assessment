import { styled } from '@mui/material/styles';
import { Box, Paper } from '@mui/material';

export const GridContainer = styled(Box)(({ theme }) => ({
  height: 400,
  width: '100%',
  position: 'relative',
  '& .MuiDataGrid-root': {
    border: 'none',
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius,
    // ... rest of grid styles
  }
}));

export const DashboardContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.grey[100],
  minHeight: '100vh'
})); 