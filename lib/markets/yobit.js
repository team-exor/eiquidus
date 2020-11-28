var request = require('postman-request');

var base_url = 'https://yobit.io/api/3';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/ticker/' + coin + '_' + exchange;
  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else {
      if (body.message)
        return cb(body.message, null);
      else {
        var summary = {};

        summary['bid'] = body[coin + '_' + exchange]['buy'];
        summary['ask'] = body[coin + '_' + exchange]['sell'];
        summary['volume'] = body[coin + '_' + exchange]['vol'];
        summary['high'] = body[coin + '_' + exchange]['high'];
        summary['low'] = body[coin + '_' + exchange]['low'];
        summary['last'] = body[coin + '_' + exchange]['last'];

        return cb(null, summary);
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/trades/' + coin + '_' + exchange;

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else {
      if (body.message)
        return cb(body.message, null);
      else {
        var trades = [];

        for (var i = 0; i < body[coin + '_' + exchange].length; i++) {
          var trade = {
            ordertype: (body[coin + '_' + exchange][i]['type'].toLowerCase() == 'bid' ? 'BUY' : 'SELL'),
            price: body[coin + '_' + exchange][i].price,		  
            quantity: body[coin + '_' + exchange][i].amount,
            timestamp: new Date(body[coin + '_' + exchange][i].timestamp * 1000).toUTCString()
          }

          trades.push(trade);
        }

        return cb(null, trades);
      }
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/depth/' + coin + '_' + exchange;

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.success == 0)
      return cb(body.error, null, null);
    else {
      var orders = body[coin + '_' + exchange];
      var buys = [];
      var sells = [];

      if (orders['bids'].length > 0){
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

      return cb(null, buys, sells);
    }
  });
}

module.exports = {
  market_name: 'Yobit',
  get_data: function(settings, cb) {
    var error = null;
    get_orders(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, buys, sells) {
      if (err) { error = err; }
      get_trades(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, trades) {
        if (err) { error = err; }
        get_summary(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, stats) {
          if (err) { error = err; }
          return cb(error, {buys: buys, sells: sells, chartdata: [], trades: trades, stats: stats});
        });
      });
    });
  }
};