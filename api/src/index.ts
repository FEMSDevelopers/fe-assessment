// filepath: /Users/mpfrac/Projects/fe-assessment/backend/src/index.ts
import mqtt from "mqtt";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.json());

const brokerUrl = "mqtt://broker.emqx.io";
const topics = [
  "device/1/battery",
  "device/2/battery",
  "device/3/battery",
  "device/4/battery",
];

const client = mqtt.connect(brokerUrl);
let isPublishing = true;

client.on("connect", () => {
  console.log("Connected to broker");

  setInterval(() => {
    if (isPublishing) {
      topics.forEach((topic) => {
        const batteryData = {
          level: parseFloat((Math.random() * 100).toFixed(2)),
          voltage: parseFloat((Math.random() * 4).toFixed(2)),
          status: "discharging",
          health: "good",
          temperature: parseFloat((Math.random() * 40).toFixed(2)),
          cycles: Math.floor(Math.random() * 200),
          capacity: 2500,
          runtime_remaining: `${Math.floor(Math.random() * 5)}h ${Math.floor(
            Math.random() * 60
          )}m`,
          low_warning: Math.random() < 0.1,
        };
        client.publish(topic, JSON.stringify(batteryData), () => {
          console.log(`Published ${JSON.stringify(batteryData)} to ${topic}`);
        });
      });
    }
  }, 5000);
});

app.post("/topic/:deviceId/publish", (req, res) => {
  const { deviceId } = req.params;
  const topic = `device/${deviceId}/battery`;
  const message = req.body;
  client.publish(topic, JSON.stringify(message), () => {
    console.log(`Published ${JSON.stringify(message)} to ${topic}`);
    res.send({ message: "Message published" });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
