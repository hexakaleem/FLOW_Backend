import { Router } from 'express';
import { DevicesController } from './devices.controller';

export const deviceRoutes = Router();

deviceRoutes.post('/register', DevicesController.register);
deviceRoutes.post('/unregister', DevicesController.unregister);
