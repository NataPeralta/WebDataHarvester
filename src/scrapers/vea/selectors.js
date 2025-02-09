/**
 * Selectors for Vea's website HTML elements
 */
const SELECTORS = {
  // Product list page selectors
  productLinks: 'a[href*="/p"]',
  productLinkFilter: (href) => href.endsWith('/p'),

  // Product detail page selectors
  product: {
    name: '.vtex-store-components-3-x-productNameContainer',
    brand: '.vtex-store-components-3-x-productBrand',
    sku: '.vtex-product-identifier-0-x-product-identifier__value',
    image: '.vtex-store-components-3-x-productImageTag'
  },

  prices: {
    discounted: '#priceContainer',
    original: '.veaargentina-store-theme-2t-mVsKNpKjmCAEM_AMCQH',
    perUnit: '.veaargentina-store-theme-1QiyQadHj-1_x9js9EXUYK',
    discount: '.veaargentina-store-theme-SpFtPOZlANEkxX04GqL31'
  }
};

module.exports = SELECTORS;