const request = require('postman-request');
const base_url = 'https://v2.altmarkets.io/api/v2/peatio/public/markets/';
const market_url_template = 'https://v2.altmarkets.io/trading/{coin}{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const ticker_url = base_url + coin + exchange + '/tickers';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: ticker_url, json: true}, function (tic_error, tic_response, tic_body) {
      if (tic_error)
        return cb(tic_error, null);
      else if (tic_body == null || tic_body == '' || typeof tic_body !== 'object')
        return cb(api_error_msg, null);
      else if (tic_body.errors != null)
        return cb(tic_body.errors, null);
      else {
        const order_url = base_url + coin + exchange + '/order-book?asks_limit=1&bids_limit=1';

        // pause for 2 seconds before continuing
        rateLimit.schedule(function() {
          request({uri: order_url, json: true}, function (order_error, order_response, order_body) {
            if (order_error)
              return cb(order_error, null);
            else if (order_body == null || order_body == '' || typeof order_body !== 'object')
              return cb(api_error_msg, null);
            else if (order_body.errors != null)
              return cb(order_body.errors, null);
            else {
              try {
                const summary = {
                  'high': parseFloat(tic_body.ticker.high) || 0,
                  'low': parseFloat(tic_body.ticker.low) || 0,
                  'volume': parseFloat(tic_body.ticker.amount) || 0,
                  'volume_btc': parseFloat(tic_body.ticker.volume) || 0,
                  'bid': parseFloat(order_body != null && order_body.bids != null && order_body.bids.length > 0 ? order_body.bids[0].price : 0) || 0,
                  'ask': parseFloat(order_body != null && order_body.asks != null && order_body.asks.length > 0 ? order_body.asks[0].price : 0) || 0,
                  'last': parseFloat(tic_body.ticker.last) || 0,
                  'change': parseFloat(tic_body.ticker.price_change_percent.toString().replace('%', '')) || 0
                };

                return cb(null, summary);
              } catch(err) {
                return cb(api_error_msg, null);
              }
            }
          });
        });
      }
    });
  });
}

function get_trades(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + coin + exchange + '/trades?limit=50&order_by=desc';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.errors != null)
        return cb(body.errors, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].taker_type.toString().toUpperCase(),
              price: parseFloat(body[t].price) || 0,
              quantity: parseFloat(body[t].amount) || 0,
              timestamp: parseInt(body[t].created_at)
            });
          }

          return cb(null, trades);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_orders(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + coin + exchange + '/depth';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.errors != null)
      return cb(body.errors, null, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.bids.length; b++) {
          buys.push({
            price: parseFloat(body.bids[b][0]) || 0,
            quantity: parseFloat(body.bids[b][1]) || 0
          });
        }

        for (let s = 0; s < body.asks.length; s++) {
          sells.push({
            price: parseFloat(body.asks[s][0]) || 0,
            quantity: parseFloat(body.asks[s][1]) || 0
          });
        }

        return cb(null, buys, sells);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

function get_chartdata(coin, exchange, api_error_msg, cb) {
  const end = Date.now() / 1000;
  const start = end - 86400;
  const req_url = base_url + coin + exchange + '/k-line?time_from=' + parseInt(start).toString() + '&time_to=' + parseInt(end).toString() + '&period=15';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.errors != null)
        return cb(body.errors, null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.length; c++)
            chartdata.push([
              parseInt(body[c][0]) * 1000,
              parseFloat(body[c][1]) || 0,
              parseFloat(body[c][2]) || 0,
              parseFloat(body[c][3]) || 0,
              parseFloat(body[c][4]) || 0
            ]);

          return cb(null, chartdata);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

