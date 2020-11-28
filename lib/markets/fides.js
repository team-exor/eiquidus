var request = require('postman-request');

var base_url = 'https://node1.fides-ex.com';

function get_summary(coin, exchange, cb) {
  var url = base_url + '/market/get-market-summary/' + exchange.toUpperCase() + '_' + coin.toUpperCase();

  request({uri: url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else if (body.errorMessage !== true) {
      var summary = {};

      summary['ask'] = body['data']['LowestAsk'];
      summary['bid'] = body['data']['HeighestBid'];
      summary['volume'] = body['data']['QuoteVolume'];
      summary['volume_btc'] = body['data']['BaseVolume'];
      summary['high'] = body['data']['High_24hr'];
      summary['low'] = body['data']['Low_24hr'];
      summary['last'] = body['data']['Last'];
      summary['change'] = body['data']['PercentChange'];

      return cb(null, summary);
    } else {
      return cb(error, null);
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/market/get-trade-history/' + exchange.toUpperCase() + '_' + coin.toUpperCase();

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.errorMessage)
      return cb(body.errorMessage, []);
    else {
      var trades = [];

      for (var i = 0; i < body['data'].length; i++) {
        var trade = {
          ordertype: body['data'][i].Type,
          quantity: body['data'][i].Volume,
          price: body['data'][i].Rate,
          total: body['data'][i].Total,
          timestamp: body['data'][i].Date
        }

        trades.push(trade);
      }

      return cb(null, trades);
    }
  });
}

function get_orders_side(coin, exchange, side, cb){
  var req_url = base_url + '/market/get-open-orders/' + exchange.toUpperCase() + '_' + coin.toUpperCase() + '/' + side.toUpperCase() + '/10';

  request({uri: req_url, json:true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.errorMessage)
      return cb(body.errorMessage, []);
    else if (body.errorMessage !== true) {
      var orders = [];

      if (body['data'].Orders.length > 0) {
        for (var i = 0; i < body['data'].Orders.length; i++) {
          var order = {
            price: body['data'].Orders[i].Rate,
            quantity: body['data'].Orders[i].Volume
          }

          orders.push(order);
        }

        return cb(null, orders);
      } else
        return cb(null, []);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var buyorders = get_orders_side(coin, exchange, 'buy', function(err, buys) {
    var sellorders = get_orders_side(coin, exchange, 'sell', function(err, sells) {
      return cb(null, buys, sells);
    });
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400; 

  var req_url = base_url + '/market/get-chart-data?baseCurrency=' + coin.toUpperCase() + '&quoteCurrency=' + exchange.toUpperCase() + '&timestamp=' + (end * 1000).toString() + '&interval=15&limit=200';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else if (chartdata.errorMessage)
      return cb(chartdata.errorMessage, []);
    else {
      var processed = [];

      for (var i = 0; i < chartdata.data.length; i++) {
        // only take values more recent than the last 24 hours
        if (new Date(chartdata.data[i].time).getTime()/1000 > start) {
          processed.push([chartdata.data[i].time, parseFloat(chartdata.data[i].open), parseFloat(chartdata.data[i].high), parseFloat(chartdata.data[i].low), parseFloat(chartdata.data[i].close)]);
        }
	  }

      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Fides-Ex',
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