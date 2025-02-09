const VeaScraper = require('./scrapers/vea');
const { initializeDatabase } = require('./database');
const fs = require('fs').promises;
const path = require('path');

async function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    await fs.access(dataDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('Directorio data/ creado exitosamente');
    } else {
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('Asegurando que el directorio data/ existe...');
    await ensureDataDirectory();

    console.log('Inicializando base de datos SQLite...');
    await initializeDatabase();

    console.log('Iniciando scraping...');
    const scraper = new VeaScraper(100000, 2000); // 2 segundos de delay entre requests
    await scraper.startScraping();

    console.log('Scraping completado exitosamente');
  } catch (error) {
    console.error('Error durante el scraping:', error);
    process.exit(1);
  }
}

main();