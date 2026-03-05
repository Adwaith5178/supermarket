// server/routes/maniaRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // NEW: For email blasts
const Product = require('../models/Product'); 
const User = require('../models/User'); // NEW: To fetch registered emails

// 1. Setup the Email Transporter using credentials from .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'adwaithk394@gmail.com',

        pass: 'kqlwmvoeftpq iaqw'
    }
});

// Route to activate the Mania offer
router.post('/activate', async (req, res) => {
    const { productIds, discount } = req.body;
    try {
        // --- EXISTING LOGIC: Update Products ---
        await Product.updateMany(
            { _id: { $in: productIds } },
            { 
                $set: { 
                    isOnMania: true, 
                    maniaDiscount: discount,
                    maniaActivatedAt: new Date() 
                } 
            }
        );

        // --- NEW LOGIC: Send Email to Registered Users ---
        const users = await User.find({}, 'email'); // Fetch all user emails
        const emailList = users.map(user => user.email);

        if (emailList.length > 0) {
            const mailOptions = {
                from: `"FreshMart" <${process.env.EMAIL_USER}>`,
                bcc: emailList, // BCC prevents users from seeing each other's emails
                subject: '🔥 Daily MANIA IS LIVE!',
                html: `
                    <div style="font-family: Arial, sans-serif; text-align: center; border: 2px solid #ff4757; padding: 20px; border-radius: 15px;">
                        <h1 style="color: #ff4757;">🔥 Daily MANIA!</h1>
                        <p style="font-size: 1.1rem;">Huge discounts are now active on your favorite items!</p>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 15px 0;">
                            <h2 style="margin: 0; color: #2d3436;">${discount}% OFF SELECTED PRODUCTS</h2>
                            <p>Offer valid for 24 hours only.</p>
                        </div>
                        <a href="http://localhost:5173" style="background: #ff4757; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            SHOP DEALS NOW
                        </a>
                    </div>
                `
            };

            // Send in background to prevent the "Server Connection Failed" timeout error
            transporter.sendMail(mailOptions).catch(err => console.error("Email Blast Error:", err));
        }

        res.status(200).json({ message: "Wednesday Mania activated and notifications sent!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to manually end Mania (if needed)
router.post('/deactivate', async (req, res) => {
    try {
        await Product.updateMany({}, { $set: { isOnMania: false } });
        res.status(200).json({ message: "All offers cleared." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;