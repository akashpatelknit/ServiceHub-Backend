import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { createAddress, getAddress, updateAddress, deleteAddress } from '../controllers/address.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', createAddress);
router.get('/:addressId', getAddress);
router.patch('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);

export default router;
