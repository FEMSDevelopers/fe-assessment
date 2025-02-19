// filepath: /Users/mpfrac/Projects/fe-assessment/backend/src/index.ts
import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { MQTTService } from './services/mqtt.service';
import { MQTTController } from './controllers/mqtt.controller';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createServer(): Application {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  const mqttService = new MQTTService();
  const mqttController = new MQTTController(mqttService);

  // Routes
  app.post(
    '/api/publish/control', 
    (req, res) => mqttController.handlePublishControl(req, res)
  );

  app.post(
    '/api/publish/:deviceId', 
    (req, res) => mqttController.handleDevicePublish(req, res)
  );

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    mqttService.cleanup();
    process.exit(0);
  });

  return app;
}

if (require.main === module) {
  const app = createServer();
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
