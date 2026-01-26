const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String },
    wholesalePrice: { type: Number, required: true }, // Added: Cost Price from Wholesaler
    basePrice: { type: Number, required: true },      // Original Retail Price
    currentPrice: { type: Number },
    stockLevel: { type: Number, required: true },
    unitsSold: { type: Number, default: 0 },         // Added: Tracked for profit calculation
    expiryDate: { type: Date, required: true },
    salesVelocity: { type: Number, default: 0 },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true }
});

module.exports = mongoose.model('Product', ProductSchema);