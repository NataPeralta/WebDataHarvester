const BaseScraper = require('../base');
const SELECTORS = require('./selectors');
const { parseProductDetails } = require('./parser');
const { cleanUrl } = require('../../utils');
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

        const links = await page.evaluate((sel) => {
          return Array.from(document.querySelectorAll(sel.productLinks))
            .map(el => el.href)
            .filter(sel.productLinkFilter);
        }, SELECTORS);

        if (links.length === 0) break;

        console.log(`Found ${links.length} products`);
        links.forEach(link => this.productLinks.add(cleanUrl(link)));

        await page.waitForTimeout(this.delayMs);
        currentPage++;
        retries = 3;
      } catch (e) {
        console.error(`Error fetching ${pageUrl}: ${e.message}`);
        if (--retries <= 0) break;
        await page.waitForTimeout(this.delayMs * 2);
      }
    }
  }

  async scrapeProductDetails(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2' });
    return parseProductDetails(page, SELECTORS);
  }

  async scrapeCategoryPages(page) {
    for (const url of this.categories) {
      await this.scrapeCategory(page, url);
    }
  }

  async saveProduct(productData) {
    await saveProduct(productData);
  }
}

module.exports = VeaScraper;
