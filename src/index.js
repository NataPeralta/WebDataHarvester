const VeaScraper = require('./scrapers/vea');
const { initializeDatabase } = require('./database');

async function main() {
  try {
    await initializeDatabase();

    const scraper = new VeaScraper(100000, 2000); // 2 second delay between requests
    await scraper.startScraping();

    console.log('Scraping completed successfully');
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
}

main();