module.exports = {
  market_name: 'AltMarkets',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAd1QTFRFAAAAMCUILCIHUT4LnngRHxcFAQEBDAoFDQoDAQEANCgKl3MU7bMUzpsRYksNGRQINioLTTsNHxkJBwYEJx4HxJQS/L4S/8AR2aQUj20TKyEIOiwJimkRPS8PDgsFi2kO/8IS97oR1qERv5ARypgStooRKyEGV0IKpX0SOi0NCAcCGBIE058R4aoRb1QOHxgGGBMEYksMVEALDgsDtYkRfF4RJR0JLyQG3KYSg2QQgWIQEw4EAwIBBgUCjGoOtYkSQjMOBAMBOSwLtooTu44S06ASFxIEDQsGgGEO0Z4SVEEQCggDPC8OonsW8LUT87cSUT4KDwsDRjYOnHcQWkUQEg4DBwUCSzoOfmET+rwTSzkJHRcFfl8OaVAP0Z4Rvo8RWEQQTTsLtIgQ/sAR/8ER77QSwpIRtYgQ0p8SmHMRi2kP+bsSjGsRTjwNFhEDlnIQb1UOkW4P77QR0p4Rh2YPgmMP8LUSyZgRaFAQNioIuYwSoHkQclcOblQPcFUPeVwPs4cR97sS1aERb1UPUj8NAwMDNysNoXoR26US46sS6rAS9bgS6K4SqYAQV0IOCAYEIxwMTTsPcVYQgGEPdloQYksQV0MPPzALCggCEg4FJh4JMycKNyoLLSMJ////MmeD5AAAAAFiS0dEnp+yowsAAAAJcEhZcwAAAEgAAABIAEbJaz4AAADlSURBVBjTY2AAAkYmBlTAzMLKxs7BCedzcfPw8vELCAoJQ/giomLiEpJSDNIysnIgPpu8gqKSsoqqGoO6hqYWUEBbR1dPn8PA0IjB2MTUDChgbmFpZc3AYGPLwGBn7+DIwObk7OLqBjbM3cPTy5jB28fXzz8AxA8MClYKCWUIC4+IFNeJ4rCNjomNi0/gYGBIjE1KTklNS8/IzMrOyQW6Li+/oFCpqKi4pLSsvALsh8qq6prauvqGxqbmFkeQQGtbe0dnV3dPb0VfIMTt/RMmTpo8Zeq06TNgvrOZOWv2nLmhYO8CADSQNA1qvj20AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE5LTA0LTE1VDE2OjA5OjAyKzAwOjAwluUC8AAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOS0wNC0xNVQxNjowOTowMiswMDowMOe4ukwAAABGdEVYdHNvZnR3YXJlAEltYWdlTWFnaWNrIDYuNy44LTkgMjAxNC0wNS0xMiBRMTYgaHR0cDovL3d3dy5pbWFnZW1hZ2ljay5vcmfchu0AAAAAGHRFWHRUaHVtYjo6RG9jdW1lbnQ6OlBhZ2VzADGn/7svAAAAGHRFWHRUaHVtYjo6SW1hZ2U6OmhlaWdodAAxOTIPAHKFAAAAF3RFWHRUaHVtYjo6SW1hZ2U6OldpZHRoADE5MtOsIQgAAAAZdEVYdFRodW1iOjpNaW1ldHlwZQBpbWFnZS9wbmc/slZOAAAAF3RFWHRUaHVtYjo6TVRpbWUAMTU1NTM0NDU0MlGFR58AAAAPdEVYdFRodW1iOjpTaXplADBCQpSiPuwAAABWdEVYdFRodW1iOjpVUkkAZmlsZTovLy9tbnRsb2cvZmF2aWNvbnMvMjAxOS0wNC0xNS8zNjY2MzkwN2U3OWFjMzk0YWEzMTMyNjI2YzUyNjliMi5pY28ucG5naO7VqwAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',  
  get_data: function(settings, cb) {
    // ensure coin info is lowercase
    settings.coin = settings.coin.toLowerCase();
    settings.exchange = settings.exchange.toLowerCase();

    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
        get_trades(settings.coin, settings.exchange, settings.api_error_msg, function(trade_error, trades) {
          if (trade_error == null) {
            get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats) {
              if (summary_error == null) {
                get_chartdata(settings.coin, settings.exchange, settings.api_error_msg, function (chart_error, chartdata) {
                  if (chart_error == null)
                    return cb(null, {buys: buys, sells: sells, trades: trades, stats: stats, chartdata: chartdata});
                  else
                    return cb(chart_error, null);
                });
              } else
                return cb(summary_error, null);
            });
          } else
            return cb(trade_error, null);
        });
      } else
        return cb(order_error, null);
    });
  }
};