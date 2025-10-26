const fs = require('fs');
const IGAccount = require('./IGAccount.js');
const IGApi = require('./IGApi.js');
const DB = require('./db.js');

const init = async () => {
  // Load configuration
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const { username, password, apiKey, accountType, mongodb_uri } = config;

  // Connect to MongoDB
  const db = new DB(mongodb_uri);
  await db.connect();

  const account = new IGAccount(username, password, apiKey, accountType);
  const sessionDetails = await account.login();

  if (!sessionDetails) {
    console.error('Failed to login to IG');
    process.exit(1);
  }

  let closeDb = true;
  const arg = process.argv[2];
  switch (arg) {
    case 'capture-data':
      await captureData(sessionDetails, db, config);
      break;
    case 'trade':
      await trade(sessionDetails, db, config);
      closeDb = false;
      break;
    case 'help':
    default:
      logHelp();
  }

  // Disconnect from MongoDB
  if (closeDb) {
    await db.close();
  }
};

const logHelp = () => {
  console.log('Usage: node index.js <command>');
  console.log('Commands:');
  console.log('  capture-data: Capture data from IG');
  console.log('  help: Show this help message');
};

const captureData = async (sessionDetails, db, config) => {
  const startDate = new Date(config.trading.history_start_date);
  const interval = config.trading.interval;
  const api = new IGApi(sessionDetails);
  const dataToSave = [];

  for (let date = startDate; date <= new Date(); date.setDate(date.getDate() + 1)) {
    const formattedDate = date.toISOString().split('T')[0];
    for (const epic of Object.keys(config.trading.indices)) {
      console.log(`Fetching data for ${epic} on ${formattedDate}`);
      const historicalData = await api.getHistoricalData(epic, formattedDate, interval);
      if (historicalData && historicalData.snapshot) {
        dataToSave.push({
          epic,
          date: formattedDate,
          interval,
          snapshot: historicalData.snapshot,
          data: historicalData.prices
        });
      }
    }
  }

  if (dataToSave.length > 0) {
    await db.saveHistoricalData(dataToSave);
  } else {
    console.log('No data to save.');
  }
};

const trade = async (sessionDetails, db, config) => {
  const interval = config.trading.interval;
  const api = new IGApi(sessionDetails);

  console.log(`Starting trading bot with an interval of ${interval} seconds.`);

  const tradeLogic = async () => {
    console.log('Running trading logic...');
    for (const epic of Object.keys(config.trading.indices)) {
      const latestData = await db.getLatestHistoricalData(epic);
      const marketData = await api.getMarketData(epic);

      if (latestData && marketData && marketData.snapshot) {
        const lastClose = latestData.snapshot.offer;
        const currentOffer = marketData.snapshot.offer;

        console.log(`Epic: ${epic}, Last close: ${lastClose}, Current offer: ${currentOffer}`);

        // Simple trading logic placeholder
        if (currentOffer > lastClose) {
          console.log('Price went up, selling.');
          await api.placeTrade(epic, 'SELL', 1);
        } else if (currentOffer < lastClose) {
          console.log('Price went down, buying.');
          await api.placeTrade(epic, 'BUY', 1);
        } else {
          console.log('Price is the same, doing nothing.');
        }
      } else {
        console.log(`Not enough data to trade for ${epic}`);
      }
    }
  };

  // Run the trading logic immediately, and then every `interval` seconds.
  tradeLogic();
  setInterval(tradeLogic, interval * 1000);

  // Keep the process alive
  return new Promise(() => {});
};

init();
