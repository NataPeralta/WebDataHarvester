const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'products.db');

// Crear el objeto de base de datos
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
        product_url TEXT UNIQUE
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
      )`);

      // Crear índice para búsqueda rápida por URL
      db.run(`CREATE INDEX IF NOT EXISTS idx_product_url ON products(product_url)`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(date, product_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

async function getProductByUrl(url) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM products WHERE product_url = ?', [url], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function getPriceForDate(productId, date) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM prices WHERE product_id = ? AND date = ?',
      [productId, date],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function saveProduct(productData) {
  const { product, price } = productData;
  const today = new Date().toISOString().split('T')[0];

  return new Promise(async (resolve, reject) => {
    try {
      // Verificar si el producto ya existe
      const existingProduct = await getProductByUrl(product.product_url);

      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');

        try {
          // Si el producto no existe, insertarlo
          if (!existingProduct) {
            console.log('Insertando nuevo producto:', product.id);
            db.run(`
              INSERT INTO products (
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
          }

          // Verificar si ya existe un precio para hoy
          const existingPrice = await getPriceForDate(
            existingProduct ? existingProduct.id : product.id,
            today
          );

          if (!existingPrice) {
            console.log('Insertando nuevo precio para el día:', today);
            // Insertar nuevo precio solo si no existe uno para hoy
            db.run(`
              INSERT INTO prices (
                id, product_id, retailer_id, original_price, discount_percentage,
                discounted_price, price_per_unit, discount_conditions, date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              `${price.product_id}_${Date.now()}`,
              existingProduct ? existingProduct.id : product.id,
              price.retailer_id,
              price.original_price,
              price.discount_percentage,
              price.discounted_price,
              price.price_per_unit,
              price.discount_conditions,
              today
            ], (err) => {
              if (err) {
                console.error('Error al insertar precio:', err);
                db.run('ROLLBACK');
                reject(err);
              } else {
                db.run('COMMIT');
                resolve();
              }
            });
          } else {
            console.log('Ya existe un precio para hoy, omitiendo actualización');
            db.run('COMMIT');
            resolve();
          }
        } catch (error) {
          console.error('Error en la transacción:', error);
          db.run('ROLLBACK');
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error al verificar producto existente:', error);
      reject(error);
    }
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
  getProduct,
  getLatestPrice,
  getProductByUrl
};