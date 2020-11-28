var request = require('postman-request');

var base_url = 'https://api.crex24.com/v2/public';

function get_summary(coin, exchange, cb) {
  var url=base_url + '/tickers?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({uri: url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else if (body.error !== true) {
      var summary = {};

      summary['ask'] = body[0]['ask'];
      summary['bid'] = body[0]['bid'];
      summary['volume'] = body[0]['baseVolume'];
      summary['volume_btc'] = body[0]['volumeInBtc'];
      summary['high'] = body[0]['high'];
      summary['low'] = body[0]['low'];
      summary['last'] = body[0]['last'];
      summary['change'] = body[0]['percentChange'];

      return cb(null, summary);
    } else {
      return cb(error, null);
    }
  });   
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/recentTrades?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i].side,
          quantity: body[i].volume,
          price: body[i].price,
          timestamp: body[i].timestamp
        }

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.Message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/orderBook?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var buys = [];
      var sells = [];

      if (body['buyLevels'].length > 0) {
        for (var i = 0; i < body['buyLevels'].length; i++) {
          var order = {
            price: body['buyLevels'][i].price,
            quantity: body['buyLevels'][i].volume
          }

          buys.push(order);
        }
      }

      if (body['sellLevels'].length > 0) {
        for (var i = 0; i < body['sellLevels'].length; i++) {
          var order = {
            price: body['sellLevels'][i].price,
            quantity: body['sellLevels'][i].volume
          }

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.Message, [], [])
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400; 
  
  var req_url = base_url + '/ohlcv?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase() + '&granularity=15m&limit=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      var processed = [];

      for (var i = 0; i < chartdata.length; i++)
        processed.push([new Date(chartdata[i].timestamp).getTime(), parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);

      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Crex24',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin, settings.exchange, function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin, settings.exchange, function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin, settings.exchange,  function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};