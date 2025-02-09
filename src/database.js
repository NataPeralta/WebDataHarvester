const { query } = require('./db');

async function initializeDatabase() {
  // Las tablas ya se crearon usando execute_sql_tool
  return true;
}

async function saveProduct(productData) {
  const { product, price } = productData;

  try {
    // Insertar o actualizar el producto
    await query(
      `INSERT INTO products (
        id, retailer_id, brand, weight_volume, name, image_url, product_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        brand = EXCLUDED.brand,
        weight_volume = EXCLUDED.weight_volume,
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        product_url = EXCLUDED.product_url`,
      [
        product.id,
        product.retailer_id,
        product.brand,
        product.weight_volume,
        product.name,
        product.image_url,
        product.product_url
      ]
    );

    // Insertar el nuevo precio
    await query(
      `INSERT INTO prices (
        id, product_id, retailer_id, original_price, discount_percentage,
        discounted_price, price_per_unit, discount_conditions, date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)`,
      [
        `${price.product_id}_${Date.now()}`,
        price.product_id,
        price.retailer_id,
        price.original_price,
        price.discount_percentage,
        price.discounted_price,
        price.price_per_unit,
        price.discount_conditions
      ]
    );

    console.log(`Producto guardado exitosamente: ${product.id}`);
  } catch (error) {
    console.error('Error al guardar en la base de datos:', error);
    throw error;
  }
}

async function getRetailer(id) {
  const result = await query('SELECT * FROM retailers WHERE id = $1', [id]);
  return result.rows[0];
}

async function getProduct(id) {
  const result = await query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0];
}

async function getLatestPrice(productId) {
  const result = await query(
    'SELECT * FROM prices WHERE product_id = $1 ORDER BY date DESC LIMIT 1',
    [productId]
  );
  return result.rows[0];
}

module.exports = {
  initializeDatabase,
  saveProduct,
  getRetailer,
  getProduct,
  getLatestPrice
};