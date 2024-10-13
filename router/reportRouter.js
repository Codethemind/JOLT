const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');


router.post('/generate', reportController.generateSalesReport);

module.exports = router;