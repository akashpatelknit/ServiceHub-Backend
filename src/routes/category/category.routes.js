import { Router } from 'express';

import {
  addCategory,
  deleteCategory,
  getAllCategoryList,
  getAvailableRequestCategoryList,
  getCategoryById,
  updateCategory,
} from '../../controllers/category/category.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

const router = Router();

router.route('/categories').get(getAllCategoryList);
router.route('/categories/available').get(authMiddleware(['vendor']), getAvailableRequestCategoryList);
router.route('/categories/:id').get(getCategoryById);
router.route('/categories').post(authMiddleware(['admin']), addCategory);
router.route('/categories/:id').put(authMiddleware(['admin']), updateCategory);
router.route('/categories/:id').delete(authMiddleware(['admin']), deleteCategory);

export default router;
