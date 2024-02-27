const request = require('postman-request');
const base_url = 'https://api.xeggex.com/api/v2';
const market_url_template = 'https://xeggex.com/market/{coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/market/getbysymbol/' + coin + '_' + exchange;

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
            'high': parseFloat(body.highPriceNumber) || 0,
            'low': parseFloat(body.lowPriceNumber) || 0,
            'volume': parseFloat(body.volumeNumber) || 0,
            'volume_btc': parseFloat(body.volumeUsdNumber) || 0,
            'bid': parseFloat(body.bestBidNumber) || 0,
            'ask': parseFloat(body.bestAskNumber) || 0,
            'last': parseFloat(body.lastPriceNumber) || 0,
            'prev': parseFloat(body.yesterdayPriceNumber) || 0,
            'change': parseFloat(body.changePercentNumber) || 0
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
  const req_url = base_url + '/historical_trades?ticker_id=' + coin + '_' + exchange + '&limit=300';

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
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].type,
              price: parseFloat(body[t].price) || 0,
              quantity: parseFloat(body[t].base_volume) || 0,
              timestamp: parseInt(new Date(body[t].trade_timestamp).getTime() / 1000)
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
  const req_url = base_url + '/market/getorderbookbysymbol/' + coin + '_' + exchange;

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

        for (let b = 0; b < body.bids.length; b++) {
          buys.push({
            price: parseFloat(body.bids[b].numberprice) || 0,
            quantity: parseFloat(body.bids[b].quantity) || 0
          });
        }

        for (let s = 0; s < body.asks.length; s++) {
          sells.push({
            price: parseFloat(body.asks[s].numberprice) || 0,
            quantity: parseFloat(body.asks[s].quantity) || 0
          });
        }

        return cb(null, buys, sells);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

function get_chartdata(coin, exchange, api_error_msg, cb) {
  const end = Date.now() / 1000;
  const start = end - 86400;
  const req_url = base_url + '/market/candles/?symbol=' + coin + '_' + exchange + '&from=' + parseInt(start).toString() + '&to=' + parseInt(end).toString() + '&resolution=15' ;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb((body.error.message != null ? body.error.message : api_error_msg), null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.bars.length; c++) {
            chartdata.push([
              parseInt(body.bars[c].time),
              parseFloat(body.bars[c].open) || 0,
              parseFloat(body.bars[c].high) || 0,
              parseFloat(body.bars[c].low) || 0,
              parseFloat(body.bars[c].close) || 0
            ]);
          }

          return cb(null, chartdata);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

module.exports = {
  market_name: 'Xeggex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAsVBMVEUAAABvY0FMTUHMoUJZV0FDSkFJTUG7l0KNd0GGcUF3akF8bEH4xEL4x0PzuUPzuUPgskPhukPetEPVs0LLpUK8n0KpjUGli0G4lkKagEJSU0H+zkPzv0PktUPWq0PeuELTqEPHnULYtEPSqkLar0LRqUPIokPKokO3lEK2k0K+m0K0kkKniEFmYEFlX0H/0kT/00P/6UT/1UP/40P/4EP/2UP/60T/5UP/xUP+xEP9xEOWOrtXAAAAL3RSTlMAKwjKGQ0Fk2BQRDz89/Hw69POxbWso52OaBX69+7kysjIw7+8u66soJ6Ig3kjHAzaxeEAAACkSURBVBjThc03gsIwFADRkRyxyRl2yTl+SbZJ9z8YhQsKCl431fBlaBoPMTHEIs+GiQiahdevOh3m1b7nJgH4poPvWrp3YSlXgIrtou4ebG0FAA4Wle8Y3SJKYaLyNiprf1Y1E/Inn17ZlHWWpiGl0+1MlCfc92Un2QbmVtEtL2OZ4feClozpGB/0tPAG/5nWrjZYFM2Ao6u/xIwgNvKouyE/vQGJsQ9k11uR2AAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
        get_trades(settings.coin, settings.exchange, settings.api_error_msg, function(trade_error, trades) {
          if (trade_error == null) {
            get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats) {
              if (summary_error == null) {
                get_chartdata(settings.coin, settings.exchange, settings.api_error_msg, function (chart_error, chartdata) {
                  if (chart_error == null)
                    return cb(null, {buys: buys, sells: sells, trades: trades, stats: stats, chartdata: chartdata});
                  else
                    return cb(chart_error, null);
                });
              } else
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