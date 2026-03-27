const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const stringSimilarity = require('string-similarity'); 
const path = require('path');
const multer = require('multer'); // ADDED: For handling image uploads
require('dotenv').config();

const Product = require('./models/Product');
const User = require('./models/User');
const maniaRoutes = require('./routes/maniaRoutes');

const app = express();

// --- 1. MULTER CONFIGURATION ---
// This handles saving your JPG/PNG files to the 'uploads' folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this folder exists in your server root
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

// --- 2. MIDDLEWARE & SECURITY ---
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
// Serve the uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

// --- 3. ROUTES REGISTRATION ---
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

// --- AUTHENTICATION & SECURITY ROUTES ---
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
            role: role || 'customer',
            loyaltyPoints: 0 
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
                    user: { _id: user._id, username: user.username, role: user.role, email: user.email, loyaltyPoints: user.loyaltyPoints } 
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

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// --- PURCHASE & SALES LOGIC ---
app.post('/api/purchase', async (req, res) => {
  const { userId, cartItems, pointsEarned, pointsRedeemed } = req.body; 
  try {
    const updatePromises = cartItems.map(item => {
      const qty = item.selectedQuantity || 1;
      return Product.findByIdAndUpdate(item._id, {
        $inc: { 
            unitsSold: qty,
            stockLevel: -qty,
            salesVelocity: qty * 2
        }
      });
    });
    
    if (userId) {
        const netPoints = (pointsEarned || 0) - (pointsRedeemed || 0);
        await User.findByIdAndUpdate(userId, {
            $inc: { loyaltyPoints: netPoints }
        });
    }

    await Promise.all(updatePromises);
    res.status(200).json({ success: true, message: "Purchase completed and points updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCT MANAGEMENT & BULK UPDATE ---
app.post('/api/products/bulk-stock-update', async (req, res) => {
    const { updates } = req.body;
    try {
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: "Invalid updates format" });
        }

        const allProducts = await Product.find({}, 'name basePrice');
        const dbProductNames = allProducts.map(p => p.name);

        const bulkOps = updates.map(u => {
            const matches = stringSimilarity.findBestMatch(u.name, dbProductNames);
            if (matches.bestMatch.rating > 0.7) {
                const matchedProduct = allProducts.find(p => p.name === matches.bestMatch.target);
                
                return {
                    updateOne: {
                        filter: { name: matches.bestMatch.target },
                        update: { 
                            $set: { 
                                stockLevel: u.newStock,
                                currentPrice: matchedProduct.basePrice 
                            } 
                        }
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
        console.error("Bulk Update Error:", err);
        res.status(500).json({ error: "Internal server error during bulk update" });
    }
});

// --- NEW FULL BULK SYNC ROUTE FOR CSV UPLOADS ---
app.post('/api/products/bulk-sync', async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "No valid products provided." });
        }

        const bulkOperations = products.map((item) => {
            const base = parseFloat(item.basePrice) || 0;
            const min = item.minPrice || (base * 0.8); 
            const max = item.maxPrice || (base * 1.5); 

            return {
                updateOne: {
                    filter: { name: item.name }, // Matches by exact name
                    update: {
                        $set: {
                            name: item.name,
                            category: item.category || 'General',
                            wholesalePrice: parseFloat(item.wholesalePrice) || 0,
                            basePrice: base,
                            currentPrice: parseFloat(item.currentPrice) || base,
                            stockLevel: parseInt(item.stockLevel) || 0,
                            expiryDate: item.expiryDate ? new Date(item.expiryDate) : new Date(),
                            salesVelocity: parseInt(item.salesVelocity) || 50,
                            minPrice: min,
                            maxPrice: max,
                            
                            // Image
                            image: 'default-grocery.png', // Default image for CSV uploads

                            // Festive Strategy
                            isFestive: item.isFestive === 'true' || item.isFestive === true,
                            
                            // Points & Loyalty
                            pointsMultiplier: parseFloat(item.pointsMultiplier) || 1,
                            pointsPrice: parseFloat(item.pointsPrice) || 0
                        }
                    },
                    upsert: true // Creates the product if it doesn't already exist
                }
            };
        });

        const result = await Product.bulkWrite(bulkOperations);
        
        res.status(200).json({ 
            success: true, 
            message: `Successfully synced! ${result.upsertedCount} added, ${result.modifiedCount} updated.` 
        });

    } catch (error) {
        console.error('Bulk Sync Error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload', details: error.message });
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

// --- FIXED PRODUCT CREATE ROUTE ---
// Uses upload.single('image') to handle the file upload before saving to DB
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const productData = {
        ...req.body,
        wholesalePrice: req.body.wholesalePrice || 0,
        unitsSold: 0,
        isFestive: req.body.isFestive === 'true' || false, // FormData strings to Boolean
        festivalEndDate: req.body.festivalEndDate || null,
        // Use the filename generated by Multer, or fallback to default
        image: req.file ? req.file.filename : 'default-grocery.png' 
    };
    const newProduct = new Product(productData);
    await newProduct.save();
    res.json({ success: true, message: "Product added", product: newProduct });
  } catch (err) {
    console.error("Product Add Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- NEW: PRODUCT UPDATE ROUTE (Handles Edits) ---
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = { ...req.body };

        // Convert boolean strings to actual booleans if they come through FormData
        if (updateData.isFestive === 'true') updateData.isFestive = true;
        if (updateData.isFestive === 'false') updateData.isFestive = false;

        // If a new image was uploaded, overwrite the old image field
        if (req.file) {
            updateData.image = req.file.filename; 
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: 'Server Error during product update' });
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

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await Product.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Single Delete Error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.post('/api/products/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }

    const result = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} products deleted` });
  } catch (err) {
    console.error("Bulk Delete Error:", err);
    res.status(500).json({ error: "Failed to delete products" });
  }
});

// --- AI PRICING ENGINE ---
app.post('/api/update-prices', async (req, res) => {
    try {
        const products = await Product.find();
        const updatePromises = products.map((product) => {
            return new Promise((resolve) => {
                const python = spawn('py', ['dynamic_pricing.py', JSON.stringify(product)]);
                
                python.stdout.on('data', async (data) => {
                    try {
                        const result = JSON.parse(data.toString());
                        if (result.currentPrice !== undefined) {
                            await Product.findByIdAndUpdate(product._id, { 
                                currentPrice: result.currentPrice,
                                bulkPrice: result.bulkPrice, 
                                isTrending: result.isTrending 
                            });
                        }
                    } catch (parseErr) {
                        console.error("JSON Parse Error from Python:", parseErr);
                    }
                    resolve();
                });
                
                python.stderr.on('data', (data) => { 
                    console.error("Python Error:", data.toString());
                    resolve(); 
                });
            });
        });
        await Promise.all(updatePromises);
        res.json({ message: "Prices updated with Velocity and Volume logic" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTOMATED CLEANUP & MANIA SCHEDULER ---
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
    timezone: "Asia/Kolkata" 
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));