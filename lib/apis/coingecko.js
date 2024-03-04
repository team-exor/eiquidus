const request = require('postman-request');
const base_url = 'https://api.coingecko.com/api/v3/';

function get_coin_list(api_key, cb) {
  request({ uri: base_url + 'coins/list?include_platform=false' + (api_key == null || api_key == '' ? '' : '&x_cg_demo_api_key=' + api_key), json: true}, function (error, response, body) {
    if (error)
      return cb(error, []);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb('No data returned', []);
    else if (body['status'] != null && body['status']['error_message'] != null && body['status']['error_message'] != '')
      return cb(body['status']['error_message'], []);
    else
      return cb(null, body);
  });
}

function get_simple_price(id, currency, market_array, api_key, cb) {
  request({ uri: base_url + `simple/price?ids=${id.toLowerCase()}&vs_currencies=usd${currency == null || currency == '' ? '' : `,${currency}`}` + (api_key == null || api_key == '' ? '' : '&x_cg_demo_api_key=' + api_key), json: true}, function (error, response, body) {
    if (error)
      return cb(error, 0, 0);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb('No data returned', 0, 0);
    else if (body['status'] != null && body['status']['error_message'] != null && body['status']['error_message'] != '')
      return cb(body['status']['error_message'], 0, 0);
    else {
      try {
        if (market_array != null) {
          // multiple currencies need to be combined before return
          let last_price = 0;
          let last_usd_price = 0;
          let counter = 0;
          let api_market = null;

          // check if the currency variable is set
          if (currency != null && currency != '') {
            // find the market currency in the market_array
            const base_index = market_array.findIndex(p => p.currency.toLowerCase() == currency.toLowerCase());

            // check if the currency is found in the market_array
            if (base_index > -1) {
              // find the api market data row
              api_market = body[market_array[base_index].coingecko_id.toLowerCase()];
            }
          }

          // loop through all api object keys
          Object.keys(body).forEach(function(key, index, map) {
            const market_index = market_array.findIndex(p => p.coingecko_id.toLowerCase() == key.toLowerCase());

            // check if the currency is found in the market_array
            if (market_index > -1) {
              // determine if the api already returend the market price
              if (currency != null && currency != '' && body[key][currency.toLowerCase()] != null) {
                // calculate the market price
                last_price += (market_array[market_index].last_price * (currency == null || currency == '' ? 0 : body[key][currency.toLowerCase()]));
              } else {
                // check if the market currency exists in the api data
                if (api_market != null) {
                  // calculate the currency ratio
                  const ratio = (api_market['usd'] / body[key]['usd']);

                  // calculate the market price
                  last_price += (market_array[market_index].last_price / ratio);
                }
              }

              // calculate the usd price
              last_usd_price += (market_array[market_index].last_price * body[key]['usd']);

              counter++;
            }
          });

          // check if the counter is greater than 0
          if (counter > 0) {
            // average the market and usd prices
            last_price = (last_price / counter);
            last_usd_price = (last_usd_price / counter);
          }

          return cb(null, last_price, last_usd_price);
        } else {
          // single currency
          return cb(null, (currency == null || currency == '' ? 0 : body[id.toLowerCase()][currency.toLowerCase()]), body[id.toLowerCase()]['usd']);
        }
      } catch(err) {
        return cb('Received unexpected API data response', 0, 0);
      }
    }
  });
}

module.exports = {
  get_coin_data: function (api_key, cb) {
    get_coin_list(api_key, function (err, coin_list) {
      return cb(err, coin_list);
    });
  },
  get_market_prices: function (id, currency, api_key, cb) {
    get_simple_price(id, currency, null, api_key, function (err, last_price, last_usd) {
      if (last_price == null)
        console.log(`Error: "${currency}" is not a valid coingecko api currency`);

      return cb(err, last_price, last_usd);
    });
  },
  get_avg_market_prices: function (id, currency, market_array, api_key, cb) {
    get_simple_price(id, currency, market_array, api_key, function (err, last_price, last_usd) {
      if (last_price == null)
        console.log(`Error: "${currency}" is not a valid coingecko api currency`);

      return cb(err, last_price, last_usd);
    });
  }
};