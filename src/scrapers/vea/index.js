const BaseScraper = require('../base');
const SELECTORS = require('./selectors');
const { parseProductDetails } = require('./parser');
const { cleanUrl, delay } = require('../../utils');
const { saveProduct, getProductByUrl } = require('../../database');

class VeaScraper extends BaseScraper {
  constructor(maxPages = 100000, delayMs = 500) { // Reducido el delay a 500ms
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
    this.maxConcurrent = 10; // Aumentado a 10 productos en paralelo
  }

  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200; // Aumentado para scroll más rápido
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 25); // Reducido el intervalo de scroll
      });
    });
  }

  isValidProductUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.endsWith('vea.com.ar') && 
             urlObj.pathname.split('/').filter(Boolean).pop() === 'p' &&
             !['politica-de-privacidad', 'defensadelconsumidor', 'conoce-tus-derechos', 
               'tarjetacencosud', 'argentina.gob.ar'].some(pattern => url.includes(pattern));
    } catch {
      return false;
    }
  }

  async processProductBatch(browser, productUrls) {
    const pages = await Promise.all(Array(this.maxConcurrent).fill(0).map(() => browser.newPage()));
    const results = [];

    for (let i = 0; i < productUrls.length; i += this.maxConcurrent) {
      const batch = productUrls.slice(i, i + this.maxConcurrent);
      const batchPromises = batch.map(async (url, index) => {
        const page = pages[index];
        try {
          const productData = await this.scrapeProductDetails(page, url);
          if (productData) {
            await saveProduct(productData);
          }
        } catch (error) {
          console.error(`Error processing ${url}:`, error.message);
        }
      });

      await Promise.all(batchPromises);
      await delay(this.delayMs);
    }

    await Promise.all(pages.map(page => page.close()));
    return results;
  }

  async scrapeCategory(page, url) {
    let currentPage = 1;
    let retries = 3;

    while (currentPage <= this.maxPages) {
      const pageUrl = `${url}?page=${currentPage}`;

      try {
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        await this.autoScroll(page);

        const links = await page.evaluate(() => 
          Array.from(document.querySelectorAll('a[href]'))
            .map(el => el.href)
            .filter(href => href?.trim())
        );

        const validProducts = links
          .filter(link => this.isValidProductUrl(link))
          .map(cleanUrl)
          .filter(url => !this.processedUrls.has(url));

        if (validProducts.length === 0) break;

        console.log(`Processing ${validProducts.length} products from ${pageUrl}`);
        await this.processProductBatch(page.browser(), validProducts);
        validProducts.forEach(url => this.processedUrls.add(url));

        currentPage++;
        retries = 3;
      } catch (e) {
        console.error(`Error en página ${pageUrl}:`, e.message);
        if (--retries <= 0) break;
        await delay(this.delayMs);
      }
    }
  }

  async scrapeProductDetails(page, url) {
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 15000 // Reducido el timeout
      });

      const productData = await parseProductDetails(page, SELECTORS);
      if (productData?.product) {
        productData.product.retailer_id = this.retailerId;
        productData.product.product_url = url;
      }
      if (productData?.price) {
        productData.price.retailer_id = this.retailerId;
        productData.price.date = new Date().toISOString().split('T')[0];
      }
      return productData;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      throw error;
    }
  }

  async scrapeCategoryPages(page) {
    for (const url of this.categories) {
      await this.scrapeCategory(page, url);
    }
  }

  async saveProduct(productData) {
    try {
      await saveProduct(productData);
    } catch (error) {
      console.error('Error al guardar producto:', error.message);
      throw error;
    }
  }
}

module.exports = VeaScraper;