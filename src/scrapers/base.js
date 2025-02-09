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

  // Common methods that can be used by all scrapers
  async scrapeProducts(browser) {
    const products = [...this.productLinks];
    console.log(`Starting to scrape ${products.length} individual products for ${this.retailerId}`);

    for (const productUrl of products) {
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        const productData = await this.scrapeProductDetails(page, productUrl);
        await this.saveProduct(productData);
        await page.close();
        await delay(this.delayMs);
      } catch (e) {
        console.error(`Error scraping product ${productUrl}: ${e.message}`);
      }
    }
  }

  async startScraping() {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await this.scrapeCategoryPages(page);
      await this.scrapeProducts(browser);
    } finally {
      await browser.close();
    }
  }
}

module.exports = BaseScraper;