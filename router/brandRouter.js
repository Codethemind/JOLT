const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');

router.post('/add-brand', brandController.addBrand);
router.put('/delete-brand/:id', brandController.deleteBrand);
router.put('/restore-brand/:id', brandController.restoreBrand);
router.put('/update-brand/:id', brandController.updateBrand);

module.exports = router;
