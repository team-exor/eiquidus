var request = require('postman-request');
var base_url = 'https://poloniex.com/public?command=';
const market_url_template = 'https://www.poloniex.com/exchange/{base}_{coin}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + 'returnTicker';
  var ticker = exchange + '_' + coin;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.error)
      return cb(body.error, null);
    else {
      var retVal = {
        'high': body[ticker].high24hr,
        'low': body[ticker].low24hr,
        'volume': body[ticker].baseVolume,
        'bid': body[ticker].highestBid,
        'ask': body[ticker].lowestAsk,
        'last': body[ticker].last,
        'change': body[ticker].percentChange
      };

      return cb(null, retVal);
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + 'returnTradeHistory&currencyPair=' + exchange + '_' + coin;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.error)
      return cb(body.error, []);
    else {
      var trades = [];

      if (body.length > 0) {
        for (var i = 0; i < body.length; i++) {
          var trade = {
            ordertype: body[i]['type'],
            price: body[i]['rate'],
            quantity: body[i]['amount'],
            total: body[i]['total'],
            timestamp: parseInt(new Date(body[i]['date'] + 'Z').getTime()/1000)
          };

          trades.push(trade);
        }
      }

      return cb(null, trades);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + 'returnOrderBook&currencyPair=' + exchange + '_' + coin + '&depth=50';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.error)
      return cb(body.error, []);
    else {
      var buys = [];
      var sells = [];

      if (body['bids'].length > 0) {
        for (var i = 0; i < body['bids'].length; i++) {
          var order = {
            price: body.bids[i][0],
            quantity: body.bids[i][1]
          };

          buys.push(order);
        }
      }

      if (body['asks'].length > 0) {
        for (var i = 0; i < body['asks'].length; i++) {
          var order = {
            price: body.asks[i][0],
            quantity: body.asks[i][1]
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    }
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + 'returnChartData&currencyPair=' + exchange + '_' + coin + '&start=' + start + '&end=' + end + '&period=1800';

  request({uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      if (chartdata.error == null) {
        var processed = [];

        for (var i = 0; i < chartdata.length; i++)
          processed.push([chartdata[i].date * 1000, parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);

        return cb(null, processed);
      } else
        return cb(chartdata.error, []);
    }
  });
}

module.exports = {
  market_name: 'Poloniex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDIwOjU1OjMzLTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDIwOjU1OjMzLTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQyMDo1NTozMy0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMzU0YTQ5My02M2VlLTQ3NDUtOTAyMC1jZjQ5ZTZlODRlNDQiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDowZTZlOTkxZi05YTM4LTgxNDAtYTlmMS0yMGU3MThjOTU5YjMiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDplNzcwYmQ5Zi1kMzM2LTliNGQtYmVhMC0wOTIwNjZkNDIwZDIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmU3NzBiZDlmLWQzMzYtOWI0ZC1iZWEwLTA5MjA2NmQ0MjBkMiIgc3RFdnQ6d2hlbj0iMjAyMC0xMi0yNVQyMDo1NTozMy0wNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDphMzU0YTQ5My02M2VlLTQ3NDUtOTAyMC1jZjQ5ZTZlODRlNDQiIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMjA6NTU6MzMtMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4yAdy4AAACnUlEQVQ4y11TS09TQRid9raFloIY45/wHUNijEsXBjeKC40r3Wrig7b0AS229AVIotISATdiSohuVJDYEkXjxsSFCQlEDSASdvIwo4BiheOZK1x6bTLp3PnOOd/3nZlPOJKpOVs8IUWDXwqPT4p6rxTBkHSn0tKWSEqNq5J7EQgy5iGGcV+DVBw7ucIajRX33exAW6GA8PM8EoURnM/1QzQ2wZVMoZJLhBpxNpdDYmQE4Xwe7fw/QI6NXLGLGXY0hTH2eQalvzM9PbAEgrAFQ6jr7jbFxme+oCocgeIKF8uzU2B/uhW/VlYM0PzCAjR/AO5IM1alNM5//1zFoXQbLKzQmUxJobEXVSr7w6X+flOm7KvX2Hndg8WlJePs8sAAsV5UkWNV3pWxDJoFZ0tcD7wZHzeJnLvTiaPxhL4fm5qElYlcxNJAKK5wbApUsAUX+zrIwOL3H4bAV5Zf4fHB+/ARau9264a6iVUcx5YAFwSzVDMgvD5cuN9nquLdh48QV67CwgS2VHqLbBawlAhc7HtgEng7MQGNAlokAjsF7PH/BOz8cLe2wklnD7e149vyskH+ND+Psmv1SAwOoa73HkQgpLegbQnoJipDoi3QmH1scsqU/TiFT9y6re8nZ2dRRkx5LLZtInuXbnWNvC7/00ETOfD4CXaTgLU148w/NKRfeTVbsahrZDnSzgdzKtMFrK8bwPdT0xStRzkf2cRMySvd2MDpbBds5FSoGXFFY3IPK0BJ33/4ImtS9ISuq1WTTqO4srotQuxechRXWCPNxWOZLDpGRxEaHkacg3Kyp5dzEEI5y3TSMAvnoZZnsXwBgWfDaH/xEkc6M9CabxQFQXMi1vJvTL2b49zYJFV52uY466XyTB9nhVFYZlfcv+GHou2DaH9cAAAAAElFTkSuQmCC',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};