
PDFdocument = require('pdfkit');

function buildPDF(dataCallback, endCallback) {
    const doc = new PDFdocument();
    doc.on('data', dataCallback);
    doc.on('end', endCallback);  
    //doc.font('fonts/PalatinoBold.ttf');
    doc.fontSize(25);
    doc.text('Some text with an embedded font!', 100, 100);
    doc.end();
}

module.exports = {buildPDF};