var request = require('postman-request');

var base_url = 'https://bleutrade.com/api/v3/public';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/getmarketsummary?market=' + coin + '_' + exchange;
  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else {
      if (body.message) {
        return cb(body.message, null)
      } else {
        var retVal = {
          'high': body.result.High,
          'low': body.result.Low,
          'volume': body.result.Volume,
          'bid': body.result.Bid,
          'ask': body.result.Ask,
          'last': body.result.Last,
          'prev': body.result.PrevDay
        };

        return cb (null, retVal);
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/getmarkethistory?market=' + coin + '_' + exchange + '&count=50';
  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.success) {
      var trades = [];

      if (body.result.length > 0) {
          for (var i = 0; i < body.result.length; i++) {
            var trade = {
              ordertype: body.result[i]['OrderType'],
              price: body.result[i]['Price'],
              quantity: body.result[i]['Quantity'],
              total: body.result[i]['Total'],
              timestamp: body.result[i]['TimeStamp']
            }

            trades.push(trade);
          }
      }

      return cb(null, trades);
    } else {
      return cb(body.message, null);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/getorderbook?market=' + coin + '_' + exchange + '&type=all' + '&depth=50';
  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.success) {
      var orders = body.result;
      var buys = [];
      var sells = [];

      if (orders['buy'].length > 0) {
        for (var i = 0; i < orders['buy'].length; i++) {
          var order = {
            price: orders.buy[i].Rate,
            quantity: orders.buy[i].Quantity
          }

          buys.push(order);
        }
      }

      if (orders['sell'].length > 0) {
        for (var i = 0; i < orders['sell'].length; i++) {
          var order = {
            price: orders.sell[i].Rate,
            quantity: orders.sell[i].Quantity
          }

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else {
      return cb(body.message, [], [])
    }
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400; 
  
  var req_url = base_url + '/getcandles/?market=' + coin + '_' + exchange + '&period=1h';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      if (chartdata.success) {
        var processed = [];

        for (var i = 0; i < chartdata.result.length; i++) {
          // only take values more recent than the last 24 hours
          if (new Date(chartdata.result[i].TimeStamp).getTime()/1000 > start) {
            processed.push([new Date(chartdata.result[i].TimeStamp).getTime(), parseFloat(chartdata.result[i].Open), parseFloat(chartdata.result[i].High), parseFloat(chartdata.result[i].Low), parseFloat(chartdata.result[i].Close)]);
          }
        }

        return cb(null, processed);
      }
      else
        return cb(chartdata.message, []);
    }
  });
}

module.exports = {
  market_name: 'Bleutrade',
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