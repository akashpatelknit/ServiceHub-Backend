import { Router } from 'express';
import adminAuthController from '../../controllers/admin/admin.auth.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import { getAddressFromCoordinates } from '../../utils/helpers/maps/getAddressFromCoordinates.js';

const router = Router();

router
  .route('/current-user')
  .get(authMiddleware(['admin', 'vendor', 'customer']), adminAuthController.selfIdentification);

router.route('/coordinate-to-address').get(async (req, res) => {
  const address = await getAddressFromCoordinates(req.query.latitude, req.query.longitude);
  res.json(address);
});

export default router;
