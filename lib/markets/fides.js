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
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACy0lEQVR4nIVTW0hUURTd55z7mjvTzGTOTBaWIUYlEkTQi6ConwiJHkN9BFEJvYgCiSCCO/fbj94UaGQPChyKqJ+IpFAo0SLI/EhSiaSycvTOzB3nnnvn7D6cSktr/Zy9D2evzTp7bYC/Qf6Ii7lBp3g7NRCR7I2fi0y4IZPPqbsBAEDD7hv+wS/W6SwXi7iK9wtB/GrlRKXjslTrk+O3d8TjLJlMCgDASQQISJr3NKufh8ZOjnyFxGiBD4t50krQnBI7z9ZxmeL3786ztrYTXRMbUgAAwzAoAYJE9qoDjAV9jsCAYMGwzZSryfrOchK4THlBDYeldes3nNlXW9sY+ymJGmBQ0zRF06qL85UcXSMB9ASAQBAUGdLOQQCAhgd1GVXGqzqwUU3GtbY9stowDAqQIBSMca5I1LfRH1a+yGnPDhOZyG4efZxuP7u/MXZo7aXNM1NSiNtSazQITYyR4V8SEsXAV6qO0Iyo8ZWrHRzs5yFKiSqw7FuX81bleIFEkd5rPdzvyaxbVxiapikMA0BKFD+wLXcrgjI+13udCnXWjOa0w4lI40oNlFKGTij9jrQeWHH+TaYX2hVdkbdvujBmmkdfSgkTgADBF84Nx19dSp221E1thJXblOc1naZIyL3p5miNq4oPxC91KooXG8qIe7TgfixOIYEISKiFD72+zOxA1Pda5R7E0Kf5BdUjZfq5U6+ObCxboNyZGyJKySyFz1EwlnxcnxqfXlECAYId6y8vhcUlS0Y/ZjPsU4ENB7w+K8v63YC7UC7VlmWxEMtxF8csfl1ut4ZMMH9bsyXewnqW9OCW7qpdXpWu5XQx4Pbn1DFeqMn7pTwviIHUYKbK0sR9z8Vh89GxNACQCU4EQgDw/da7UcvNVtogdEHI8nyE+nMW/7Ttbt2V6bdnGrTEW9jTndcqAADQQPpT7j+LEJCgYdBxp/0fPwAESUXUPMPJVQAAAABJRU5ErkJggg==',
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