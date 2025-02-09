# Product Price Scraper

A modular web scraping system for tracking products and prices from different retailers.

## Project Structure

```
├── src/
│   ├── scrapers/
│   │   ├── base.js         # Base scraper class
│   │   └── vea/           # Vea-specific implementation
│   │       ├── index.js    # Vea scraper implementation
│   │       ├── parser.js   # HTML parsing functions
│   │       └── selectors.js # HTML selectors
│   ├── database.js        # Database operations
│   ├── models.js          # Data models
│   ├── utils.js           # Utility functions
│   └── index.js           # Main entry point
└── data/                  # Database storage
```

## Installation

1. Install Node.js (version 16 or higher)
2. Install project dependencies:
   ```bash
   npm install
   ```

## Required Dependencies

- puppeteer
- sqlite3
- ws
- @neondatabase/serverless
- drizzle-orm

## Usage

1. Run the scraper:
   ```bash
   node src/index.js
   ```

## Adding New Retailers

To add a new retailer:

1. Create a new folder under `src/scrapers/` for the retailer
2. Create three files:
   - `selectors.js`: Define HTML selectors for the retailer's website
   - `parser.js`: Implement parsing logic
   - `index.js`: Implement the retailer-specific scraper class
3. Extend the BaseScraper class and implement required methods

## Database Schema

The system uses SQLite with the following schema:

- retailers: Stores information about retail stores
- products: Stores product information
- prices: Stores price history for products
