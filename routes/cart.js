router.post('/order', async (req, res) => {
    try {
        const { addressId, paymentMethod, productIds } = req.body;

        // Verify all products exist and are available
        const products = await Product.find({ _id: { $in: productIds } });
        
        // Check if any products are missing or deleted
        if (products.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more products in your cart are no longer available'
            });
        }

        // Check if any products are marked as deleted or unavailable
        const unavailableProducts = products.filter(product => 
            product.isDeleted || !product.isAvailable
        );

        if (unavailableProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Some products in your cart are no longer available',
                unavailableProducts: unavailableProducts.map(p => p.product_name)
            });
        }

        // Proceed with order creation if all products are available
        // ... rest of your order creation logic ...

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating your order'
        });
    }
}); 