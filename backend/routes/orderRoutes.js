const express = require('express');
const router = express.Router();
const { createOrder, updateOrderStatus, updateOrderAccounting, getOrders, downloadPackingList } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Import the gatekeeper

router.route('/').get(protect, getOrders).post(protect, createOrder);
router.route('/:id').put(protect, updateOrderStatus);
router.route('/:id/accounting').put(protect, updateOrderAccounting);
router.route('/:id/packing-list').get(protect, downloadPackingList);

module.exports = router;
