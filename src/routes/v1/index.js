import express from 'express';
const router = express.Router();

import authRoutes from './auth/index.js';

router.use('/auth', authRoutes);
export default router;
