var request = require('postman-request');
var base_url = 'https://api.crex24.com/v2/public';
const market_url_template = 'https://crex24.com/exchange/{coin}-{base}';

function get_summary(coin, exchange, cb) {
  var url=base_url + '/tickers?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({uri: url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var summary = {};

      summary['ask'] = body[0]['ask'];
      summary['bid'] = body[0]['bid'];
      summary['volume'] = body[0]['baseVolume'];
      summary['volume_btc'] = body[0]['volumeInBtc'];
      summary['high'] = body[0]['high'];
      summary['low'] = body[0]['low'];
      summary['last'] = body[0]['last'];
      summary['change'] = body[0]['percentChange'];

      return cb(null, summary);
    } else
      return cb(error, null);
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/recentTrades?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i].side,
          quantity: body[i].volume,
          price: body[i].price,
          timestamp: parseInt(new Date(body[i].timestamp).getTime()/1000)
        };

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.Message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/orderBook?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase();

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var buys = [];
      var sells = [];

      if (body['buyLevels'].length > 0) {
        for (var i = 0; i < body['buyLevels'].length; i++) {
          var order = {
            price: body['buyLevels'][i].price,
            quantity: body['buyLevels'][i].volume
          };

          buys.push(order);
        }
      }

      if (body['sellLevels'].length > 0) {
        for (var i = 0; i < body['sellLevels'].length; i++) {
          var order = {
            price: body['sellLevels'][i].price,
            quantity: body['sellLevels'][i].volume
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.Message, [], []);
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + '/ohlcv?instrument=' + coin.toUpperCase() + '-' + exchange.toUpperCase() + '&granularity=15m&limit=100';

  request({ uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      var processed = [];

      for (var i = 0; i < chartdata.length; i++) {
        // only keep values from within the last 24 hours
        if (new Date(chartdata[i].timestamp).getTime()/1000 > start)
          processed.push([new Date(chartdata[i].timestamp).getTime(), parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);
      }

      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Crex24',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDE5OjE5OjU5LTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDE5OjE5OjU5LTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQxOToxOTo1OS0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpkYTI0ZGM1Ny04NjA2LTY1NDctYjYyYi05YWZjZWM3Y2NjNTkiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpjNzhhNDlhMy0xMTRiLWQ1NGUtOWMxZC0xNjQzNTBjNTYzYmUiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjYzVhYTU1Yy0wYmJkLTQ5NDktOTM1OS03M2U3MGQ5OGYzZDciIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjYzVhYTU1Yy0wYmJkLTQ5NDktOTM1OS03M2U3MGQ5OGYzZDciIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMTk6MTk6NTktMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZGEyNGRjNTctODYwNi02NTQ3LWI2MmItOWFmY2VjN2NjYzU5IiBzdEV2dDp3aGVuPSIyMDIwLTEyLTI1VDE5OjE5OjU5LTA3OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+IfYWJwAAASNJREFUOI2d0j9LQlEYx/GLBLZELjkUNYiDSJOTEI1Z0Njg0NLUW1AQxSUaRBtsqsFojAh6A7U0RLWUkYuIGOHWUkH0h/w+cMTD05GuXfjAvfd5np/ec47nqWv68CCMWWQwrutDL5rHEMEajiXI0RNFAgFXwAYKSOPWUd/Gj3GOCd1QRwlbuFG1FL6tAHHSL84Z8rKKO7RUwDryuFIhS1JcxSYaeMSLKc44PmNRBdTk5TKayKpiWQ0HsK96Wp7ZsjYucGkVv7BiBVTUsHiXQg4L6OJDNcjzHoroOAJe7e15cjT85V4Cpv45PFgnbubNQo4yLGsU6wfI/p/iGs8+A6r2FoXMAfL762cI6kMyiSMff3v317AKSqImhwSfeMMDdhDX/T08PJuH3XSmHgAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'u',
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