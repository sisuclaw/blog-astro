const sharp = require('sharp');
const fs = require('fs');

// Read SVG
const svgBuffer = fs.readFileSync('./public/og-image.svg');

// Convert to WebP
sharp(svgBuffer)
  .resize(1200, 630)
  .webp({ quality: 90 })
  .toFile('./public/og-image.webp')
  .then(() => console.log('OG Image regenerated successfully!'))
  .catch(err => console.error('Error:', err));
