var request = require('postman-request');

var base_url = 'https://poloniex.com/public?command=';
  
function get_summary(coin, exchange, cb) {
  var req_url = base_url + 'returnTicker';
  var ticker = exchange + '_' + coin;

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, null);
    } else {
      var retVal = {
        'high': body[ticker].high24hr,
        'low': body[ticker].low24hr,
        'volume': body[ticker].baseVolume,
        'bid': body[ticker].highestBid,
        'ask': body[ticker].lowestAsk,
        'last': body[ticker].last,
        'change': body[ticker].percentChange
      };

      return cb(null, retVal);
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + 'returnTradeHistory&currencyPair=' + exchange + '_' + coin;

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, []);
    } else {
      var trades = [];

      if (body.length > 0) {
          for (var i = 0; i < body.length; i++) {
            var trade = {
              ordertype: body[i]['type'],
              price: body[i]['rate'],
              quantity: body[i]['amount'],
              total: body[i]['total'],
              timestamp: body[i]['date']
            }

            trades.push(trade);
          }
      }

      return cb(null, trades);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + 'returnOrderBook&currencyPair=' + exchange + '_' + coin + '&depth=50';

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, []);
    } else {
      var buys = [];
      var sells = [];

      if (body['bids'].length > 0) {
          for (var i = 0; i < body['bids'].length; i++) {
            var order = {
              price: body.bids[i][0],
              quantity: body.bids[i][1]
            }

            buys.push(order);
          }
      }

      if (body['asks'].length > 0) {
        for (var i = 0; i < body['asks'].length; i++) {
            var order = {
              price: body.asks[i][0],
              quantity: body.asks[i][1]
            }

            sells.push(order);
        }
      }

      return cb(null, buys, sells);
    }
  });
}

function get_chartdata(coin, exchange, cb) { 
  var end = Date.now();
  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + 'returnChartData&currencyPair=' + exchange + '_' + coin + '&start=' + start + '&end=' + end + '&period=1800';

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      if (chartdata.error == null) {
        var processed = [];

        for (var i = 0; i < chartdata.length; i++)
          processed.push([chartdata[i].date * 1000, parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);

        return cb(null, processed);
      } else
        return cb(chartdata.error, []);
    }
  });
}

module.exports = {
  market_name: 'Poloniex',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};