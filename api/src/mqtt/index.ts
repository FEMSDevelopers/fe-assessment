import mqtt from 'mqtt';
import { DeviceData, MQTT_CONFIG, DEVICE_TOPICS } from '../types';

function generateRandomData(): DeviceData {
  return {
    time: Date.now(),
    temp: parseFloat((Math.random() * 40).toFixed(2)),
    hum: parseFloat((Math.random() * 50 + 30).toFixed(2))
  };
}

// Create MQTT client
const client = mqtt.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);

client.on('connect', () => {
  console.log('Publisher connected to MQTT broker');
  console.log('Publishing to topics:', DEVICE_TOPICS);
  
  setInterval(() => {
    DEVICE_TOPICS.forEach(topic => {
      const data = generateRandomData();
      console.log(`Publishing to ${topic}:`, data);
      client.publish(topic, JSON.stringify(data), (err) => {
        if (err) {
          console.error('Error publishing to', topic, err);
        } else {
          console.log('Successfully published to', topic);
        }
      });
    });
  }, 2000);
});

client.on('error', (error) => {
  console.error('Publisher MQTT error:', error);
});

client.on('close', () => {
  console.log('Publisher MQTT connection closed');
});

process.on('SIGTERM', () => {
  console.log('Closing MQTT publisher connection');
  client.end();
  process.exit(0);
});

process.stdin.resume(); 