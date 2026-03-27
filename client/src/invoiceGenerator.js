import { jsPDF } from 'jspdf';

export const generateInvoice = (cartItems, totalAmount, totalSavings, orderId, pointsEarned = 0, pointsRedeemed = 0) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 160] // Slightly increased height to accommodate new point fields
  });

  const date = new Date().toLocaleString();

  // --- Header ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("FRESHMART SUPERMARKET", 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("Near Tech Park, Kochi, Kerala", 40, 15, { align: 'center' });
  doc.text(`Date: ${date}`, 5, 22);
  doc.text(`Order ID: ${orderId.slice(-8).toUpperCase()}`, 5, 26);
  doc.line(5, 28, 75, 28); // Horizontal Line

  // --- Table Headers ---
  doc.setFont(undefined, 'bold');
  doc.text("Item", 5, 33);
  doc.text("Qty", 45, 33);
  doc.text("Price", 75, 33, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.line(5, 35, 75, 35);

  // --- Items List ---
  let yPos = 40;
  cartItems.forEach((item) => {
    // Check for bulk discount logic (5 or more items = 5% off)
    const hasDiscount = item.selectedQuantity >= 5;
    const discountMultiplier = hasDiscount ? 0.95 : 1;
    const itemTotal = (item.currentPrice * discountMultiplier) * item.selectedQuantity;

    doc.text(item.name.substring(0, 20), 5, yPos);
    doc.text(item.selectedQuantity.toString(), 45, yPos);
    doc.text(`Rs.${itemTotal.toFixed(2)}`, 75, yPos, { align: 'right' });
    
    // Add a small "Bulk Discount" label under the item if applied
    if (hasDiscount) {
      yPos += 4;
      doc.setFontSize(6);
      doc.text("(5% Bulk Discount Applied)", 5, yPos);
      doc.setFontSize(8);
    }

    yPos += 5;
  });

  // --- Footer ---
  doc.line(5, yPos + 2, 75, yPos + 2);
  
  // Show Savings Row if any
  if (totalSavings > 0) {
    doc.setFont(undefined, 'normal');
    doc.text("SAVINGS:", 5, yPos + 7);
    doc.text(`-Rs.${totalSavings.toFixed(2)}`, 75, yPos + 7, { align: 'right' });
    yPos += 6;
  }

  // --- NEW: LOYALTY POINTS REDEEMED (DISCOUNT) ---
  if (pointsRedeemed > 0) {
    doc.setFont(undefined, 'normal');
    doc.text("POINTS USED:", 5, yPos + 7);
    doc.text(`-Rs.${pointsRedeemed.toFixed(2)}`, 75, yPos + 7, { align: 'right' });
    yPos += 6;
  }

  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text("TOTAL:", 5, yPos + 8);
  doc.text(`Rs.${totalAmount.toFixed(2)}`, 75, yPos + 8, { align: 'right' });
  
  // --- NEW: LOYALTY POINTS EARNED SECTION ---
  yPos += 15;
  doc.line(10, yPos, 70, yPos, "FD"); // Small decorative line
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text("LOYALTY SUMMARY", 40, yPos + 4, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text(`Points earned this visit: ${pointsEarned}`, 40, yPos + 8, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont(undefined, 'italic');
  doc.text("Thank you for shopping with us!", 40, yPos + 16, { align: 'center' });
  doc.text("Visit again!", 40, yPos + 19, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${orderId.slice(-5)}.pdf`);
};