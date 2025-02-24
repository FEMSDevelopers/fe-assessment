import { Container, Typography } from '@mui/material';
import { lazy } from 'react';

const DeviceTable = lazy(() => import('./components/DeviceTable'));

function App() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        MQTT Device Monitor
      </Typography>
      <DeviceTable />
    </Container>
  );
}

export default App;
