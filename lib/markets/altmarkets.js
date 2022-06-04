var request = require('postman-request');
var base_url = 'https://v2.altmarkets.io/api/v2/peatio/public/markets/';
var api_error_msg = 'api did not return any data';
const market_url_template = 'https://v2.altmarkets.io/trading/{coin}{base}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + coin.toLowerCase() + exchange.toLowerCase() + '/tickers';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      // check for null body as the apis do not work all the time for some reason
      if (body != null) {
        if (body.errors)
          return cb(body.errors, null);
        else {
          req_url = base_url + coin.toLowerCase() + exchange.toLowerCase() + '/order-book?asks_limit=1&bids_limit=1';
          
          request({uri: req_url, json: true}, function (error, response, order_body) {
            if (error)
              return cb(error, null);
            else {
              // check for null body as the apis do not work all the time for some reason
              if (body != null) {
                if (body.errors)
                  return cb(body.errors, null);
                else {
                  var summary = {};

                  summary['bid'] = (order_body != null && order_body['bids'] != null && order_body['bids'].length > 0 ? order_body['bids'][0]['price'] : 0);
                  summary['ask'] = (order_body != null && order_body['asks'] != null && order_body['asks'].length > 0 ? order_body['asks'][0]['price'] : 0);
                  summary['volume'] = body['ticker']['amount'];
                  summary['volume_btc'] = body['ticker']['volume'];
                  summary['high'] = body['ticker']['high'];
                  summary['low'] = body['ticker']['low'];
                  summary['last'] = body['ticker']['last'];
                  summary['change'] = parseFloat(body['ticker']['price_change_percent'].replace('%', ''));

                  return cb(null, summary);
                }
              }
            }
          });
        }
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + coin.toLowerCase() + exchange.toLowerCase() + '/trades?limit=50&order_by=desc';

  request({uri: req_url, json: true}, function (error, response, body) {
    // check for null body as the apis do not work all the time for some reason
    if (body != null) {
      if (body.errors != null)
        return cb(body.errors, null);
      else {
        var trades = [];

        if (body.length > 0) {
          for (var i = 0; i < body.length; i++) {
            var trade = {
              ordertype: body[i]['taker_type'].toUpperCase(),
              price: body[i]['price'],
              quantity: body[i]['amount'],
              total: body[i]['total'],
              timestamp: body[i]['created_at']
            };

            trades.push(trade);
          }
        }

        return cb(null, trades);
      }
    } else
      return cb(api_error_msg, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + coin.toLowerCase() + exchange.toLowerCase() + '/depth';

  request({uri: req_url, json: true}, function (error, response, body) {
    // check for null body as the apis do not work all the time for some reason
    if (body != null) {
      if (body.errors)
        return cb(body.errors, [], []);
      else {
        var orders = body;
        var buys = [];
        var sells = [];

        if (orders['bids'].length > 0) {
          for (var i = 0; i < orders['bids'].length; i++) {
            var order = {
              price: orders.bids[i][0],
              quantity: orders.bids[i][1]
            };

            buys.push(order);
          }
        }

        if (orders['asks'].length > 0) {
          for (var i = orders['asks'].length - 1; i >= 0; i--) {
            var order = {
              price: orders.asks[i][0],
              quantity: orders.asks[i][1]
            };

            sells.push(order);
          }
        }

        return cb(null, buys, sells.reverse());
      }
    } else
      return cb(api_error_msg, [], []);
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + coin.toLowerCase() + exchange.toLowerCase() + '/k-line?time_from=' + parseInt(start) + '&time_to=' + parseInt(end) + '&period=15';

  request({uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      // check for null chartdata as the apis do not work all the time for some reason
      if (chartdata != null) {
        if (chartdata.errors == null) {
          var processed = [];

          for (var i = 0; i < chartdata.length; i++)
            processed.push([chartdata[i][0] * 1000, chartdata[i][1], chartdata[i][2], chartdata[i][3], chartdata[i][4]]);

          return cb(null, processed);
        } else
          return cb(chartdata.errors, []);
      } else
        return cb(api_error_msg, []);
    }
  });
}

module.exports = {
  market_name: 'AltMarkets',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAd1QTFRFAAAAMCUILCIHUT4LnngRHxcFAQEBDAoFDQoDAQEANCgKl3MU7bMUzpsRYksNGRQINioLTTsNHxkJBwYEJx4HxJQS/L4S/8AR2aQUj20TKyEIOiwJimkRPS8PDgsFi2kO/8IS97oR1qERv5ARypgStooRKyEGV0IKpX0SOi0NCAcCGBIE058R4aoRb1QOHxgGGBMEYksMVEALDgsDtYkRfF4RJR0JLyQG3KYSg2QQgWIQEw4EAwIBBgUCjGoOtYkSQjMOBAMBOSwLtooTu44S06ASFxIEDQsGgGEO0Z4SVEEQCggDPC8OonsW8LUT87cSUT4KDwsDRjYOnHcQWkUQEg4DBwUCSzoOfmET+rwTSzkJHRcFfl8OaVAP0Z4Rvo8RWEQQTTsLtIgQ/sAR/8ER77QSwpIRtYgQ0p8SmHMRi2kP+bsSjGsRTjwNFhEDlnIQb1UOkW4P77QR0p4Rh2YPgmMP8LUSyZgRaFAQNioIuYwSoHkQclcOblQPcFUPeVwPs4cR97sS1aERb1UPUj8NAwMDNysNoXoR26US46sS6rAS9bgS6K4SqYAQV0IOCAYEIxwMTTsPcVYQgGEPdloQYksQV0MPPzALCggCEg4FJh4JMycKNyoLLSMJ////MmeD5AAAAAFiS0dEnp+yowsAAAAJcEhZcwAAAEgAAABIAEbJaz4AAADlSURBVBjTY2AAAkYmBlTAzMLKxs7BCedzcfPw8vELCAoJQ/giomLiEpJSDNIysnIgPpu8gqKSsoqqGoO6hqYWUEBbR1dPn8PA0IjB2MTUDChgbmFpZc3AYGPLwGBn7+DIwObk7OLqBjbM3cPTy5jB28fXzz8AxA8MClYKCWUIC4+IFNeJ4rCNjomNi0/gYGBIjE1KTklNS8/IzMrOyQW6Li+/oFCpqKi4pLSsvALsh8qq6prauvqGxqbmFkeQQGtbe0dnV3dPb0VfIMTt/RMmTpo8Zeq06TNgvrOZOWv2nLmhYO8CADSQNA1qvj20AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE5LTA0LTE1VDE2OjA5OjAyKzAwOjAwluUC8AAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOS0wNC0xNVQxNjowOTowMiswMDowMOe4ukwAAABGdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuNy44LTkgMjAxNC0wNS0xMiBRMTYgaHR0cDovL3d3dy5pbWFnZW1hZ2ljay5vcmfchu0AAAAAGHRFWHRUaHVtYjo6RG9jdW1lbnQ6OlBhZ2VzADGn/7svAAAAGHRFWHRUaHVtYjo6SW1hZ2U6OmhlaWdodAAxOTIPAHKFAAAAF3RFWHRUaHVtYjo6SW1hZ2U6OldpZHRoADE5MtOsIQgAAAAZdEVYdFRodW1iOjpNaW1ldHlwZQBpbWFnZS9wbmc/slZOAAAAF3RFWHRUaHVtYjo6TVRpbWUAMTU1NTM0NDU0MlGFR58AAAAPdEVYdFRodW1iOjpTaXplADBCQpSiPuwAAABWdEVYdFRodW1iOjpVUkkAZmlsZTovLy9tbnRsb2cvZmF2aWNvbnMvMjAxOS0wNC0xNS8zNjY2MzkwN2U3OWFjMzk0YWEzMTMyNjI2YzUyNjliMi5pY28ucG5naO7VqwAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',  
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin, settings.exchange, function (err, chartdata) {
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