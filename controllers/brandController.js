const Brand = require('../models/brandcollection');
// Add Brand
exports.addBrand = async (req, res) => {
    try {
        const existbrand= await Brand.findOne({brand_name:req.body.brand_name})
        if(existbrand){
            return res.status(400).json({ success: false, message: 'brand already exists' });
        }
           const newBrand = new Brand({ brand_name: req.body.brand_name });
            await newBrand.save();
            res.status(200).json({ success: true, message: 'Brand added successfully' });
        
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add brand' });
    }
};
// Delete Brand (soft delete)
exports.deleteBrand = async (req, res) => {
    try {
        await Brand.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.status(200).json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete brand' });
    }
};
// Restore Brand
exports.restoreBrand = async (req, res) => {
    try {
        await Brand.findByIdAndUpdate(req.params.id, { isDeleted: false });
        res.status(200).json({ success: true, message: 'Brand restored successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to restore brand' });
    }
};
// Update Brand
exports.updateBrand = async (req, res) => {
    try {
        await Brand.findByIdAndUpdate(req.params.id, { brand_name: req.body.brand_name });
        res.status(200).json({ success: true, message: 'Brand updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update brand' });
    }
};
