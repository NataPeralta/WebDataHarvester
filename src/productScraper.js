const { extractNumber, cleanText } = require('./utils');

async function scrapeProductDetails(page, url) {
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
      const pricePerKg = document.querySelector('.veaargentina-store-theme-1QiyQadHj-1_x9js9EXUYK');
      const discountEl = document.querySelector('.veaargentina-store-theme-SpFtPOZlANEkxX04GqL31');

      return {
        discountedPrice: discountedPrice ? discountedPrice.textContent : '',
        originalPrice: originalPrice ? originalPrice.textContent : '',
        pricePerKg: pricePerKg ? pricePerKg.textContent : '',
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
      marca: productData.brand,
      peso_litraje: weight,
      nombre: productData.name,
      imagen: productData.image,
      link: url
    },
    price: {
      producto_id: productData.sku,
      precio: extractNumber(productData.prices.originalPrice),
      descuento: extractNumber(productData.prices.discount),
      precio_con_descuento: extractNumber(productData.prices.discountedPrice),
      precio_por_kilo_litraje: extractNumber(productData.prices.pricePerKg),
      condicion_descuento: cleanText(productData.prices.discount)
    }
  };
}

module.exports = { scrapeProductDetails };
