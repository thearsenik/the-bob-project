const { MongoClient } = require('mongodb');

class DB {
  constructor(uri) {
    this.uri = uri;
    this.client = new MongoClient(this.uri, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = null;
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getDb() {
    return this.db;
  }

  async createIndicesCollection() {
    try {
      await this.db.createCollection('indices');
      console.log('Collection "indices" created');
    } catch (error) {
      if (error.code === 48) {
        console.log('Collection "indices" already exists');
      } else {
        console.error('Error creating collection:', error);
        throw error;
      }
    }
  }

  async saveHistoricalData(data) {
    try {
      const collection = this.db.collection('indices');
      await collection.insertMany(data);
      console.log('Historical data saved to MongoDB');
    } catch (error) {
      console.error('Error saving historical data to MongoDB:', error);
      throw error;
    }
  }

  async getLatestHistoricalData(epic) {
    try {
      const collection = this.db.collection('indices');
      const latestData = await collection.findOne({ epic }, { sort: { date: -1 } });
      return latestData;
    } catch (error) {
      console.error('Error getting latest historical data from MongoDB:', error);
      throw error;
    }
  }
}

module.exports = DB;
