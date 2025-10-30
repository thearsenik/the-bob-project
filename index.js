const fs = require('fs');
const IGAccount = require('./IGAccount.js');
const IGApi = require('./IGApi.js');
const brain = require('brain.js');
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
      break;
    case 'train':
      await trainAI(sessionDetails, db, config);
      break;
    case 'help':
    default:
      logHelp();
  }
  await db.close();
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

const trainAI = async (sessionDetails, db, config) => {
  console.log('Starting AI training...');

  // 1. Load the data
  const allData = await db.getAllHistoricalData();

  if (!allData || allData.length === 0) {
    console.log('No data found to train the AI. Please run capture-data first.');
    return;
  }

  // 2. Prepare the data
  // Combine all data into a single array of closing prices
  const trainingData = [];
  for (const record of allData) {
    for (const price of record.data) {
      trainingData.push(price.closePrice);
    }
  }

  // Normalize the data
  const min = Math.min(...trainingData);
  const max = Math.max(...trainingData);
  const normalizedData = trainingData.map(price => (price - min) / (max - min));

  // Create training sequences
  const sequenceLength = 30; // We'll use 30 data points to predict the next one
  const trainingSequences = [];
  for (let i = 0; i < normalizedData.length - sequenceLength; i++) {
    trainingSequences.push({
      input: normalizedData.slice(i, i + sequenceLength),
      output: [normalizedData[i + sequenceLength]]
    });
  }

  // 3. Create and train the model
  const net = new brain.recurrent.LSTM();
  net.train(trainingSequences, {
    iterations: 100, // Number of training iterations
    log: true, // Log training progress
    logPeriod: 10, // Log progress every 10 iterations
    errorThresh: 0.01 // Stop training when the error is below this threshold
  });

  // 4. Save the trained model
  const modelJson = net.toJSON();
  fs.writeFileSync('market-predictor-model.json', JSON.stringify(modelJson));
  console.log('AI training complete. Model saved to market-predictor-model.json');

  // Also save min and max for denormalization
  fs.writeFileSync('market-predictor-model-scaling.json', JSON.stringify({ min, max }));
  console.log('Scaling data saved to market-predictor-model-scaling.json');
};

init();
