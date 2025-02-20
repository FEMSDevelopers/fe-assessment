import React from "react";
import { Provider } from "react-redux";
import store from "./store";
import {MQTTTable} from "./components/MQTTTable";
import { Container, Typography } from "@mui/material";

const App = () => {
  return (
    <Provider store={store}>
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ my: 2 }}>
          MQTT Messages
        </Typography>
        <MQTTTable />
      </Container>
    </Provider>
  );
};

export default App;
