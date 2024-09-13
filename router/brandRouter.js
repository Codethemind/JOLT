const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');

// Route to add a brand
router.post('/add-brand', brandController.addBrand);

// Route to delete a brand
router.put('/delete-brand/:id', brandController.deleteBrand);

// Route to restore a brand
router.put('/restore-brand/:id', brandController.restoreBrand);

// Route to update a brand
router.put('/update-brand/:id', brandController.updateBrand);

module.exports = router;
