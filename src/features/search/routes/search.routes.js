import { Router } from 'express';
import { validate } from '../../auth/middlewares/validate.js';
import { searchRateLimit } from '../middlewares/searchRateLimit.js';
import { searchQuerySchema } from '../validators/search.validation.js';
import { SearchController } from '../controllers/search.controller.js';

const router = Router();

// Public — no auth, same as category/service list endpoints.
router.get('/', searchRateLimit, validate(searchQuerySchema), SearchController.search);

export default router;
