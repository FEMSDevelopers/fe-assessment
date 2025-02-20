import { configureStore } from "@reduxjs/toolkit";
import mqttReducer from "../reducers/slice";

const store = configureStore({
  reducer: {
    mqtt: mqttReducer,
  },
});

export default store;