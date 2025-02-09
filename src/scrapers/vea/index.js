const BaseScraper = require('../base');
const SELECTORS = require('./selectors');
const { parseProductDetails } = require('./parser');
const { cleanUrl, delay } = require('../../utils');
const { saveProduct, getProductByUrl } = require('../../database');

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
    this.processedUrls = new Set();
  }

  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  isValidProductUrl(url) {
    try {
      const urlObj = new URL(url);

      // Verificar que sea un dominio de Vea
      if (!urlObj.hostname.endsWith('vea.com.ar')) {
        console.log('URL no pertenece a vea.com.ar:', url);
        return false;
      }

      // Verificar que termine exactamente en /p
      if (!urlObj.pathname.endsWith('/p')) {
        console.log('URL no termina en /p:', url);
        return false;
      }

      // Lista de patrones de URLs inválidas
      const invalidPatterns = [
        'politica-de-privacidad',
        'defensadelconsumidor',
        'conoce-tus-derechos',
        'tarjetacencosud',
        'argentina.gob.ar'
      ];

      // Si la URL contiene alguno de los patrones inválidos, no es un producto
      if (invalidPatterns.some(pattern => url.includes(pattern))) {
        console.log('URL contiene patrón inválido:', url);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error al validar URL:', url, e.message);
      return false;
    }
  }

  async scrapeCategory(page, url) {
    let currentPage = 1;
    let retries = 3;

    while (currentPage <= this.maxPages) {
      const pageUrl = `${url}?page=${currentPage}`;
      console.log(`Fetching: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        await this.autoScroll(page);

        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(el => el.href)
            .filter(href => href && href.trim().length > 0);
        });

        const validProducts = links.filter(link => this.isValidProductUrl(link));

        console.log(`Found ${validProducts.length} valid products from ${links.length} total links on page ${currentPage}`);

        if (validProducts.length === 0) {
          console.log('No more valid products found, moving to next category');
          break;
        }

        for (const link of validProducts) {
          const cleanedUrl = cleanUrl(link);

          // Verificar si ya procesamos esta URL en esta sesión
          if (this.processedUrls.has(cleanedUrl)) {
            console.log(`URL ya procesada en esta sesión: ${cleanedUrl}`);
            continue;
          }

          // Marcar URL como procesada
          this.processedUrls.add(cleanedUrl);

          const productPage = await page.browser().newPage();
          try {
            console.log(`Scraping details for: ${cleanedUrl}`);
            const productData = await this.scrapeProductDetails(productPage, cleanedUrl);
            if (productData && productData.product && productData.product.id) {
              await this.saveProduct(productData);
            }
          } catch (error) {
            console.error(`Error processing product ${cleanedUrl}:`, error.message);
          } finally {
            await productPage.close();
            await delay(this.delayMs);
          }
        }

        await delay(this.delayMs);
        currentPage++;
        retries = 3;
      } catch (e) {
        console.error(`Error fetching ${pageUrl}:`, e.message);
        if (--retries <= 0) {
          console.log(`Max retries reached for ${pageUrl}, moving to next category`);
          break;
        }
        await delay(this.delayMs * 2);
      }
    }
  }

  async scrapeProductDetails(page, url) {
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForSelector(SELECTORS.product.name, { timeout: 5000 });
      const productData = await parseProductDetails(page, SELECTORS);

      if (productData && productData.product) {
        productData.product.retailer_id = this.retailerId;
        productData.product.product_url = url;
      }
      if (productData && productData.price) {
        productData.price.retailer_id = this.retailerId;
        productData.price.date = new Date().toISOString().split('T')[0];
      }

      return productData;
    } catch (error) {
      console.error(`Error scraping product details for ${url}:`, error.message);
      throw error;
    }
  }

  async scrapeCategoryPages(page) {
    for (const url of this.categories) {
      console.log(`Starting category: ${url}`);
      await this.scrapeCategory(page, url);
    }
  }

  async saveProduct(productData) {
    try {
      console.log('Guardando/actualizando producto:', productData.product.id);
      await saveProduct(productData);
    } catch (error) {
      console.error('Error al guardar el producto:', error.message);
      throw error;
    }
  }
}

module.exports = VeaScraper;