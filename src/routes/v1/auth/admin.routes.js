import express from 'express';
const router = express.Router();

// POST   /api/v1/auth/admin/register
// POST   /api/v1/auth/admin/login
// GET    /api/v1/auth/admin/profile
// POST   /api/v1/auth/admin/refresh-token
// POST   /api/v1/auth/admin/logout


router.route('/register').post();
router.route('/login').post();
router.route('/profile').get();
router.route('/refresh-token').post();
router.route('/logout').post();



export default router;