const axios = require('axios');

class IGApi {
  constructor(sessionDetails) {
    this.sessionDetails = sessionDetails;
  }

  async getHistoricalData(epic, date, interval) {
    // Note: The IG API documentation for historical prices is not publicly available without login.
    // This implementation is based on common REST patterns and information from related Python libraries.
    // The endpoint and parameters might need adjustment.

    const resolution = 'SECOND_'+interval; // User requested 10-second interval
    const url = `${this.sessionDetails.baseUrl}/prices/${epic}?resolution=${resolution}&from=${date}T00:00:00&to=${date}T23:59:59`;

    console.log(`\nFetching historical data for ${epic} on ${date}...`);

    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json; charset=UTF-8',
          'X-IG-API-KEY': this.sessionDetails.apiKey,
          'CST': this.sessionDetails.cst,
          'X-SECURITY-TOKEN': this.sessionDetails.securityToken,
          'Version': '3' // Version 3 is often used for price history
        }
      });

      console.log('Successfully fetched historical data:');
      const data = response.data;
      console.log(JSON.stringify(data, null, 2));
      return data;

    } catch (error) {
      console.error('Error fetching historical data:', error.response ? error.response.data : error.message);
      return null;
    }
  }

  async getMarketData(epic) {
    const url = `${this.sessionDetails.baseUrl}/markets/${epic}`;

    console.log(`\nFetching market data for ${epic}...`);

    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json; charset=UTF-8',
          'X-IG-API-KEY': this.sessionDetails.apiKey,
          'CST': this.sessionDetails.cst,
          'X-SECURITY-TOKEN': this.sessionDetails.securityToken,
          'Version': '3'
        }
      });

      console.log('Successfully fetched market data:');
      const data = response.data;
      console.log(JSON.stringify(data, null, 2));
      return data;

    } catch (error) {
      console.error('Error fetching market data:', error.response ? error.response.data : error.message);
      return null;
    }
  }

  async placeTrade(epic, direction, size) {
    const url = `${this.sessionDetails.baseUrl}/positions/otc`;

    console.log(`\nPlacing trade for ${epic}...`);

    try {
      const response = await axios.post(url, {
        epic,
        direction,
        size,
        orderType: 'MARKET',
        expiry: '-'
      }, {
        headers: {
          'Accept': 'application/json; charset=UTF-8',
          'X-IG-API-KEY': this.sessionDetails.apiKey,
          'CST': this.sessionDetails.cst,
          'X-SECURITY-TOKEN': this.sessionDetails.securityToken,
          'Version': '2'
        }
      });

      console.log('Successfully placed trade:');
      const data = response.data;
      console.log(JSON.stringify(data, null, 2));
      return data;

    } catch (error) {
      console.error('Error placing trade:', error.response ? error.response.data : error.message);
      return null;
    }
  }
}

module.exports = IGApi;
