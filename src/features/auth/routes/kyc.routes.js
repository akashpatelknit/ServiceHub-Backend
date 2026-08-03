import { Router } from 'express';
import { authenticate, requireIdentity } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { IDENTITIES } from '../constants/roles.constants.js';
import { KycController } from '../controllers/kyc.controller.js';
import {
  kycInfoSchema,
  kycDocumentsSchema,
  kycBankDetailsSchema,
  kycPaymentInitSchema,
  kycPaymentVerifySchema,
} from '../validators/kyc.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.VENDOR));

router.get('/', KycController.getStatus);
router.post('/steps/info', validate(kycInfoSchema), KycController.submitInfo);
router.post('/steps/documents', validate(kycDocumentsSchema), KycController.submitDocuments);
router.post('/steps/bank-details', validate(kycBankDetailsSchema), KycController.submitBankDetails);
router.post('/payment/initiate', validate(kycPaymentInitSchema), KycController.initiatePayment);
router.post('/payment/verify', validate(kycPaymentVerifySchema), KycController.verifyPayment);

export default router;
