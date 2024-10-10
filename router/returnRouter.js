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

// Update the admin accept return route
router.post('/admin/accept-return/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        order.returnStatus = 'Accepted';
        order.returnAcceptedDate = new Date();

        // Process refund to wallet
        const wallet = await Wallet.findOne({ userId: order.user });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found.' });
        }

        wallet.balance += order.totalAmount;
        wallet.transactions.push({
            amount: order.totalAmount,
            type: 'Credit',
            description: `Refund for order ${order.orderId}`,
            date: new Date()
        });

        await Promise.all([order.save(), wallet.save()]);
        res.json({ success: true, message: 'Return request accepted and refund processed successfully.' });
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

