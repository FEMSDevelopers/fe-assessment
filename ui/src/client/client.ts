import mqtt from "mqtt";
import store from "../store";
import { messageReceived } from "../reducers/slice";

const API = "http://localhost:3000";

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
  const body = payload.reduce((acc:any, curr:any) => ({ ...acc, [curr.label.toLowerCase()]: curr.value }), {});
  const [_,deviceId] = topic.split("/")
  fetch(`${API}/topic/${deviceId}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

export const unsubscribeFromTopic = (topic:string) => {
  client.unsubscribe(topic, () => {
    store.dispatch({ type: "mqtt/unsubscribeTopic", payload: topic });
  });
};

export default client;
