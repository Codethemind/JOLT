const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const paymentRouter = require('./router/paymentRouter');
app.use('/payments', paymentRouter);

// ... rest of your app configuration
