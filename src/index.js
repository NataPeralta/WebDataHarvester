const VeaScraper = require('./scrapers/vea');
const { initializeDatabase } = require('./database');

async function main() {
  try {
    console.log('Inicializando base de datos...');
    await initializeDatabase();

    console.log('Iniciando scraping...');
    const scraper = new VeaScraper(100000, 2000); // 2 second delay between requests
    await scraper.startScraping();

    console.log('Scraping completado exitosamente');
  } catch (error) {
    console.error('Error durante el scraping:', error);
    process.exit(1);
  }
}

main();