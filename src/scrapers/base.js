const puppeteer = require('puppeteer');
const { delay } = require('../utils');

/**
 * Base scraper class that defines the common interface and functionality
 * that all retailer-specific scrapers should implement
 */
class BaseScraper {
  constructor(retailerId, maxPages = 100000, delayMs = 1000) {
    if (new.target === BaseScraper) {
      throw new Error('BaseScraper is an abstract class and cannot be instantiated directly');
    }
    this.retailerId = retailerId;
    this.productLinks = new Set();
    this.maxPages = maxPages;
    this.delayMs = delayMs;
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

  async startScraping() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--ignore-certificate-errors',
        '--disable-setuid-sandbox',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    try {
      console.log('Creating new page...');
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Optimizar rendimiento deshabilitando recursos innecesarios
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'document' || req.resourceType() === 'xhr') {
          req.continue();
        } else {
          req.abort();
        }
      });

      console.log('Starting category scraping...');
      await this.scrapeCategoryPages(page);

      console.log('Starting product scraping...');
      await this.scrapeProducts(browser);
    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // Abstract methods that must be implemented by child classes
  async scrapeCategory(page, url) {
    throw new Error('scrapeCategory must be implemented by child class');
  }

  async scrapeProductDetails(page, url) {
    throw new Error('scrapeProductDetails must be implemented by child class');
  }

  async scrapeCategoryPages(page) {
    throw new Error('scrapeCategoryPages must be implemented by child class');
  }

  async saveProduct(productData) {
    throw new Error('saveProduct must be implemented by child class');
  }

  async scrapeProducts(browser) {
    const products = [...this.productLinks];
    console.log(`Starting to scrape ${products.length} individual products for ${this.retailerId}`);
    let successCount = 0;
    let errorCount = 0;

    for (const productUrl of products) {
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        console.log(`Scraping product: ${productUrl}`);
        const productData = await this.scrapeProductDetails(page, productUrl);

        if (productData && productData.product && productData.product.id) {
          await this.saveProduct(productData);
          console.log(`Successfully saved product: ${productData.product.id}`);
          successCount++;
        } else {
          console.error(`Invalid product data for URL: ${productUrl}`);
          errorCount++;
        }

        await page.close();
        await delay(this.delayMs);
      } catch (e) {
        console.error(`Error scraping product ${productUrl}: ${e.message}`);
        errorCount++;
      }
    }

    console.log(`Scraping completed. Success: ${successCount}, Errors: ${errorCount}`);
  }
}

module.exports = BaseScraper;