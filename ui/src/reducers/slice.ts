import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  topics: {},
  subscribed: {},
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    messageReceived: (state, action) => {
      const { topic, data } = action.payload;
      //@ts-ignore
      state.topics[topic] = {
        id: topic.split("/")[1], // Extract device ID
        name: `Device ${topic.split("/")[1]}`, // Generate a name
        values: data, // Store the latest data
      };
    },
    unsubscribeTopic: (state, action) => {
      // @ts-ignore
      delete state.topics[action.payload];
      // @ts-ignore
      state.subscribed[action.payload] = false;
    },
    subscribeTopic: (state, action) => {
      // @ts-ignore
      state.subscribed[action.payload] = true;
    },
  },
});

export const { messageReceived, unsubscribeTopic, subscribeTopic } = mqttSlice.actions;
export default mqttSlice.reducer;