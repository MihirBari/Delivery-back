const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { optionalAuth } = require('../middleware/auth');

// Get all raised orders assigned to a user
router.get('/orders/:userId', optionalAuth, orderController.getOrdersByUser);

// Get itemized details for a specific order
router.get('/orderdetail/:id', optionalAuth, orderController.getOrderDetails);

// Complete delivery with recipient signature
router.put('/orders/:id', optionalAuth, orderController.completeDelivery);

module.exports = router;
