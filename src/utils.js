function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanUrl(url) {
  return url.split('#')[0].replace(/\/$/, '');
}

function extractNumber(text) {
  if (!text) return null;
  const match = text.replace(/\./g, '').match(/[\d,]+(?:\.\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

function extractWeightVolume(text) {
  if (!text) return null;

  // Buscar patrones como "100 gr", "1.5 kg", "750 ml", "1 l"
  const match = text.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(gr|g|kg|ml|l)\b/);
  if (!match) return null;

  let [, value, unit] = match;
  value = parseFloat(value.replace(',', '.'));

  // Convertir todo a gramos o mililitros
  switch (unit) {
    case 'kg':
      return value * 1000;
    case 'l':
      return value * 1000;
    default:
      return value;
  }
}

function cleanText(text) {
  return text ? text.trim().replace(/\s+/g, ' ') : null;
}

module.exports = {
  delay,
  cleanUrl,
  extractNumber,
  extractWeightVolume,
  cleanText
};