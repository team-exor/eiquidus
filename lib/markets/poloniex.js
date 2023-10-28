const request = require('postman-request');
const base_url = 'https://api.poloniex.com/markets/';
const market_url_template = 'https://poloniex.com/trade/{coin}_{base}?type=spot';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + coin + '_' + exchange + '/ticker24h';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.message != null)
        return cb(body.message, null);
      else {
        try {
          const summary = {
            'high': parseFloat(body.high) || 0,
            'low': parseFloat(body.low) || 0,
            'volume': parseFloat(body.quantity) || 0,
            'volume_btc': parseFloat(body.amount) || 0,
            'bid': parseFloat(body.bid) || 0,
            'ask': parseFloat(body.ask) || 0,
            'change': parseFloat(body.dailyChange || 0) * 100
          };

          return cb(null, summary);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

function get_trades(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + coin + '_' + exchange + '/trades';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.message != null)
        return cb(body.message, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].takerSide,
              price: parseFloat(body[t].price) || 0,
              quantity: parseFloat(body[t].quantity) || 0,
              timestamp: parseInt(new Date(body[t].ts).getTime() / 1000)
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
  const req_url = base_url + coin + '_' + exchange + '/orderBook?limit=50';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.message != null)
      return cb(body.message, null, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.bids.length; b += 2) {
          buys.push({
            price: parseFloat(body.bids[b]) || 0,
            quantity: parseFloat(body.bids[b + 1]) || 0
          });
        }

        for (let s = 0; s < body.asks.length; s += 2) {
          sells.push({
            price: parseFloat(body.asks[s]) || 0,
            quantity: parseFloat(body.asks[s + 1]) || 0
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
  const end = Date.now();
  const start = end - 86400000;
  const req_url = base_url + coin + '_' + exchange + '/candles?interval=MINUTE_15&limit=96&startTime=' + start.toString() + '&endTime=' + end.toString();

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.message != null)
        return cb(body.message, null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.length; c++)
            chartdata.push([
              parseInt(body[c][9]),
              parseFloat(body[c][2]) || 0,
              parseFloat(body[c][1]) || 0,
              parseFloat(body[c][0]) || 0,
              parseFloat(body[c][3]) || 0
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
  market_name: 'Poloniex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDIwOjU1OjMzLTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDIwOjU1OjMzLTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQyMDo1NTozMy0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMzU0YTQ5My02M2VlLTQ3NDUtOTAyMC1jZjQ5ZTZlODRlNDQiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDowZTZlOTkxZi05YTM4LTgxNDAtYTlmMS0yMGU3MThjOTU5YjMiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDplNzcwYmQ5Zi1kMzM2LTliNGQtYmVhMC0wOTIwNjZkNDIwZDIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmU3NzBiZDlmLWQzMzYtOWI0ZC1iZWEwLTA5MjA2NmQ0MjBkMiIgc3RFdnQ6d2hlbj0iMjAyMC0xMi0yNVQyMDo1NTozMy0wNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDphMzU0YTQ5My02M2VlLTQ3NDUtOTAyMC1jZjQ5ZTZlODRlNDQiIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMjA6NTU6MzMtMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4yAdy4AAACnUlEQVQ4y11TS09TQRid9raFloIY45/wHUNijEsXBjeKC40r3Wrig7b0AS229AVIotISATdiSohuVJDYEkXjxsSFCQlEDSASdvIwo4BiheOZK1x6bTLp3PnOOd/3nZlPOJKpOVs8IUWDXwqPT4p6rxTBkHSn0tKWSEqNq5J7EQgy5iGGcV+DVBw7ucIajRX33exAW6GA8PM8EoURnM/1QzQ2wZVMoZJLhBpxNpdDYmQE4Xwe7fw/QI6NXLGLGXY0hTH2eQalvzM9PbAEgrAFQ6jr7jbFxme+oCocgeIKF8uzU2B/uhW/VlYM0PzCAjR/AO5IM1alNM5//1zFoXQbLKzQmUxJobEXVSr7w6X+flOm7KvX2Hndg8WlJePs8sAAsV5UkWNV3pWxDJoFZ0tcD7wZHzeJnLvTiaPxhL4fm5qElYlcxNJAKK5wbApUsAUX+zrIwOL3H4bAV5Zf4fHB+/ARau9264a6iVUcx5YAFwSzVDMgvD5cuN9nquLdh48QV67CwgS2VHqLbBawlAhc7HtgEng7MQGNAlokAjsF7PH/BOz8cLe2wklnD7e149vyskH+ND+Psmv1SAwOoa73HkQgpLegbQnoJipDoi3QmH1scsqU/TiFT9y6re8nZ2dRRkx5LLZtInuXbnWNvC7/00ETOfD4CXaTgLU148w/NKRfeTVbsahrZDnSzgdzKtMFrK8bwPdT0xStRzkf2cRMySvd2MDpbBds5FSoGXFFY3IPK0BJ33/4ImtS9ISuq1WTTqO4srotQuxechRXWCPNxWOZLDpGRxEaHkacg3Kyp5dzEEI5y3TSMAvnoZZnsXwBgWfDaH/xEkc6M9CabxQFQXMi1vJvTL2b49zYJFV52uY466XyTB9nhVFYZlfcv+GHou2DaH9cAAAAAElFTkSuQmCC',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    // ensure coin info is uppercase
    settings.coin = settings.coin.toUpperCase();
    settings.exchange = settings.exchange.toUpperCase();

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