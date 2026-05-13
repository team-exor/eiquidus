const request = require('postman-request');
const base_url = 'https://qutrade.io/api/v1/';
const market_url_template = 'https://qutrade.io/en/?market={coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
  const req_url = base_url + 'market_data/?pair=' + pair_key;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || body.result == null || body.list == null || body.list[pair_key] == null)
        return cb(api_error_msg, null);
      else if (body.result !== 'success')
        return cb(body.info || api_error_msg, null);
      else {
        try {
          const pair_data = body.list[pair_key];

          const summary = {
            'high': parseFloat(pair_data.high) || 0,
            'low': parseFloat(pair_data.low) || 0,
            'volume': parseFloat(pair_data.asset_1_volume) || 0,
            'volume_btc': parseFloat(pair_data.asset_2_volume) || 0,
            'bid': parseFloat(pair_data.bid) || 0,
            'ask': parseFloat(pair_data.ask) || 0,
            'last': parseFloat(pair_data.price) || 0,
            'change': parseFloat(pair_data.trend) || 0
          };

          return cb(null, summary);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_trades(coin, exchange, api_error_msg, cb) {
  const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
  const req_url = base_url + 'market_trades/?pair=' + pair_key + '&limit=100';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || body.result == null || body.list == null || body.list.length == 0)
        return cb(api_error_msg, null);
      else if (body.result !== 'success')
        return cb(body.info || api_error_msg, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.list.length; t++) {
            trades.push({
              ordertype: body.list[t].side.toString().toUpperCase(),
              price: parseFloat(body.list[t].price) || 0,
              quantity: parseFloat(body.list[t].amount) || 0,
              timestamp: parseInt(body.list[t].timestamp)
            });
          }

          return cb(null, trades);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_orders(coin, exchange, api_error_msg, cb) {
  const pair_key = coin.toLowerCase() + '_' + exchange.toLowerCase();
  const req_url = base_url + 'market_depth/?pair=' + pair_key + '&limit=100';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object' || body.result == null || body.list == null || body.list[pair_key] == null)
      return cb(api_error_msg, null, null);
    else if (body.result !== 'success')
      return cb(body.info || api_error_msg, null, null);
    else {
      try {
        let buys = [];
        let sells = [];
        const pair_data = body.list[pair_key];

        for (let b = 0; b < pair_data.bids.length; b++) {
          buys.push({
            price: parseFloat(pair_data.bids[b][0]) || 0,
            quantity: parseFloat(pair_data.bids[b][1]) || 0
          });
        }

        for (let s = 0; s < pair_data.asks.length; s++) {
          sells.push({
            price: parseFloat(pair_data.asks[s][0]) || 0,
            quantity: parseFloat(pair_data.asks[s][1]) || 0
          });
        }

        return cb(null, buys, sells);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

module.exports = {
  market_name: 'Qutrade',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAhFBMVEUAAAAuSVwvR14vSFwwSF0wSF0wSF0wSF4xR14wR10wSF0vSF0uQ14xR1swSV0vSF0wSF0vSF0vRV4wR10vSF0vSF0xSVsvSV0wSlwxSF0wR1wuSFwwSF0vSV0wSl0vSF4uSFcyRmQuSVg6R2UsRGAxSFwwR1wySlswSF0xSlsyR18uR1sSei0+AAAAKHRSTlMAUg3n3KqdSC+jl0xCHgX89/LPvrOSiYR9d2VbWDwrJhfr2o1rUBQITdwwpgAAAJxJREFUGNNtj0kOgzAUQ02ANMxzmSmdHXr/+zWgZte3sfT99CVj59LkZNG8YDnT9X2X7HHQLW+151p9QhNOwdiadw7ASEaweEzhUCbAaQaWEREnBBTAvOUCLgGGqGh63lyv3ByAtTGQ6ivWbf8tKDHoGA9lLNMnISMIXcLikE+g1509nJhNJgLW4lgE1aa/KfSk9NjCkvgkM1/hH1/r4gv6hEKdhQAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',
  get_data: function(settings, cb) {
    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
        get_trades(settings.coin, settings.exchange, settings.api_error_msg, function(trade_error, trades) {
          if (trade_error == null) {
            get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats) {
              if (summary_error == null)
                return cb(null, {buys: buys, sells: sells, trades: trades, stats: stats, chartdata: null});
              else
                return cb(summary_error, null);
            });
          } else
            return cb(trade_error, null);
        });
      } else
        return cb(order_error, null);
    });
  }
};