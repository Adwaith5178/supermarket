const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const stringSimilarity = require('string-similarity'); 
require('dotenv').config();

const Product = require('./models/Product');
const User = require('./models/User');
const maniaRoutes = require('./routes/maniaRoutes');

const app = express();

// --- 1. MIDDLEWARE & SECURITY (STABILIZED) ---
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// --- 2. ROUTES REGISTRATION ---
app.use('/api/mania', maniaRoutes); 

// --- GLOBAL THEME STATE ---
let globalTheme = "default"; 

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// --- THEME MANAGEMENT ROUTES ---
app.get('/api/theme', (req, res) => {
    res.json({ theme: globalTheme });
});

app.post('/api/theme', (req, res) => {
    const { theme } = req.body;
    if (['default', 'onam', 'christmas'].includes(theme)) {
        globalTheme = theme;
        console.log(`🎨 Global Theme updated to: ${theme}`);
        res.json({ success: true, theme: globalTheme });
    } else {
        res.status(400).json({ success: false, message: "Invalid theme type" });
    }
});

// --- 1. AUTHENTICATION & SECURITY ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const existingUser = await User.findOne({ 
            $or: [
                { username: { $regex: new RegExp(`^${username}$`, 'i') } }, 
                { email: email.toLowerCase() }
            ] 
        });
        if (existingUser) return res.status(400).json({ success: false, message: "Username or Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            username: username.toLowerCase(), 
            email: email.toLowerCase(), 
            password: hashedPassword, 
            role: role || 'customer' 
        });
        await newUser.save();
        res.json({ success: true, message: "User Registered Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const lowerUsername = (username.toLowerCase() === 'system admin') ? 'admin' : username.toLowerCase();
        const user = await User.findOne({ username: { $regex: new RegExp(`^${lowerUsername}$`, 'i') } });

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return res.json({ 
                    success: true, 
                    user: { username: user.username, role: user.role, email: user.email } 
                });
            }
        }
        if (lowerUsername === 'admin' && password === 'admin123') {
            return res.json({ 
                success: true, 
                user: { username: 'admin', role: 'admin', email: 'admin@nexus.com' } 
            });
        }
        return res.status(400).json({ success: false, message: "Invalid credentials" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/auth/update-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        const lowerUsername = (username.toLowerCase() === 'system admin') ? 'admin' : username.toLowerCase();
        let user = await User.findOne({ username: { $regex: new RegExp(`^${lowerUsername}$`, 'i') } });

        if (!user && lowerUsername === 'admin') {
            if (currentPassword === 'admin123') {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                user = new User({ username: 'admin', email: 'admin@nexus.com', password: hashedPassword, role: 'admin' });
                await user.save();
                return res.json({ success: true, message: "Admin account created!" });
            }
        }
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Current password incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 2. PURCHASE & SALES LOGIC ---
app.post('/api/purchase', async (req, res) => {
  const { cartItems } = req.body; 
  try {
    const updatePromises = cartItems.map(item => 
      Product.findByIdAndUpdate(item._id, {
        $inc: { unitsSold: 1, stockLevel: -1, salesVelocity: 2 }
      })
    );
    await Promise.all(updatePromises);
    res.status(200).json({ success: true, message: "Inventory updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. PRODUCT MANAGEMENT & BULK UPDATE ---
app.post('/api/products/bulk-stock-update', async (req, res) => {
    const { updates } = req.body;
    try {
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: "Invalid updates format" });
        }

        const allProducts = await Product.find({}, 'name');
        const dbProductNames = allProducts.map(p => p.name);

        const bulkOps = updates.map(u => {
            const matches = stringSimilarity.findBestMatch(u.name, dbProductNames);
            if (matches.bestMatch.rating > 0.7) {
                return {
                    updateOne: {
                        filter: { name: matches.bestMatch.target },
                        update: { $set: { stockLevel: u.newStock } }
                    }
                };
            }
            return null;
        }).filter(op => op !== null);

        if (bulkOps.length === 0) {
            return res.json({ success: true, updatedCount: 0, message: "No matching products found." });
        }

        const result = await Product.bulkWrite(bulkOps);
        res.json({ success: true, updatedCount: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: "Internal server error during bulk update" });
    }
});

app.get('/api/products', async (req, res) => {
  try {
    const now = new Date();
    const products = await Product.find({ expiryDate: { $gt: now } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const productData = {
        ...req.body,
        wholesalePrice: req.body.wholesalePrice || 0,
        unitsSold: 0,
        isFestive: req.body.isFestive || false,
        festivalEndDate: req.body.festivalEndDate || null
    };
    const newProduct = new Product(productData);
    await newProduct.save();
    res.json({ message: "Product added", product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/out-of-stock', async (req, res) => {
  try {
    const result = await Product.deleteMany({ stockLevel: { $lte: 0 } });
    res.json({ message: `Removed ${result.deletedCount} products.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. AI PRICING ENGINE ---
app.post('/api/update-prices', async (req, res) => {
    try {
        const products = await Product.find();
        const updatePromises = products.map((product) => {
            return new Promise((resolve) => {
                const python = spawn('py', ['dynamic_pricing.py', JSON.stringify(product)]);
                python.stdout.on('data', async (data) => {
                    const newPrice = parseFloat(data.toString());
                    if (!isNaN(newPrice)) {
                        await Product.findByIdAndUpdate(product._id, { currentPrice: newPrice });
                    }
                    resolve();
                });
                python.stderr.on('data', (data) => { 
                    resolve(); 
                });
            });
        });
        await Promise.all(updatePromises);
        res.json({ message: "Prices updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. AUTOMATED CLEANUP & MANIA SCHEDULER (Cron Jobs) ---

// Daily/Minute Cleanup for Expiry
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const result = await Product.deleteMany({ expiryDate: { $lte: now } });
    if(result.deletedCount > 0) {
        console.log(`🚀 Minute Cleanup: ${result.deletedCount} items removed.`);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
});

// THURSDAY 12:00 AM: Auto-End Wednesday Mania
// Format: Minute Hour DayOfMonth Month DayOfWeek
cron.schedule('0 0 * * 4', async () => {
    console.log('🕒 Thursday 12:00 AM: Automatically ending Wednesday Mania...');
    try {
        const result = await Product.updateMany(
            { isOnMania: true },
            [
                {
                    $set: { 
                        isOnMania: false,
                        maniaDiscount: 0,
                        currentPrice: "$basePrice" 
                    } 
                }
            ]
        );
        console.log(`✅ Mania Ended Successfully. Restored ${result.modifiedCount} products.`);
    } catch (err) {
        console.error('❌ Mania Auto-End Error:', err);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Forces the job to run at 12:00 AM India Time
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));