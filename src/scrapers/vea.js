const BaseScraper = require('./base');
const { extractNumber, cleanText, cleanUrl } = require('../utils');
const { saveProduct } = require('../database');

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

  async scrapeCategoryPages(page) {
    for (const url of this.categories) {
      await this.scrapeCategory(page, url);
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

    const productData = await page.evaluate(() => {
      const getName = () => {
        const nameEl = document.querySelector('.vtex-store-components-3-x-productNameContainer');
        return nameEl ? nameEl.textContent.trim() : '';
      };

      const getBrand = () => {
        const brandEl = document.querySelector('.vtex-store-components-3-x-productBrand');
        return brandEl ? brandEl.textContent.trim() : '';
      };

      const getSku = () => {
        const skuEl = document.querySelector('.vtex-product-identifier-0-x-product-identifier__value');
        return skuEl ? skuEl.textContent.trim() : '';
      };

      const getPrices = () => {
        const discountedPrice = document.querySelector('#priceContainer');
        const originalPrice = document.querySelector('.veaargentina-store-theme-2t-mVsKNpKjmCAEM_AMCQH');
        const pricePerUnit = document.querySelector('.veaargentina-store-theme-1QiyQadHj-1_x9js9EXUYK');
        const discountEl = document.querySelector('.veaargentina-store-theme-SpFtPOZlANEkxX04GqL31');

        return {
          discountedPrice: discountedPrice ? discountedPrice.textContent : '',
          originalPrice: originalPrice ? originalPrice.textContent : '',
          pricePerUnit: pricePerUnit ? pricePerUnit.textContent : '',
          discount: discountEl ? discountEl.textContent : ''
        };
      };

      const getImage = () => {
        const imgEl = document.querySelector('.vtex-store-components-3-x-productImageTag');
        return imgEl ? imgEl.src : '';
      };

      return {
        name: getName(),
        brand: getBrand(),
        sku: getSku(),
        prices: getPrices(),
        image: getImage()
      };
    });

    const weightMatch = productData.name.match(/\d+\s*(?:gr|ml|kg|l)/i);
    const weight = weightMatch ? extractNumber(weightMatch[0]) : null;

    return {
      product: {
        id: productData.sku,
        retailer_id: this.retailerId,
        brand: productData.brand,
        weight_volume: weight,
        name: productData.name,
        image_url: productData.image,
        product_url: url
      },
      price: {
        product_id: productData.sku,
        retailer_id: this.retailerId,
        original_price: extractNumber(productData.prices.originalPrice),
        discount_percentage: extractNumber(productData.prices.discount),
        discounted_price: extractNumber(productData.prices.discountedPrice),
        price_per_unit: extractNumber(productData.prices.pricePerUnit),
        discount_conditions: cleanText(productData.prices.discount)
      }
    };
  }

  async saveProduct(productData) {
    await saveProduct(productData);
  }
}

module.exports = VeaScraper;
