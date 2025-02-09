const puppeteer = require('puppeteer');
const { delay, cleanUrl } = require('./utils');
const { saveProduct } = require('./database');
const { scrapeProductDetails } = require('./productScraper');

class WebScraper {
  constructor(urls, maxPages = 100000, delayMs = 1000) {
    this.urls = urls;
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
            .filter(link => link.endsWith('/p'));
        });

        if (links.length === 0) break;

        console.log(`Found ${links.length} products`);
        links.forEach(link => this.productLinks.add(cleanUrl(link)));

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

  async scrapeProducts(browser) {
    const products = [...this.productLinks];
    console.log(`Starting to scrape ${products.length} individual products`);

    for (const productUrl of products) {
      try {
        const page = await browser.newPage();
        const productData = await scrapeProductDetails(page, productUrl);
        await saveProduct(productData);
        await page.close();
        await delay(this.delayMs);
      } catch (e) {
        console.error(`Error scraping product ${productUrl}: ${e.message}`);
      }
    }
  }

  async startScraping() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
      for (const url of this.urls) {
        await this.scrapeCategory(page, url);
      }

      await this.scrapeProducts(browser);
    } finally {
      await browser.close();
    }
  }
}

module.exports = WebScraper;
