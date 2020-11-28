var request = require('postman-request'); 

var base_url = 'https://api3.stex.com/public';

function get_summary(coin, exchange, stex_id, cb) {
  var summary = {};

  request({ uri: base_url + '/ticker/' + stex_id, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success === true) {
      summary['bid'] = body.data['bid'];
      summary['ask'] = body.data['ask'];
      summary['volume'] = body.data['volume'];
      summary['high'] = body.data['high'];
      summary['low'] = body.data['low'];
      summary['last'] = body.data['last'];
      summary['change'] = body.data['change'];

      return cb(null, summary);
    } else
      return cb(error, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_trades(coin, exchange, stex_id, cb) {
  var req_url = base_url + '/trades/' + stex_id + '?sort=DESC&limit=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
    if (body.success == true) {
      var trades = [];

      for (var i = 0; i < body.data.length; i++) {
        var trade = {
          ordertype: body.data[i].type,
          price: body.data[i].price,		  
          quantity: body.data[i].amount,
          timestamp: new Date(body.data[i].timestamp * 1000).toUTCString()
        }

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.message, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_orders(coin, exchange, stex_id, cb) {
  var req_url = base_url + '/orderbook/' + stex_id + '?limit_bids=100&limit_asks=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
    if (body.success == true) {
      var orders = body.data;
      var buys = [];
      var sells = [];

      if (orders['bid'].length > 0){
        for (var i = 0; i < orders['bid'].length; i++) {
          var order = {
            price: orders.bid[i].price,
            quantity: orders.bid[i].amount
          }

          buys.push(order);
        }
      }

      if (orders['ask'].length > 0) {
        for (var i = 0; i < orders['ask'].length; i++) {
          var order = {
            price: orders.ask[i].price,
            quantity: orders.ask[i].amount
          }

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.message, [], []);
  }).on('error', function(err) {
    return cb(error, null, null);
  });
}

function get_chartdata(coin, exchange, stex_id, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400; 
  
  var req_url = base_url + '/chart/' + stex_id + '/30?timeStart=' + start + '&timeEnd=' + end + '&limit=1800&candlesType=1D';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      if (chartdata.success == true) {
        var processed = [];

        for (var i = 0; i < chartdata.data.length; i++)
          processed.push([chartdata.data[i].time, parseFloat(chartdata.data[i].open), parseFloat(chartdata.data[i].high), parseFloat(chartdata.data[i].low), parseFloat(chartdata.data[i].close)]);

        return cb(null, processed);
      } else
        return cb(chartdata.message, []);
    }
  });
}

function get_pair_id(coin, exchange, cb) {
  // Lookup the currency pair id needed to use the stex api
  request({ uri: base_url + '/currency_pairs/list/' + exchange, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success === true) {
      var stex_id = 0;
      // Find the currency pair
      for (i = 0; i < body.data.length; i++) {
        if (body.data[i].currency_code.toUpperCase() == coin.toUpperCase()) {
          stex_id = body.data[i].id;
          break;
        }
      }

      return cb(null, stex_id);
    } else
      return cb(error, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

module.exports = {
  market_name: 'Stex',
  get_data: function(settings, cb) {
    var error = null;
    get_pair_id(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, stex_id) {
      get_chartdata(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, chartdata) {
        if (err) { chartdata = []; error = err; }
        get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, buys, sells) {
          if (err) { error = err; }
          get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, trades) {
            if (err) { error = err; }
            get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, stats) {
              if (err) { error = err; }
              return cb(error, { buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats });
            });
          });
        });
      });
    });
  }
};