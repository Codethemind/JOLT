const Order = require('../models/ordercollection'); // Assuming you have an Order model
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


exports.generateSalesReport = async (req, res) => {
    console.log('Generating sales report');
    
    try {
        const { startDate, endDate, reportType } = req.body;
        console.log('Report parameters:', { startDate, endDate, reportType });

        // Validate startDate and endDate
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set end date to end of day

        console.log('Date range:', { start, end });

        // Check if the dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid start or end date' });
        }
        
        // Query orders based on the valid date range
        const orders = await Order.find({
            placedAt: { $gte: start, $lte: end }
        }).populate('user', 'username email')
          .populate('items.product', 'name category')
          .sort({ placedAt: -1 }); // Sort by placedAt in descending order

        console.log('Orders found:', orders.length);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for the specified date range' });
        }
        
        // Calculate report data
        const reportData = calculateReportData(orders);
        
        // Get recent orders (last 5 orders)
        const recentOrders = orders.slice(0, 5).map(order => ({
            orderId: order.orderId,
            date: order.placedAt.toISOString().split('T')[0],
            status: order.orderStatus
        }));
        
        reportData.recentOrders = recentOrders;
        
        console.log('Calculated report data:', reportData);

        // Generate report based on type
        if (reportType === 'pdf') {
            const pdfBuffer = await generatePDFReport(reportData);
            res.contentType('application/pdf');
            return res.send(pdfBuffer);
        } else if (reportType === 'excel') {
            const excelBuffer = await generateExcelReport(reportData);
            res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(excelBuffer);
        } else {
            return res.json(reportData);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'An error occurred while generating the report', details: error.message });
    }
};

function calculateReportData(orders) {
    let originalTotal = 0;
    let afterOfferTotal = 0;
    let totalCouponDiscount = 0;
    let finalTotal = 0;

    orders.forEach(order => {
        const originalOrderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const afterOfferOrderTotal = order.items.reduce((sum, item) => sum + (item.discount_price * item.quantity), 0);
        
        originalTotal += originalOrderTotal;
        afterOfferTotal += afterOfferOrderTotal;
        totalCouponDiscount += (afterOfferOrderTotal - order.totalAmount) || 0;
        finalTotal += order.totalAmount;
    });

    return {
        totalOrders: orders.length,
        originalTotal,
        offerDiscount: originalTotal - afterOfferTotal,
        afterOfferTotal,
        totalCouponDiscount,
        finalTotal
    };
}

function generatePDFReport(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.fontSize(18).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Total Orders: ${data.totalOrders}`);
        doc.text(`Original Total: $${data.originalTotal.toFixed(2)}`);
        doc.text(`Offer Discount: $${data.offerDiscount.toFixed(2)}`);
        doc.text(`Total After Offers: $${data.afterOfferTotal.toFixed(2)}`);
        doc.text(`Coupon Discount: $${data.totalCouponDiscount.toFixed(2)}`);
        doc.text(`Final Total: $${data.finalTotal.toFixed(2)}`);

        doc.end();
    });
}

async function generateExcelReport(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 15 }
    ];

    worksheet.addRows([
        { metric: 'Total Orders', value: data.totalOrders },
        { metric: 'Original Total', value: data.originalTotal },
        { metric: 'Offer Discount', value: data.offerDiscount },
        { metric: 'Total After Offers', value: data.afterOfferTotal },
        { metric: 'Coupon Discount', value: data.totalCouponDiscount },
        { metric: 'Final Total', value: data.finalTotal }
    ]);

    return await workbook.xlsx.writeBuffer();
}
