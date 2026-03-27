import sys
import json
from datetime import datetime

def calculate_price():
    try:
        if len(sys.argv) < 2:
            return

        product = json.loads(sys.argv[1])
        base_price = product.get('basePrice', 0)
        stock_level = product.get('stockLevel', 100)
        # NEW: Fetch unitsSold for Velocity logic (defaults to 0)
        units_sold = product.get('unitsSold', 0)
        
        # --- 1. Parse Dates with Safety Checks ---
        expiry_raw = product.get('expiryDate')
        if not expiry_raw or not isinstance(expiry_raw, str):
            print(round(base_price, 2))
            return

        expiry_date = datetime.strptime(expiry_raw.split('T')[0], '%Y-%m-%d')
        fest_end_str = product.get('festivalEndDate')
        today = datetime.now()

        # --- 2. Festive Hike Logic ---
        hike_multiplier = 1.0
        if fest_end_str and isinstance(fest_end_str, str):
            fest_end = datetime.strptime(fest_end_str.split('T')[0], '%Y-%m-%d')
            if today <= fest_end:
                hike_multiplier = 1.30 # 30% Hike

        # --- NEW: Sales Velocity Hike ---
        # If an item is selling fast (e.g., more than 50 units sold), hike price by 15%
        velocity_multiplier = 1.0
        if units_sold > 10:
            velocity_multiplier = 1.15

        # --- 3. Discount Logic ---
        days_left = (expiry_date - today).days
        
        # Calculate Expiry Discount
        time_discount = 1.0
        if days_left <= 5:
            time_discount = 0.70  # 30% OFF
        elif days_left <= 15:
            time_discount = 0.90  # 10% OFF

        # Calculate Stock Discount
        stock_discount = 1.0
        if 0 < stock_level <= 10:
            stock_discount = 0.90 # 10% OFF

        # NEW: The Restock Reset 
        # If stock is healthy (> 10) AND not expiring soon, ignore discounts
        if stock_level > 10 and days_left > 15:
            final_discount = 1.0
        else:
            final_discount = min(time_discount, stock_discount)

        # --- 4. Final Calculation (Standard Price) ---
        # Included the new velocity_multiplier here
        new_price = base_price * hike_multiplier * velocity_multiplier * final_discount

        # --- NEW: Volume Discount Calculation ---
        # If stock is available, calculate a 'Bulk Price' (5% off if buying 5+ units)
        # This is sent back so the UI can show "Buy 5+ for ₹..."
        bulk_price = new_price * 0.95 if stock_level >= 5 else new_price

        # --- 5. Output ---
        # We wrap the results in a JSON object so Node.js can read multiple values
        output = {
            "currentPrice": round(new_price, 2),
            "bulkPrice": round(bulk_price, 2),
            "isTrending": units_sold > 50
        }
        
        # Print the JSON string for Node.js to parse
        print(json.dumps(output))
        
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}")
        try:
            p = json.loads(sys.argv[1])
            # Fallback output structure
            fallback = {"currentPrice": p.get('basePrice', 0), "bulkPrice": p.get('basePrice', 0), "isTrending": False}
            print(json.dumps(fallback))
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    calculate_price()