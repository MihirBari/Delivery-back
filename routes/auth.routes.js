const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
