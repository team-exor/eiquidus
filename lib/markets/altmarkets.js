var request = require('postman-request');

var base_url = 'https://altmarkets.io/api/v2/';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + 'tickers/' + coin.toLowerCase() + exchange.toLowerCase();

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else {
      if (body.error) {
        return cb(body.error, null);
      } else {
        var summary = {};

        summary['bid'] = body['ticker']['buy'];
        summary['ask'] = body['ticker']['sell'];
        summary['volume'] = body['ticker']['vol'];
        summary['volume_btc'] = body['ticker']['quote_volume'];
        summary['high'] = body['ticker']['high'];
        summary['low'] = body['ticker']['low'];
        summary['last'] = body['ticker']['last'];
        summary['change'] = 0;

        request({ uri: base_url + 'currency/trades?currency=' + coin.toLowerCase(), json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          if (error) {
            return cb(null, summary);
          } else {
            if (body.error) {
              return cb(null, summary);
            } else {
              summary['change'] = 0;
              for (var i = 0; i < body.length; i++) {
                if (exchange.toLowerCase() in body[i]) {
                  summary['change'] = body[i][exchange.toLowerCase()]['change'];
                  break;
                }
              }
              return cb(null, summary);
            }
          }
        });
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + 'trades?market=' + coin.toLowerCase() + '' + exchange.toLowerCase() + '&limit=50&order_by=desc';
  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, null);
    } else {
      var trades = [];

      if (body.length > 0) {
          for (var i = 0; i < body.length; i++) {
            var trade = {
              ordertype: (body[i]['side'].toLowerCase() == 'up' ? 'BUY' : 'SELL'),
              price: body[i]['price'],
              quantity: body[i]['volume'],
              total: body[i]['funds'],
              timestamp: new Date(body[i]['timestamp'] * 1000).toUTCString()
            }

            trades.push(trade);
          }
      }

      return cb(null, trades);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + 'depth?market=' + coin.toLowerCase() + exchange.toLowerCase();

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, [], [])
    } else {
      var orders = body;
      var buys = [];
      var sells = [];

      if (orders['bids'].length > 0) {
        for (var i = 0; i < orders['bids'].length; i++) {
          var order = {
            price: orders.bids[i][0],			  
            quantity: orders.bids[i][1]
          }

          buys.push(order);
        }
      }

      if (orders['asks'].length > 0) {
        for (var i = 0; i < orders['asks'].length; i++) {
          var order = {
            price: orders.asks[i][0],
            quantity: orders.asks[i][1]
          }

          sells.push(order);
        }
      }

      return cb(null, buys, sells.reverse());
    }
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();
  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + 'k/?market=' + coin.toLowerCase() + '' + exchange.toLowerCase() + '&time_from=' + start + '&time_to=' + end + '&period=15';

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      if (chartdata.error == null) {
        var processed = [];

        for (var i = 0; i < chartdata.length; i++)
          processed.push([chartdata[i][0] * 1000, chartdata[i][1], chartdata[i][2], chartdata[i][3], chartdata[i][4]]);

        return cb(null, processed);
      } else {
        return cb(chartdata.error, []);
      }
    }
  });
}

module.exports = {
  market_name: 'AltMarkets',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin, settings.exchange, function (err, chartdata){
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin, settings.exchange, function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin, settings.exchange, function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};