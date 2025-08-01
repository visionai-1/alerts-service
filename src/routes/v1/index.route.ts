import { Router } from 'express';
import { alertsRouter } from './alerts.route';

/**
 * 🛣️ API v1 Routes
 * Main router for all v1 API endpoints
 */

const router = Router();

// Weather alerts routes
router.use('/alerts', alertsRouter);

export { router }; 