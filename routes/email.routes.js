const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { optionalAuth } = require('../middleware/auth');

router.post('/send-email/:id', optionalAuth, emailController.sendOrderEmail);

module.exports = router;
