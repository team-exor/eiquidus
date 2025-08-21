const request = require('postman-request');
const base_url = 'https://trade.nestex.one/api';
const market_url_template = 'https://trade.nestex.one/api/cg/tickers/{coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/cg/tickers/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb((body.error.message != null ? body.error.message : api_error_msg), null);
      else {
        try {
          const summary = {
            'high': parseFloat(body.high) || 0,
            'low': parseFloat(body.low) || 0,
            'volume': parseFloat(body.base_volume) || 0,
            'volume_btc': parseFloat(body.target_volume) || 0,
            'bid': parseFloat(body.bid) || 0,
            'ask': parseFloat(body.ask) || 0,
            'last': parseFloat(body.last_price) || 0,
//            'prev': parseFloat(body.yesterdayPriceNumber) || 0,	// not present in nestex
//            'change': parseFloat(body.changePercentNumber) || 0	// not present in nestex
          };

          return cb(null, summary);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_orders(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/cg/orderbook/' + coin + '_' + exchange;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.error != null)
      return cb((body.error.message != null ? body.error.message : api_error_msg), null, null);
    else {
      try {
        let buys = [];
        let sells = [];

		buys = Object.entries(body.bids).map(BID => {
			return {
				price: BID[0] || 0,
				quantity: BID[1] || 0
			};
		});

		buys = Object.entries(body.asks).map(ASK => {
			return {
				price: ASK[0] || 0,
				quantity: ASK[1] || 0
			};
		});

        return cb(null, buys, sells);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

module.exports = {
  market_name: 'NestEx',
  market_logo: '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',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
         get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats) {
           if (summary_error == null) {
             return cb(null, {buys: buys, sells: sells, stats: stats});
           } else
             return cb(summary_error, null);
         });
      } else
        return cb(order_error, null);
    });
  }
};