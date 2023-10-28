const request = require('postman-request');
const base_url = 'https://yobit.net/api/3';
const market_url_template = 'https://yobit.net/en/trade/{coin}/{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/ticker/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.success == 0)
        return cb((body.error != null ? body.error : api_error_msg), null);
      else {
        try {
          const prefix = body[coin + '_' + exchange];
          const summary = {
            'high': parseFloat(prefix.high) || 0,
            'low': parseFloat(prefix.low) || 0,
            'volume': parseFloat(prefix.vol) || 0,
            'bid': parseFloat(prefix.buy) || 0,
            'ask': parseFloat(prefix.sell) || 0,
            'last': parseFloat(prefix.last) || 0
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
  const req_url = base_url + '/trades/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.success == 0)
        return cb((body.error != null ? body.error : api_error_msg), null);
      else {
        try {
          const prefix = body[coin + '_' + exchange];
          let trades = [];

          for (let t = 0; t < prefix.length; t++) {
            trades.push({
              ordertype: (prefix[t].type.toLowerCase() == 'bid' ? 'BUY' : 'SELL'),
              price: parseFloat(prefix[t].price) || 0,
              quantity: parseFloat(prefix[t].amount) || 0,
              timestamp: parseInt(prefix[t].timestamp)
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
  const req_url = base_url + '/depth/' + coin + '_' + exchange;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.success == 0)
      return cb((body.error != null ? body.error : api_error_msg), null, null);
    else {
      try {
        const prefix = body[coin + '_' + exchange];
        let buys = [];
        let sells = [];

        for (let b = 0; b < prefix.bids.length; b++) {
          buys.push({
            price: parseFloat(prefix.bids[b][0]) || 0,
            quantity: parseFloat(prefix.bids[b][1]) || 0
          });
        }

        for (let s = 0; s < prefix.asks.length; s++) {
          sells.push({
            price: parseFloat(prefix.asks[s][0]) || 0,
            quantity: parseFloat(prefix.asks[s][1]) || 0
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
  market_name: 'Yobit',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAEsUExURQCZ2ACV1gCY2ACO1ACR1QCT1gCP1AKa2AGZ2AOa2QCX1wOa2AGa2ACS1QCU1gCV1wSb2QCY1wGV16Pc8tLu+Q6c2QCa2ASa2Ruk3DKt4AKZ2Aud2nrL61y/5gGS1QOb2WLB6Cyr3wOW1wSZ2GrE6XrK6zKu4EC04lG65eH1+1C75bjk9Syq3s7t+HjK64DN7ACQ1eT2/AOY2Lnk9Fq+55PV70y45Kne8hCd2sXq98vs+IXN7IrQ7YvR7gOR1ZnX8ASa2FG35Aec2WDB5wmd2tXw+QCM0zuu4Aab2QOO1AKS1ZXW70a24wGX153Z8ard8giY2Aub2QWb2bvm9cTp9mbC6GXC6MPo9h6j3Cap3iKo3iGo3s3s+Cus34nR7d3z+n3M7ACQ1Nry+tjy+pKA2eoAAADASURBVBjTY2AgDLjZgQQnkObkFuAAMsX4+HkYGHiZ2Fl5WVmYgAL8MuqsnIJxUSxmwuZ6yoI8DKwahqLMCcGeoa6O7sLaSlIM8sx+3hHxogFJkcyMbFZavAwcRoEhyT7MsTEcnE52tjZsDAwCBmHhib7RIkwOLmym+kABTjkTf68gIUtnNzYLTTU+oACLgjGLh5COiL21rior0FEcXBKSXBw8jNKyKoogPhBwMQIJdiYWFkYIn4EDTHNwirMzEAMA6McVLdcDhkkAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    // ensure coin info is lowercase
    settings.coin = settings.coin.toLowerCase();
    settings.exchange = settings.exchange.toLowerCase();

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