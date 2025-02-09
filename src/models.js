/**
 * Models with TypeScript-like documentation
 * for better code clarity and data validation
 */

/**
 * @typedef {Object} Retailer 
 * @property {string} id - Unique identifier for the retailer
 * @property {string} name - Name of the retailer (e.g., "Vea")
 * @property {string} base_url - Base URL of the retailer's website
 */

/**
 * @typedef {Object} Product
 * @property {string} id - SKU/unique identifier
 * @property {string} retailer_id - ID of the retailer selling this product
 * @property {string} brand - Product brand name
 * @property {number|null} weight_volume - Weight/volume in standard units
 * @property {string} name - Complete product name
 * @property {string} image_url - URL to product image
 * @property {string} product_url - Product page URL
 */

/**
 * @typedef {Object} Price
 * @property {string} id - Unique price record identifier
 * @property {string} product_id - Reference to product SKU
 * @property {string} retailer_id - ID of the retailer
 * @property {number|null} original_price - Original price
 * @property {number|null} discount_percentage - Discount percentage
 * @property {number|null} discounted_price - Price after discount
 * @property {number|null} price_per_unit - Price per unit (kg/liter)
 * @property {string|null} discount_conditions - Discount conditions/description
 * @property {string} date - Date of price record
 */

/**
 * @typedef {Object} ProductData
 * @property {Product} product - Product information
 * @property {Price} price - Price information
 */

function validateRetailer(retailer) {
    return !!(
        retailer &&
        typeof retailer.id === 'string' &&
        typeof retailer.name === 'string' &&
        typeof retailer.base_url === 'string'
    );
}

function validateProduct(product) {
    return !!(
        product &&
        typeof product.id === 'string' &&
        typeof product.retailer_id === 'string' &&
        typeof product.brand === 'string' &&
        (product.weight_volume === null || typeof product.weight_volume === 'number') &&
        typeof product.name === 'string' &&
        typeof product.image_url === 'string' &&
        typeof product.product_url === 'string'
    );
}

function validatePrice(price) {
    return !!(
        price &&
        typeof price.product_id === 'string' &&
        typeof price.retailer_id === 'string' &&
        (price.original_price === null || typeof price.original_price === 'number') &&
        (price.discount_percentage === null || typeof price.discount_percentage === 'number') &&
        (price.discounted_price === null || typeof price.discounted_price === 'number') &&
        (price.price_per_unit === null || typeof price.price_per_unit === 'number') &&
        (price.discount_conditions === null || typeof price.discount_conditions === 'string')
    );
}

function createEmptyProduct(retailerId) {
    return {
        id: '',
        retailer_id: retailerId,
        brand: '',
        weight_volume: null,
        name: '',
        image_url: '',
        product_url: ''
    };
}

function createEmptyPrice(productId, retailerId) {
    return {
        id: `${productId}_${Date.now()}`,
        product_id: productId,
        retailer_id: retailerId,
        original_price: null,
        discount_percentage: null,
        discounted_price: null,
        price_per_unit: null,
        discount_conditions: null,
        date: new Date().toISOString().split('T')[0]
    };
}

module.exports = {
    validateRetailer,
    validateProduct,
    validatePrice,
    createEmptyProduct,
    createEmptyPrice
};