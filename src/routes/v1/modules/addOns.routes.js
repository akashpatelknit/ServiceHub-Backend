import express from 'express';
import {
  createAddOn,
  getAddOnById,
  updateAddOn,
  softDeleteAddOn,
  hardDeleteAddOn,
  getAllAddOns,
  getAddOnsByServiceTemplate,
  assignAddOnsToServiceTemplate,
} from '../../../controllers/addOns/addOns.controller.js';
import { authenticate as authMiddleware } from '../../../features/auth/middlewares/authenticate.js';

const router = express.Router();

router.post('/', authMiddleware(['admin']), createAddOn);
router.get('/all', authMiddleware(['admin']), getAllAddOns);
router.post('/assign', assignAddOnsToServiceTemplate);
router.get('/template/:serviceTemplateId', getAddOnsByServiceTemplate);

router.get('/:id', getAddOnById);
router.put('/:id', authMiddleware(['admin']), updateAddOn);
router.delete('/:id', authMiddleware(['admin']), softDeleteAddOn);
router.delete('/:id/hard', authMiddleware(['admin']), hardDeleteAddOn);

export default router;
