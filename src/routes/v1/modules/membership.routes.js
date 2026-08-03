import express from 'express';
import {
  createMembershipPlan,
  getAllMembershipPlans,
  getMembershipPlanById,
  updateMembershipPlan,
  deleteMembershipPlan,
} from '../../../controllers/membership/membershipPlan.controller.js';

import {
  assignMembership,
  getAllMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
} from '../../../controllers/membership/membership.controller.js';
import { authenticate as authMiddleware } from '../../../features/auth/middlewares/authenticate.js';

const router = express.Router();

router.post('/plans', authMiddleware(['admin']), createMembershipPlan);
router.get('/plans', getAllMembershipPlans);
router.get('/plans/:id', getMembershipPlanById);
router.put('/plans/:id', authMiddleware(['admin']), updateMembershipPlan);
router.delete('/plans/:id', authMiddleware(['admin']), deleteMembershipPlan);

router.post('/assign', authMiddleware(['admin']), assignMembership);
router.get('/all', authMiddleware(['admin']), getAllMemberships);
router.get('/:id', authMiddleware(['admin']), getMembershipById);
router.put('/:id', authMiddleware(['admin']), updateMembership);
router.delete('/:id', authMiddleware(['admin']), deleteMembership);

export default router;
