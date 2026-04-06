const request = require('postman-request');
const base_url = 'https://trade.nestex.one/api/';
const market_url_template = 'https://trade.nestex.one/spot/{coin}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + 'cg/tickers/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb(body.error, null);
      else {
        try {
          const summary = {
            'high': parseFloat(body.high) || 0,
            'low': parseFloat(body.low) || 0,
            'volume': parseFloat(body.base_volume) || 0,
            'volume_btc': parseFloat(body.target_volume) || 0,
            'bid': parseFloat(body.bid) || 0,
            'ask': parseFloat(body.ask) || 0,
            'last': parseFloat(body.last_price) || 0
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
  const req_url = base_url + 'cg/tradebook/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb(body.error, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.data.length; t++) {
            trades.push({
              ordertype: body.data[t].side.toString().toUpperCase(),
              price: parseFloat(body.data[t].price) || 0,
              quantity: parseFloat(body.data[t].quantity) || 0,
              timestamp: parseInt(body.data[t].timestamp) / 1000
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
  const req_url = base_url + 'cg/orderbook/' + coin + '_' + exchange + '?depth=100';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.error != null)
      return cb(body.error, null, null);
    else {
      try {
        let buys = [];
        let sells = [];
        const bids = Object.entries(body.bids);
        const asks = Object.entries(body.asks);

        for (let b = 0; b < bids.length; b++) {
          buys.push({
            price: parseFloat(bids[b][0]) || 0,
            quantity: parseFloat(bids[b][1]) || 0
          });
        }

        for (let a = 0; a < asks.length; a++) {
          sells.push({
            price: parseFloat(asks[a][0]) || 0,
            quantity: parseFloat(asks[a][1]) || 0
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
  market_name: 'NestEx',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAe1BMVEUAAAD/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQX/yQVH+eRqAAAAKXRSTlMArGRHvXthTriLf3FsaFVBMhIGpZqRd1o5JBfRysiyj4RdKSDv4NiehahrJacAAACTSURBVBjTdc1XDsIwEEXRce92nN4rbf8rRApRAAnO37vzMfBHq9T2FfQs0efGFmxu3jvFIYtuSM+Q3HRUYXHHuQHHACXrhb+CQJDMul1MRQCXAdIoCHS8tXGCGosSCoSQIVg+TIUzeicAnubSs2ZjfsyR238UtRC0r0itCOw4kpSxkWYWDqHX3bUcPJwaPhV8hZ+exboH2W57FV0AAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
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