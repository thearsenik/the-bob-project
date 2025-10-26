const axios = require('axios');

class IGAccount {
  constructor(username, password, apiKey, accountType) {
    this.username = username;
    this.password = password;
    this.apiKey = apiKey;
    this.accountType = accountType;
    this.baseUrl = accountType === 'demo' ? 'https://demo-api.ig.com/gateway/deal' : 'https://api.ig.com/gateway/deal';
  }

  async login() {
    try {
      const response = await axios.post(this.baseUrl + '/session', {
        identifier: this.username,
        password: this.password,
        encryptedPassword: null
      }, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-f',
          'Accept': 'application/json; charset=UTF-8',
          'X-IG-API-KEY': this.apiKey,
          'Version': '2'
        }
      });

      const cst = response.headers['cst'];
      const securityToken = response.headers['x-security-token'];

      console.log('Successfully logged in!');
      console.log('CST:', cst);
      console.log('X-SECURITY-TOKEN:', securityToken);

      return { cst, securityToken, apiKey: this.apiKey, baseUrl: this.baseUrl };

    } catch (error) {
      console.error('Error during login:', error.response ? error.response.data : error.message);
      return null;
    }
  }
}

module.exports = IGAccount;
