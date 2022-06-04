var request = require('postman-request');
var base_url = 'https://api3.stex.com/public';
const market_url_template = 'https://app.stex.com/en/trading/pair/{base}/{coin}/1D';

function get_summary(coin, exchange, stex_id, cb) {
  var summary = {};

  request({ uri: base_url + '/ticker/' + stex_id, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success === true) {
      summary['bid'] = body.data['bid'];
      summary['ask'] = body.data['ask'];
      summary['volume'] = body.data['volumeQuote'];
      summary['volume_btc'] = body.data['volume'];
      summary['high'] = body.data['high'];
      summary['low'] = body.data['low'];
      summary['last'] = body.data['last'];
      summary['change'] = body.data['change'];

      return cb(null, summary);
    } else
      return cb(error, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_trades(coin, exchange, stex_id, cb) {
  var req_url = base_url + '/trades/' + stex_id + '?sort=DESC&limit=100';

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (body.success == true) {
      var trades = [];

      for (var i = 0; i < body.data.length; i++) {
        var trade = {
          ordertype: body.data[i].type,
          price: body.data[i].price,
          quantity: body.data[i].amount,
          timestamp: body.data[i].timestamp
        };

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.message, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_orders(coin, exchange, stex_id, cb) {
  var req_url = base_url + '/orderbook/' + stex_id + '?limit_bids=100&limit_asks=100';

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (body.success == true) {
      var orders = body.data;
      var buys = [];
      var sells = [];

      if (orders['bid'].length > 0) {
        for (var i = 0; i < orders['bid'].length; i++) {
          var order = {
            price: orders.bid[i].price,
            quantity: orders.bid[i].amount
          };

          buys.push(order);
        }
      }

      if (orders['ask'].length > 0) {
        for (var i = 0; i < orders['ask'].length; i++) {
          var order = {
            price: orders.ask[i].price,
            quantity: orders.ask[i].amount
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.message, [], []);
  }).on('error', function(err) {
    return cb(error, null, null);
  });
}

function get_chartdata(coin, exchange, stex_id, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;
  
  var req_url = base_url + '/chart/' + stex_id + '/30?timeStart=' + start + '&timeEnd=' + end + '&limit=1800&candlesType=1D';

  request({ uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      if (chartdata.success == true) {
        var processed = [];

        for (var i = 0; i < chartdata.data.length; i++)
          processed.push([chartdata.data[i].time, parseFloat(chartdata.data[i].open), parseFloat(chartdata.data[i].high), parseFloat(chartdata.data[i].low), parseFloat(chartdata.data[i].close)]);

        return cb(null, processed);
      } else
        return cb(chartdata.message, []);
    }
  });
}

function get_pair_id(coin, exchange, cb) {
  // Lookup the currency pair id needed to use the stex api
  request({ uri: base_url + '/currency_pairs/list/' + exchange, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success === true) {
      var stex_id = 0;
      // Find the currency pair
      for (i = 0; i < body.data.length; i++) {
        if (body.data[i].currency_code.toUpperCase() == coin.toUpperCase()) {
          stex_id = body.data[i].id;
          break;
        }
      }

      return cb(null, stex_id);
    } else
      return cb(error, null);
  }).on('error', function(err) {
    return cb(error, null);
  });
}

module.exports = {
  market_name: 'Stex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDE5OjQwOjAyLTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDE5OjQwOjAyLTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQxOTo0MDowMi0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmNDY0MzUwOS1lMDg4LTZlNDUtYTRjNS1hNDQyMmFlOTJhMjEiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDoyNTQzNzIxNy05NDM4LTc2NDYtYThjZS05OWMxMjAwMGViMDQiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxYWY2Y2I0Zi05ZTJlLTJlNGYtOGEzMC0yYTE2OTQ3Njc5YmYiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxYWY2Y2I0Zi05ZTJlLTJlNGYtOGEzMC0yYTE2OTQ3Njc5YmYiIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMTk6NDA6MDItMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZjQ2NDM1MDktZTA4OC02ZTQ1LWE0YzUtYTQ0MjJhZTkyYTIxIiBzdEV2dDp3aGVuPSIyMDIwLTEyLTI1VDE5OjQwOjAyLTA3OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+1hd2ZgAAAIlJREFUKBVjYBgFRIBv377tAANpaekVK1Z8+PDhxIkTBgYGGzZsOHPmzIEDB4BsPz+/S5cuzZ49e8aMGQzPnz8Hyn38+JGPjw+oH6hCQUEByAAKbtq0acGCBSIiIkDu+vXr3717x83NzbALDH79+iUgIICmAW5DSEjIlStXZs2aNW/evNE4oQkAAC8ZS4smAdEcAAAAAElFTkSuQmCC',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
    get_pair_id(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function (err, stex_id) {
      get_chartdata(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, chartdata) {
        if (err) { chartdata = []; error = err; }
        get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, buys, sells) {
          if (err) { error = err; }
          get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, trades) {
            if (err) { error = err; }
            get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), stex_id, function (err, stats) {
              if (err) { error = err; }
              return cb(error, { buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats });
            });
          });
        });
      });
    });
  }
};