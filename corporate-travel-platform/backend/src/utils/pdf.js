// Streams a branded expense summary PDF straight to the HTTP response using
// pdfkit (pure JS, no native dependencies).
const PDFDocument = require('pdfkit');

function streamExpensePdf(res, { companyName, generatedAt, bookings }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="expense-summary-${companyName.replace(/\s+/g, '-').toLowerCase()}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fillColor('#1a1a2e').fontSize(20).font('Helvetica-Bold').text('Corporate Travel Expense Summary', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(12).font('Helvetica').fillColor('#444').text(companyName);
  doc.fontSize(9).fillColor('#888').text(`Generated ${generatedAt}`);
  doc.moveDown(1);

  const total = bookings.reduce((sum, b) => sum + b.price, 0);
  doc.fontSize(11).fillColor('#1a1a2e').font('Helvetica-Bold').text(`Total spend: $${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  doc.fontSize(11).font('Helvetica').fillColor('#1a1a2e').text(`Itineraries: ${bookings.length}`);
  doc.moveDown(1);

  const colX = { date: 50, traveler: 120, route: 250, cabin: 340, status: 410, price: 480 };
  const headerY = doc.y;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e');
  doc.text('Date', colX.date, headerY);
  doc.text('Traveler', colX.traveler, headerY);
  doc.text('Route', colX.route, headerY);
  doc.text('Cabin', colX.cabin, headerY);
  doc.text('Status', colX.status, headerY);
  doc.text('Price', colX.price, headerY);
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#c9a227').stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(9).fillColor('#333');
  bookings.forEach((booking) => {
    const y = doc.y;
    if (y > 760) doc.addPage();
    const rowY = doc.y;
    doc.text(booking.depart_date, colX.date, rowY, { width: 65 });
    doc.text(booking.traveler_name, colX.traveler, rowY, { width: 125 });
    doc.text(`${booking.origin} → ${booking.destination}`, colX.route, rowY, { width: 85 });
    doc.text(booking.cabin_class, colX.cabin, rowY, { width: 65 });
    doc.text(booking.status, colX.status, rowY, { width: 65 });
    doc.text(`$${booking.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, colX.price, rowY, { width: 65 });
    doc.moveDown(0.6);
  });

  doc.end();
}

module.exports = { streamExpensePdf };
