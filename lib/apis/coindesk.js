var request = require('postman-request');

function get_usd_value(cb) {
  request({ uri: 'https://api.coindesk.com/v1/bpi/currentprice/USD.json', json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
    if (error)
      return cb(error, 0);
    else
      return cb(null, body.bpi.USD['rate_float'].toFixed(4));
  });
}

module.exports = {
  get_data: function (cb) {
    var error = null;

    get_usd_value(function (err, last_usd) {
      if (err)
        error = err;

      return cb(error, last_usd);
    });
  }
};