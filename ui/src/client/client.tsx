import mqtt from "mqtt";
import store from "../store";
import { messageReceived } from "../reducers/slice";

const MQTT_BROKER = "ws://broker.emqx.io:8083/mqtt";
const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
  ["device/1/battery", "device/2/battery", "device/3/battery", "device/4/battery"].forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (!err) {
        store.dispatch({ type: "mqtt/subscribeTopic", payload: topic });
      }
    });
  });
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    store.dispatch(messageReceived({ topic, data }));
  } catch (error) {
    console.error("Error parsing MQTT message", error);
  }
});

export const publishData = (topic:string, payload:any) => {
  client.publish(topic, JSON.stringify(payload));
};

export const unsubscribeFromTopic = (topic:string) => {
  client.unsubscribe(topic, () => {
    store.dispatch({ type: "mqtt/unsubscribeTopic", payload: topic });
  });
};

export default client;
