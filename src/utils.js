function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanUrl(url) {
  return url.split('#')[0].replace(/\/$/, '');
}

function extractNumber(text) {
  if (!text) return null;
  const match = text.replace(/\./g, '').match(/\d+(?:,\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

function cleanText(text) {
  return text ? text.trim().replace(/\s+/g, ' ') : null;
}

module.exports = {
  delay,
  cleanUrl,
  extractNumber,
  cleanText
};
