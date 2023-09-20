const request = require('postman-request');
const base_url = 'https://api.xeggex.com/api/v2';
const market_url_template = 'https://xeggex.com/market/{coin}_{base}';

function get_summary(coin, exchange, cb) {
  const req_url = base_url + '/market/getbysymbol/' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error != null)
      return cb(body.error.message, null);
    else {
      var retVal = {
        'high': body.highPriceNumber,
        'low': body.lowPriceNumber,
        'volume': body.volumeNumber,
        'volume_btc': body.volumeUsdNumber,
        'bid': body.bestBidNumber,
        'ask': body.bestAskNumber,
        'last': body.lastPriceNumber,
        'prev': body.yesterdayPriceNumber,
        'change': body.changePercentNumber
      };

      return cb(null, retVal);
    }
  }).on('error', function(err) {
    return cb(err, null);
  });
}

function get_trades(coin, exchange, cb) {
  const req_url = base_url + '/historical_trades?ticker_id=' + coin + '_' + exchange + '&limit=300' ;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error != null)
      return cb(body.error.message, null);
    else {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i]['type'],
          price: parseFloat(body[i]['price']),
          quantity: parseFloat(body[i]['base_volume']),
          timestamp: parseInt(new Date(body[i]['trade_timestamp']).getTime()/1000)
        };

        trades.push(trade);
      }

      return cb(null, trades);
    }
  }).on('error', function(err) {
    return cb(err, null);
  });
}

function get_orders(coin, exchange, cb) {
  const req_url = base_url + '/market/getorderbookbysymbol/' + coin + '_' + exchange

  request({uri: req_url, json: true}, function (error, response, body)  {
    if (error)
      return cb(error, [], []);
    else if (body.error != null)
      return cb(body.error.message, [], []);
    else {
      var orders = body;
      var buys = [];
      var sells = [];

      if (orders['bids'].length > 0) {
        for (var i = 0; i < orders['bids'].length; i++) {
          var order = {
            price: orders.bids[i].numberprice,
            quantity: parseFloat(orders.bids[i].quantity)
          };

          buys.push(order);
        }
      }

      if (orders['asks'].length > 0) {
        for (var i = 0; i < orders['asks'].length; i++) {
          var order = {
            price: orders.asks[i].numberprice,
            quantity: parseFloat(orders.asks[i].quantity)
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    }
  }).on('error', function(err) {
    return cb(err, null, null);
  });
}

module.exports = {
  market_name: 'Xeggex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAsVBMVEUAAABvY0FMTUHMoUJZV0FDSkFJTUG7l0KNd0GGcUF3akF8bEH4xEL4x0PzuUPzuUPgskPhukPetEPVs0LLpUK8n0KpjUGli0G4lkKagEJSU0H+zkPzv0PktUPWq0PeuELTqEPHnULYtEPSqkLar0LRqUPIokPKokO3lEK2k0K+m0K0kkKniEFmYEFlX0H/0kT/00P/6UT/1UP/40P/4EP/2UP/60T/5UP/xUP+xEP9xEOWOrtXAAAAL3RSTlMAKwjKGQ0Fk2BQRDz89/Hw69POxbWso52OaBX69+7kysjIw7+8u66soJ6Ig3kjHAzaxeEAAACkSURBVBjThc03gsIwFADRkRyxyRl2yTl+SbZJ9z8YhQsKCl431fBlaBoPMTHEIs+GiQiahdevOh3m1b7nJgH4poPvWrp3YSlXgIrtou4ebG0FAA4Wle8Y3SJKYaLyNiprf1Y1E/Inn17ZlHWWpiGl0+1MlCfc92Un2QbmVtEtL2OZ4feClozpGB/0tPAG/5nWrjZYFM2Ao6u/xIwgNvKouyE/vQGJsQ9k11uR2AAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
      get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin, settings.exchange, function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin, settings.exchange, function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, trades: trades, stats: stats});
        });
      });
    });
  }
};