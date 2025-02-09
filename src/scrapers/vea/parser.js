const { extractNumber, cleanText, extractWeightVolume } = require('../../utils');

/**
 * Functions to parse Vea's specific HTML structure into standardized product data
 */
async function parseProductDetails(page, selectors) {
  const productData = await page.evaluate((sel) => {
    const getName = () => {
      const nameEl = document.querySelector(sel.name);
      return nameEl ? nameEl.textContent.trim() : '';
    };

    const getBrand = () => {
      const brandEl = document.querySelector(sel.brand);
      return brandEl ? brandEl.textContent.trim() : '';
    };

    const getSku = () => {
      const skuEl = document.querySelector(sel.sku);
      return skuEl ? skuEl.textContent.trim() : '';
    };

    const getPrices = () => {
      const discountedPrice = document.querySelector(sel.prices.discounted);
      const originalPrice = document.querySelector(sel.prices.original);
      const pricePerUnit = document.querySelector(sel.prices.perUnit);
      const discountEl = document.querySelector(sel.prices.discount);

      return {
        discountedPrice: discountedPrice ? discountedPrice.textContent : '',
        originalPrice: originalPrice ? originalPrice.textContent : '',
        pricePerUnit: pricePerUnit ? pricePerUnit.textContent : '',
        discount: discountEl ? discountEl.textContent : ''
      };
    };

    const getImage = () => {
      const imgEl = document.querySelector(sel.image);
      return imgEl ? imgEl.src : '';
    };

    return {
      name: getName(),
      brand: getBrand(),
      sku: getSku(),
      prices: getPrices(),
      image: getImage()
    };
  }, selectors);

  // Extraer peso/volumen del nombre del producto
  const weight_volume = extractWeightVolume(productData.name);

  return {
    product: {
      id: productData.sku,
      brand: productData.brand,
      weight_volume: weight_volume,
      name: productData.name,
      image_url: productData.image
    },
    price: {
      product_id: productData.sku,
      original_price: extractNumber(productData.prices.originalPrice),
      discount_percentage: extractNumber(productData.prices.discount),
      discounted_price: extractNumber(productData.prices.discountedPrice),
      price_per_unit: extractNumber(productData.prices.pricePerUnit),
      discount_conditions: cleanText(productData.prices.discount)
    }
  };
}

module.exports = { parseProductDetails };