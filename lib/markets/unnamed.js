const request = require('postman-request');
const base_url = 'https://api.unnamed.exchange/v1/Public/';
const market_url_template = 'https://www.unnamed.exchange/Exchange?market={coin}_{base}';

function get_summary(coin, exchange, cb) {
  var summary = {};

  request({ uri: base_url + 'Ticker?market=' + coin + '_' + exchange, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error != null)
      return cb(body.error, null);
    else {
      summary['bid'] = body.highestBuy;
      summary['ask'] = body.lowestSell;
      summary['high'] = body.high;
      summary['low'] = body.low;
      summary['volume'] = body.volume;
      summary['volume_btc'] = body.baseVolume;
      summary['last'] = body.close;
      summary['prev'] = body.open;
      summary['change'] = (body.change);

      return cb(null, summary);
    }
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + 'TradeHistory?market=' + coin + '_' + exchange;

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error != null)
      return cb(body.error, null);
    else {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        trades.push({
          ordertype: body[i].type,
          price: body[i].price,
          quantity: body[i].amount,
          timestamp: parseInt(new Date(body[i].timestamp).getTime()/1000)
        });
      }

      return cb(null, trades);
    }
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + 'OrderBook?market=' + coin + '_' + exchange;

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, [], []);
    else if (body.error != null)
      return cb(body.error, null);
    else {
      var buys = [];
      var sells = [];

      if (body['buy'].length > 0) {
        for (var i = 0; i < body['buy'].length; i++) {
          buys.push({
            price: body['buy'][i].price,
            quantity: body['buy'][i].amount
          });
        }
      }

      if (body['sell'].length > 0) {
        for (var i = 0; i < body['sell'].length; i++) {
          sells.push({
            price: body['sell'][i].price,
            quantity: body['sell'][i].amount
          });
        }
      }

      return cb(null, buys, sells);
    }
  }).on('error', function(err) {
    return cb(error, null, null);
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + 'Chart?market=' + coin + '_' + exchange + '&minutes=15';

  request({uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      if (chartdata.error == null) {
        var processed = [];

        for (var i = 0; i < chartdata.length; i++)
          processed.push([chartdata[i].openTime, parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);

        return cb(null, processed);
      } else
        return cb(chartdata.error, []);
    }
  });
}

module.exports = {
  market_name: 'Unnamed',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABDlBMVEUAAADX4OwlPZ4mPp+wweDT3ezI1um8zeUkN5q4zOURFYMaMZjZ4e3T3esxc8fJ1ecgKZA3dsgxP5wUHos/TqSKrdtIgcyPqNVjebxQarZbjtETG4kRFYQRFYQQEoETGogTG4kVJI4PD38VJI4PD3/n6vDm6e8ucMYPEIDf5e7P2uvI1unI1ukfLZMmOJkiOZwYJY4oQqEaKpKkvuE+e8o9eslIWaoUHYpIWqsVIYwmOZqOsNw4Z7tiktKjt9uBms6Cmc1Gbbyhs9lmislXesGPpdOSpNB2isR3kMkPEYAPD38RFYMWJI4THIgPD38PD38TGocPD38PD38fQaQPD38ucMYPD3/x8fLu7/IQE4IIR+7cAAAAVXRSTlMA8+HY1PHm3t7c0Sv07+vj4t/f3tbR0dDOzszEvKaNe2EuIBsF/fv5+fbu6efm5N/e3dzZ2NbW1tXV1NHQzszMzMvKycnGxsbEv7SenJSPZ01FKh8NaswLygAAALtJREFUGNN1z8UaglAUReGDlIDdXWB3d3fnJd7/RYT7OXCga7b/2YY/JXn+8b3vDopy3I7dsAS4q8vu9dpdOVkTjSldOtYQQmO6J2tPfb8OAbqF9HyWgCwAiPysaEM4p2XaF2DvV2j0Ka34wxArVwrZIcdxbNNmrVdPABBhR0zQ4wkSTjYCRlFqzphTKRPRpqIYYosVYwYwEb7JGUN8syxhCK3jGBLbvDrQQc3sEhiEGkm6Adwk2Uj++P0G4e4ajxm8wgsAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};