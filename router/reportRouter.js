const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');


router.post('/generate', reportController.generateSalesReport);

router.get('/api/sales-data', reportController.salesChart);

module.exports = router;