import express from 'express';
const router = express.Router();

router.route('/register').post();
router.route('/login').post();
router.route('/profile').get();
router.route('/refresh-token').post();
router.route('/logout').post();

export default router;