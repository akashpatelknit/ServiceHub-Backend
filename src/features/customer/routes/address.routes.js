import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../controllers/address.controller.js';
import { createAddressSchema, updateAddressSchema, addressIdParamSchema } from '../validators/address.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.USER));

router.get('/me/addresses', listAddresses);
router.post('/me/addresses', validate(createAddressSchema), createAddress);
router.patch('/me/addresses/:addressId', validate(updateAddressSchema), updateAddress);
router.delete('/me/addresses/:addressId', validate(addressIdParamSchema), deleteAddress);
router.patch('/me/addresses/:addressId/default', validate(addressIdParamSchema), setDefaultAddress);

export default router;
