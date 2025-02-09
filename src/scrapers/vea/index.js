const BaseScraper = require('../base');
const SELECTORS = require('./selectors');
const { parseProductDetails } = require('./parser');
const { cleanUrl, delay } = require('../../utils');
const { saveProduct } = require('../../database');

class VeaScraper extends BaseScraper {
  constructor(maxPages = 100000, delayMs = 1000) {
    super('VEA', maxPages, delayMs);
    this.categories = [
      "https://www.vea.com.ar/almacen",
      "https://www.vea.com.ar/bebidas",
      "https://www.vea.com.ar/carnes",
      "https://www.vea.com.ar/lacteos",
      "https://www.vea.com.ar/perfumeria",
      "https://www.vea.com.ar/congelados",
      "https://www.vea.com.ar/limpieza",
      "https://www.vea.com.ar/panaderia-y-reposteria",
      "https://www.vea.com.ar/quesos-y-fiambres"
    ];
  }

  async scrapeCategory(page, url) {
    let currentPage = 1;
    let retries = 3;

    while (currentPage <= this.maxPages) {
      const pageUrl = `${url}?page=${currentPage}`;
      console.log(`Fetching: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        await this.autoScroll(page);

        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(el => el.href)
            .filter(link => link.includes('/p'));
        });

        if (links.length === 0) break;

        console.log(`Found ${links.length} products`);

        // Procesar cada producto inmediatamente
        for (const link of links) {
          const cleanedUrl = cleanUrl(link);
          if (!this.productLinks.has(cleanedUrl)) {
            this.productLinks.add(cleanedUrl);
            // Crear una nueva página para cada producto
            const productPage = await page.browser().newPage();
            try {
              const productData = await this.scrapeProductDetails(productPage, cleanedUrl);
              await this.saveProduct(productData);
              console.log(`Producto guardado: ${productData.product.id}`);
            } catch (error) {
              console.error(`Error al procesar producto ${cleanedUrl}:`, error);
            } finally {
              await productPage.close();
              await delay(this.delayMs); // Esperar entre productos
            }
          }
        }

        await delay(this.delayMs);
        currentPage++;
        retries = 3;
      } catch (e) {
        console.error(`Error fetching ${pageUrl}: ${e.message}`);
        if (--retries <= 0) break;
        await delay(this.delayMs * 2);
      }
    }
  }

  async scrapeProductDetails(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const productData = await parseProductDetails(page, SELECTORS);

    // Asegurarse de que todos los campos necesarios estén presentes
    if (productData && productData.product) {
      productData.product.retailer_id = this.retailerId;
      productData.product.product_url = url;
    }
    if (productData && productData.price) {
      productData.price.retailer_id = this.retailerId;
      productData.price.date = new Date().toISOString().split('T')[0];
    }

    return productData;
  }

  async scrapeCategoryPages(page) {
    for (const url of this.categories) {
      await this.scrapeCategory(page, url);
    }
  }

  async saveProduct(productData) {
    try {
      console.log('Guardando producto en la base de datos:', {
        id: productData.product.id,
        nombre: productData.product.name,
        precio: productData.price.discounted_price
      });
      await saveProduct(productData);
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      throw error;
    }
  }
}

module.exports = VeaScraper;