const { extractNumber, cleanText, extractWeightVolume } = require('../../utils');

/**
 * Functions to parse Vea's specific HTML structure into standardized product data
 */
async function parseProductDetails(page, selectors) {
  try {
    const productData = await page.evaluate((sel) => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : '';
      };

      const name = getTextContent(sel.product.name);
      const brand = getTextContent(sel.product.brand);
      const sku = getTextContent(sel.product.sku);

      const prices = {
        discountedPrice: getTextContent(sel.prices.discounted),
        originalPrice: getTextContent(sel.prices.original),
        pricePerUnit: getTextContent(sel.prices.perUnit),
        discount: getTextContent(sel.prices.discount)
      };

      const image = document.querySelector(sel.product.image);
      const imageUrl = image ? image.src : '';

      if (!name || !sku) {
        console.error('Missing required product data:', { name, sku });
        return null;
      }

      return {
        name,
        brand,
        sku,
        prices,
        image: imageUrl
      };
    }, selectors);

    if (!productData) {
      throw new Error('Failed to extract product data');
    }

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
  } catch (error) {
    console.error('Error parsing product details:', error.message);
    throw error;
  }
}

module.exports = { parseProductDetails };