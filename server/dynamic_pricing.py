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
        
        # --- 1. Parse Dates with Safety Checks ---
        expiry_raw = product.get('expiryDate')
        # If expiry is missing, we can't calculate discount, so return base
        if not expiry_raw or not isinstance(expiry_raw, str):
            print(round(base_price, 2))
            return

        expiry_date = datetime.strptime(expiry_raw.split('T')[0], '%Y-%m-%d')
        
        # Get festival date - safely check if it's a string before splitting
        fest_end_str = product.get('festivalEndDate')
        today = datetime.now()

        # --- 2. Festive Hike Logic ---
        hike_multiplier = 1.0
        if fest_end_str and isinstance(fest_end_str, str):
            fest_end = datetime.strptime(fest_end_str.split('T')[0], '%Y-%m-%d')
            if today <= fest_end:
                hike_multiplier = 1.30 # 30% Hike

        # --- 3. Discount Logic ---
        days_left = (expiry_date - today).days
        
        # Calculate Expiry Discount
        time_discount = 1.0
        if days_left <= 3:
            time_discount = 0.70  # 30% OFF
        elif days_left <= 10:
            time_discount = 0.90  # 10% OFF

        # Calculate Stock Discount
        stock_discount = 1.0
        if 0 < stock_level <= 5:
            stock_discount = 0.90 # 10% OFF

        # Use the lowest discount available
        final_discount = min(time_discount, stock_discount)

        # --- 4. Final Calculation ---
        new_price = base_price * hike_multiplier * final_discount

        # Print ONLY the number so Node.js can parse it
        print(round(new_price, 2))
        
    except Exception as e:
        # Log the error to stderr and fallback to base_price so the server doesn't hang
        sys.stderr.write(f"Error: {str(e)}")
        # Try to print the base price as a fallback if everything fails
        try:
            p = json.loads(sys.argv[1])
            print(p.get('basePrice', 0))
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    calculate_price()