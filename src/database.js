const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'products.db');

const db = new sqlite3.Database(dbPath);

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Crear tabla de productos
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        retailer_id TEXT NOT NULL,
        brand TEXT,
        weight_volume REAL,
        name TEXT NOT NULL,
        image_url TEXT,
        product_url TEXT
      )`);

      // Crear tabla de precios
      db.run(`CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        retailer_id TEXT NOT NULL,
        original_price REAL,
        discount_percentage REAL,
        discounted_price REAL,
        price_per_unit REAL,
        discount_conditions TEXT,
        date TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

async function saveProduct(productData) {
  const { product, price } = productData;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Comenzar transacción
      db.run('BEGIN TRANSACTION');

      try {
        // Insertar o actualizar producto
        db.run(`
          INSERT OR REPLACE INTO products (
            id, retailer_id, brand, weight_volume, name, image_url, product_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          product.id,
          product.retailer_id,
          product.brand,
          product.weight_volume,
          product.name,
          product.image_url,
          product.product_url
        ]);

        // Insertar nuevo precio
        db.run(`
          INSERT INTO prices (
            id, product_id, retailer_id, original_price, discount_percentage,
            discounted_price, price_per_unit, discount_conditions, date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))
        `, [
          `${price.product_id}_${Date.now()}`,
          price.product_id,
          price.retailer_id,
          price.original_price,
          price.discount_percentage,
          price.discounted_price,
          price.price_per_unit,
          price.discount_conditions
        ], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            db.run('COMMIT');
            resolve();
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

async function getRetailer(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM retailers WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function getProduct(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function getLatestPrice(productId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM prices WHERE product_id = ? ORDER BY date DESC LIMIT 1',
      [productId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

module.exports = {
  initializeDatabase,
  saveProduct,
  getRetailer,
  getProduct,
  getLatestPrice
};