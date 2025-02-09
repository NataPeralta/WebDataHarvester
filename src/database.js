const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initializeDatabase() {
  if (db) return db;

  db = await open({
    filename: path.join(__dirname, '../data/products.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS retailers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      retailer_id TEXT NOT NULL,
      brand TEXT,
      weight_volume REAL,
      name TEXT,
      image_url TEXT,
      product_url TEXT,
      FOREIGN KEY (retailer_id) REFERENCES retailers(id)
    );

    CREATE TABLE IF NOT EXISTS prices (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      retailer_id TEXT,
      original_price REAL,
      discount_percentage REAL,
      discounted_price REAL,
      price_per_unit REAL,
      discount_conditions TEXT,
      date DATE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (retailer_id) REFERENCES retailers(id)
    );

    INSERT OR IGNORE INTO retailers (id, name, base_url) VALUES 
    ('VEA', 'Vea', 'https://www.vea.com.ar');
  `);

  return db;
}

async function saveProduct(productData) {
  const database = await initializeDatabase();
  const { product, price } = productData;

  try {
    // Insertar o actualizar el producto
    await database.run(
      `INSERT OR REPLACE INTO products (
        id, retailer_id, brand, weight_volume, name, image_url, product_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    await database.run(
      `INSERT INTO prices (
        id, product_id, retailer_id, original_price, discount_percentage,
        discounted_price, price_per_unit, discount_conditions, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))`,
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
    console.log(`Precio guardado exitosamente: ${price.product_id}`);
  } catch (error) {
    console.error('Error al guardar en la base de datos:', error);
    throw error;
  }
}

async function getRetailer(id) {
  const database = await initializeDatabase();
  return database.get('SELECT * FROM retailers WHERE id = ?', [id]);
}

async function getProduct(id) {
  const database = await initializeDatabase();
  return database.get('SELECT * FROM products WHERE id = ?', [id]);
}

async function getLatestPrice(productId) {
  const database = await initializeDatabase();
  return database.get(
    'SELECT * FROM prices WHERE product_id = ? ORDER BY date DESC LIMIT 1',
    [productId]
  );
}

module.exports = {
  initializeDatabase,
  saveProduct,
  getRetailer,
  getProduct,
  getLatestPrice
};