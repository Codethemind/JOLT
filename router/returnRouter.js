const express = require('express');
const router = express.Router();
const Order = require('../models/ordercollection');
const Wallet = require('../models/walletCollection');

// POST /return-request/:orderId
router.post('/return-request/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { reason, description } = req.body;

    try {
        const order = await Order.findOne({ 
            $or: [
                { _id: orderId },
                { orderId: orderId }
            ]
        });
   
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.returnStatus !== 'None') {
            return res.status(400).json({ 
                message: 'A return request has already been made for this order.',
                returnStatus: order.returnStatus
            });
        }

        order.returnStatus = 'Pending';
        order.returnRequestDate = new Date();
        order.returnReason = reason;
        order.returnDescription = description;

        await order.save();

        return res.status(200).json({ message: 'Return request submitted successfully.' });
    } catch (error) {
        console.error('Error submitting return request:', error);
        return res.status(500).json({ message: 'Error submitting return request.', error: error.message });
    }
});

// New route for admin to get pending return requests
router.get('/admin/pending-returns', async (req, res) => {
    try {
        const pendingReturns = await Order.find({ returnStatus: 'Pending' });
        res.json({ success: true, pendingReturns });
    } catch (error) {
        console.error('Error fetching pending returns:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending returns.' });
    }
});

router.post('/admin/accept-return/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Update order's return status
        order.returnStatus = 'Accepted';
        order.returnAcceptedDate = new Date();

        let refundProcessed = false;

        // Check the payment method used for the order
        if (order.paymentMethod === 'Cash on Delivery') {
            // Refund to wallet if payment was Cash on Delivery
            let wallet = await Wallet.findOne({ userId: order.user });

            if (!wallet) {
                // Create a new wallet for the user if it doesn't exist
                wallet = new Wallet({
                    userId: order.user,
                    balance: 0,
                    transactions: []
                });
            }

            // Add the refund amount to the wallet balance
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: `Refund for order ${order.orderId}`,
                date: new Date()
            });

            // Save the order and wallet
            await Promise.all([order.save(), wallet.save()]);

            refundProcessed = true;
        } else if (order.paymentMethod === 'Bank Transfer') {
            // Refund to bank account logic can be handled here
            // For the sake of this example, we will still refund to the wallet first
            let wallet = await Wallet.findOne({ userId: order.user });

            if (!wallet) {
                // Create a new wallet for the user if it doesn't exist
                wallet = new Wallet({
                    userId: order.user,
                    balance: 0,
                    transactions: []
                });
            }

            // Add the refund amount to the wallet balance
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: `Refund for order ${order.orderId} (Bank Transfer)`,
                date: new Date()
            });

            // Additional logic to transfer money from wallet to bank account
            // This could involve integrating with a payment gateway or bank transfer API
            // For now, we'll just refund to the wallet.
            await Promise.all([order.save(), wallet.save()]);

            refundProcessed = true;
        }

        if (refundProcessed) {
            res.json({ success: true, message: 'Return request accepted and refund processed successfully.' });
        } else {
            res.status(400).json({ success: false, message: 'Refund process failed. Unsupported payment method.' });
        }
    } catch (error) {
        console.error('Error accepting return request:', error);
        res.status(500).json({ success: false, message: 'Error accepting return request.' });
    }
});


// New route for admin to reject a return request
router.post('/admin/reject-return/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        order.returnStatus = 'Rejected';
        order.returnRejectedDate = new Date();
        await order.save();
        res.json({ success: true, message: 'Return request rejected successfully.' });
    } catch (error) {
        console.error('Error rejecting return request:', error);
        res.status(500).json({ success: false, message: 'Error rejecting return request.' });
    }
});

module.exports = router;

