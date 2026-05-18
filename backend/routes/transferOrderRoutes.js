const express = require('express');

const {
    getTransferOrderByOrderId,
    signTransferOrder,
    downloadTransferPackingList,
} = require('../controllers/transferOrderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/order/:orderId', protect, getTransferOrderByOrderId);
router.post('/order/:orderId/sign', protect, signTransferOrder);
router.get('/order/:orderId/packing-list', protect, downloadTransferPackingList);

module.exports = router;
