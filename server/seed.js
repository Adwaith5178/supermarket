const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // 1. CLEAR OLD DATA
    await Product.deleteMany({});
    console.log("Database cleared.");

    // 2. NEW DATA WITH ALL REQUIRED FIELDS
    const products = [
      { 
        name: "Fresh Milk 1L", 
        category: "Dairy",
        wholesalePrice: 40, // WAS MISSING
        basePrice: 50, 
        currentPrice: 50, 
        stockLevel: 100, 
        expiryDate: new Date("2026-06-01"), 
        salesVelocity: 85, 
        minPrice: 35, 
        maxPrice: 65,
        pricingMode: "Dynamic" 
      },
      { 
        name: "Cheddar Cheese", 
        category: "Dairy",
        wholesalePrice: 160, // WAS MISSING
        basePrice: 200, 
        currentPrice: 200, 
        stockLevel: 30, 
        expiryDate: new Date("2026-07-10"), 
        salesVelocity: 40, 
        minPrice: 180, 
        maxPrice: 280,
        pricingMode: "Festive" 
      },
      { 
        name: "Lamb Chops", 
        category: "Meat",
        wholesalePrice: 500, // WAS MISSING
        basePrice: 650, 
        currentPrice: 650, 
        stockLevel: 10, 
        expiryDate: new Date("2026-05-20"), 
        salesVelocity: 30, 
        minPrice: 550, 
        maxPrice: 900,
        pricingMode: "Festive" 
      }
    ];

    // 3. INSERT AND VERIFY
    const createdProducts = await Product.insertMany(products);
    console.log(`✅ Successfully inserted ${createdProducts.length} products!`);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ SEED ERROR:", err.message);
    process.exit(1);
  }
};

seedProducts();