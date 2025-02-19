// filepath: /Users/mpfrac/Projects/fe-assessment/backend/src/index.ts
import mqtt from "mqtt";
import express from "express";
import bodyParser from "body-parser";
import cors from 'cors';

export function createServer() {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  // MQTT broker connection URL - using WebSocket Secure protocol
  const brokerUrl = "wss://broker.emqx.io:8084/mqtt";

  // Device topics for publishing simulated data
  const topics = [
    "device/1/battery",
    "device/2/battery",
    "device/3/battery",
    "device/4/battery",
  ];

  // Initialize MQTT client connection
  const client = mqtt.connect(brokerUrl);
  let isPublishing = true;

  // API endpoint to control data publishing
  app.post('/api/publish/control', (req, res) => {
    const { enabled } = req.body;
    isPublishing = enabled;
    res.json({ success: true, publishing: isPublishing });
  });

  // API endpoint for manual data publishing to specific device
  app.post('/api/publish/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const data = req.body;
    
    const topic = `device/${deviceId}/battery`;
    client.publish(topic, JSON.stringify(data), (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to publish' });
      } else {
        res.json({ success: true });
      }
    });
  });

  // Set up automatic data publishing on MQTT connection
  client.on("connect", () => {
    console.log("Connected to broker");

    // Publish simulated data every 5 seconds
    setInterval(() => {
      if (isPublishing) {
        topics.forEach((topic) => {
          // Generate random sensor data
          const batteryData = {
            time: Date.now(),
            temp: parseFloat((Math.random() * 40).toFixed(2)),    // Temperature 0-40°C
            hum: parseFloat((Math.random() * 50 + 30).toFixed(2)) // Humidity 30-80%
          };
          
          client.publish(topic, JSON.stringify(batteryData));
        });
      }
    }, 5000);
  });

  return app;
}

// Start server only if this file is run directly
if (require.main === module) {
  const app = createServer();
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
