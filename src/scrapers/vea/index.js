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

        // Esperar a que los productos se carguen
        await page.waitForSelector(SELECTORS.productLinks, { timeout: 5000 });
        await this.autoScroll(page);

        // Extraer y filtrar enlaces
        const links = await page.evaluate((sel) => {
          const products = document.querySelectorAll(sel.productLinks);
          return Array.from(products)
            .map(a => a.href)
            .filter(href => href && href.includes('vea.com.ar') && href.endsWith('/p'));
        }, SELECTORS);

        console.log(`Found ${links.length} products on page ${currentPage}`);

        if (links.length === 0) {
          console.log('No more products found, moving to next category');
          break;
        }

        // Procesar productos
        for (const link of links) {
          const cleanedUrl = cleanUrl(link);
          if (!this.productLinks.has(cleanedUrl)) {
            this.productLinks.add(cleanedUrl);
            const productPage = await page.browser().newPage();
            try {
              console.log(`Scraping details for: ${cleanedUrl}`);
              const productData = await this.scrapeProductDetails(productPage, cleanedUrl);
              if (productData && productData.product && productData.product.id) {
                await this.saveProduct(productData);
                console.log(`Successfully saved product: ${productData.product.id}`);
              }
            } catch (error) {
              console.error(`Error processing product ${cleanedUrl}:`, error.message);
            } finally {
              await productPage.close();
              await delay(this.delayMs);
            }
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
      await saveProduct(productData);
    } catch (error) {
      console.error('Error saving product:', error.message);
      throw error;
    }
  }
}

module.exports = VeaScraper;