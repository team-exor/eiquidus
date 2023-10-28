const request = require('postman-request');
const base_url = 'https://api.bittrex.com/v3';
const market_url_template = 'https://global.bittrex.com/trade/{coin}-{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const summary_url = base_url + '/markets/' + coin + '-' + exchange + '/summary';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: summary_url, json: true}, function (sum_error, sum_response, sum_body) {
      if (sum_error)
        return cb(sum_error, null);
      else if (sum_body == null || sum_body == '' || typeof sum_body !== 'object')
        return cb(api_error_msg, null);
      else if (sum_body.code != null)
        return cb(sum_body.code, null);
      else {
        const ticket_url = base_url + '/markets/' + coin + '-' + exchange + '/ticker';

        // pause for 2 seconds before continuing
        rateLimit.schedule(function() {
          request({uri: ticket_url, json: true}, function (tic_error, tic_response, tic_body) {
            if (tic_error)
              return cb(tic_error, null);
            else if (tic_body == null || tic_body == '' || typeof tic_body !== 'object')
              return cb(api_error_msg, null);
            else if (tic_body.code != null)
              return cb(tic_body.code, null);
            else {
              try {
                const summary = {
                  'high': parseFloat(sum_body.high) || 0,
                  'low': parseFloat(sum_body.low) || 0,
                  'volume': parseFloat(sum_body.volume) || 0,
                  'bid': parseFloat(tic_body.bidRate) || 0,
                  'ask': parseFloat(tic_body.askRate) || 0,
                  'last': parseFloat(tic_body.lastTradeRate) || 0,
                  'change': parseFloat(sum_body.percentChange) || 0
                };

                return cb(null, summary);
              } catch(err) {
                return cb(api_error_msg, null);
              }
            }
          });
        });
      }
    });
  });
}

function get_trades(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/markets/' + coin + '-' + exchange + '/trades';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.code != null)
        return cb(body.code, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].takerSide,
              price: parseFloat(body[t].rate) || 0,
              quantity: parseFloat(body[t].quantity) || 0,
              timestamp: parseInt(new Date(body[t].executedAt).getTime() / 1000)
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
  const req_url = base_url + '/markets/' + coin + '-' + exchange + '/orderbook?depth=25';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.code != null)
      return cb(body.code, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.bid.length; b++) {
          buys.push({
            price: parseFloat(body.bid[b].rate) || 0,
            quantity: parseFloat(body.bid[b].quantity) || 0
          });
        }

        for (let s = 0; s < body.ask.length; s++) {
          sells.push({
            price: parseFloat(body.ask[s].rate) || 0,
            quantity: parseFloat(body.ask[s].quantity) || 0
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
  const req_url = base_url + '/markets/' + coin + '-' + exchange + '/candles/MINUTE_5/recent';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.code != null)
        return cb(body.code, null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.length; c++) {
            // only display every 3rd data point (every 15 mins) and only more recent than the last 24 hours
            if (new Date(body[c].startsAt).getTime() / 1000 > start && (c % 3) == 0) 
              chartdata.push([
                parseInt(new Date(body[c].startsAt).getTime()),
                parseFloat(body[c].open) || 0,
                parseFloat(body[c].high) || 0,
                parseFloat(body[c].low) || 0,
                parseFloat(body[c].close) || 0
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
  market_name: 'Bittrex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACjElEQVR4nHWTzWtdZRCHn3nf95x789GWlJs2mgRdiEhAEKQhFGmsIBSyFtG1BCy2oII7DUW3biwYyD8QKF0IIrqKxK+NC6GLi8WvhTEkN+GaxBPvPee874yL3GhMdRazmt8sZp5HADATRAyAd79/BhcWwa6gaRIA3CbOraNxhbef+OpkRv4OL33eJJ96H3GL4rPgUgmaBnkPoQEpxqRphWrjTW5d7WMmwgt3PDOXMnz1CaPnn6PYMaIptTrECRgcNQUcrYvCn9016nyB9re1AHCr/SFnL7zqi53KKs2vPn6GN+bG6NWGd4O4wF4/8dqn29Vh3sql6Czb0sx1Yak9Rxa+QVWdmNci8vyT55h9uMnaDwWh4UlqZE744NpFFlZ/ZWMvJsmDs6q+HHDckKwp1isYaXpWX3mUMhpFqTw9P05MSu4d7325y71OSfACphAaQqxvBJB5YglqbmzIM5I57rb3Gc0dX/9ySKqM159tcXl6GDVDBmclloDMB4QJNAIiXuDHbkUjOMaHPd/9fAjAxkGNF7CjRwMiaARhwnGqGl7IHEQ1EIHgaO9WtHdKMi+nxwkYW/gwCZUBIiJ0e4mbs2PMPdQkyz2/9xLBwVMTTQ5KBTHDZUKMWwFsndB4mbLSZPjWsOfj+wX3tkuamaCVMfvIEL3aeOuzbfZKBSdqoeGJ9XpAuU0sX8I5ikqZPhv46MUp+tEQgbpWHmvlvLO+y0+bfcK5AOKgLg3l9r9Akj861dhQyIczQY7vLVBGZa+vxGQoVnHmQs5BZ5mlmesPorzfMWyArchgixlOFMExOi4U3TXSMcqnZBJxi/gsHLHxj0wWGpDqSNIV4kmZ/k9nsyvYQGfxvyHyxX/p/BcTSUaGzEtUTgAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',  
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