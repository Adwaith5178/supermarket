const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await Product.deleteMany({}); // Clear old data

    const products = [
      // DAIRY
      { name: "Fresh Milk 1L", basePrice: 50, currentPrice: 50, stockLevel: 100, expiryDate: new Date("2026-01-21"), category: "Dairy", salesVelocity: 85, minPrice: 30, maxPrice: 60 },
      { name: "Greek Yogurt", basePrice: 120, currentPrice: 120, stockLevel: 45, expiryDate: new Date("2026-01-25"), category: "Dairy", salesVelocity: 60, minPrice: 90, maxPrice: 140 },
      { name: "Cheddar Cheese", basePrice: 200, currentPrice: 200, stockLevel: 30, expiryDate: new Date("2026-02-10"), category: "Dairy", salesVelocity: 40, minPrice: 150, maxPrice: 250 },
      { name: "Amul Butter 500g", basePrice: 275, currentPrice: 275, stockLevel: 60, expiryDate: new Date("2026-03-01"), category: "Dairy", salesVelocity: 70, minPrice: 240, maxPrice: 300 },

      // BAKERY
      { name: "Wheat Bread", basePrice: 40, currentPrice: 40, stockLevel: 50, expiryDate: new Date("2026-01-22"), category: "Bakery", salesVelocity: 90, minPrice: 25, maxPrice: 50 },
      { name: "Chocolate Croissant", basePrice: 85, currentPrice: 85, stockLevel: 20, expiryDate: new Date("2026-01-19"), category: "Bakery", salesVelocity: 95, minPrice: 60, maxPrice: 100 },
      { name: "Blueberry Muffin", basePrice: 65, currentPrice: 65, stockLevel: 25, expiryDate: new Date("2026-01-20"), category: "Bakery", salesVelocity: 50, minPrice: 40, maxPrice: 80 },
      { name: "Baguette", basePrice: 55, currentPrice: 55, stockLevel: 15, expiryDate: new Date("2026-01-19"), category: "Bakery", salesVelocity: 80, minPrice: 35, maxPrice: 70 },

      // PRODUCE (Fruits/Veg)
      { name: "Organic Bananas", basePrice: 60, currentPrice: 60, stockLevel: 120, expiryDate: new Date("2026-01-20"), category: "Produce", salesVelocity: 95, minPrice: 30, maxPrice: 80 },
      { name: "Red Apples (1kg)", basePrice: 180, currentPrice: 180, stockLevel: 80, expiryDate: new Date("2026-02-05"), category: "Produce", salesVelocity: 55, minPrice: 140, maxPrice: 220 },
      { name: "Fresh Spinach", basePrice: 30, currentPrice: 30, stockLevel: 40, expiryDate: new Date("2026-01-19"), category: "Produce", salesVelocity: 88, minPrice: 15, maxPrice: 45 },
      { name: "Avocado", basePrice: 150, currentPrice: 150, stockLevel: 20, expiryDate: new Date("2026-01-23"), category: "Produce", salesVelocity: 40, minPrice: 100, maxPrice: 200 },

      // MEAT
      { name: "Chicken Breast 500g", basePrice: 250, currentPrice: 250, stockLevel: 25, expiryDate: new Date("2026-01-20"), category: "Meat", salesVelocity: 92, minPrice: 180, maxPrice: 300 },
      { name: "Lamb Chops", basePrice: 650, currentPrice: 650, stockLevel: 10, expiryDate: new Date("2026-01-21"), category: "Meat", salesVelocity: 30, minPrice: 500, maxPrice: 750 },
      { name: "Salmon Fillet", basePrice: 800, currentPrice: 800, stockLevel: 12, expiryDate: new Date("2026-01-19"), category: "Meat", salesVelocity: 45, minPrice: 600, maxPrice: 950 }
    ];

    await Product.insertMany(products);
    console.log("✅ Market Packed with Products!");
    process.exit();
  })
  .catch(err => console.log(err));