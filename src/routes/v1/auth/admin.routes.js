import express from 'express';
const router = express.Router();

router.route('/register').post();
router.route('/login').post();
router.route('/profile').get((req, res, next) => {
  res.status(200).json({
    id: 'req.user.id',
    name: ' req.user.name',
    email: 'req.user.email',
  });
});
router.route('/refresh-token').post();
router.route('/logout').post();

export default router;
