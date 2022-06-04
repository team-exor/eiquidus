var request = require('postman-request');
var base_url = 'https://www.southxchange.com/api/v3/';
var api_error_msg = 'api did not return any data';
const market_url_template = 'https://main.southxchange.com/Market/Book/{coin}/{base}';

function get_summary(coin, exchange, cb) {
  var summary = {};

  request({ uri: base_url + 'price/' + coin + '/' + exchange, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body != null && body == '')
      return cb(api_error_msg, null);
    else {
      summary['bid'] = body['Bid'];
      summary['ask'] = body['Ask'];
      summary['volume'] = body['Volume24Hr'];
      summary['last'] = body['Last'];
      summary['change'] = body['Variation24Hr'];

      return cb(null, summary);
    }
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + 'trades/' + coin + '/' + exchange;

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i].Type,
          price: body[i].Price,
          quantity: body[i].Amount,
          timestamp: body[i].At
        };

        trades.push(trade);
      }

      return cb(null, trades);
    }
  }).on('error', function(err) {
    return cb(error, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + 'book/' + coin + '/' + exchange;

  request({ uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, [], []);
    else if (body != null && body == '')
      return cb(api_error_msg, [], []);
    else {
      var orders = body;
      var buys = [];
      var sells = [];

      if (orders['BuyOrders'].length > 0){
        for (var i = 0; i < orders['BuyOrders'].length; i++) {
          var order = {
            price: orders['BuyOrders'][i].Price,
            quantity: orders['BuyOrders'][i].Amount
          };

          buys.push(order);
        }
      }

      if (orders['SellOrders'].length > 0) {
        for (var i = 0; i < orders['SellOrders'].length; i++) {
          var order = {
            price: orders['SellOrders'][i].Price,
            quantity: orders['SellOrders'][i].Amount
          };

          sells.push(order);
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
  var start = end - 86400000;
  var req_url = base_url + 'history/' + coin + '/' + exchange + '/' + start + '/' + end + '/90';

  request({ uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else if (typeof chartdata == 'string' || chartdata instanceof String)
      return cb(chartdata, []);
    else {
      var processed = [];

      for (var i = 0; i < chartdata.length; i++) {
        // only display every 3rd data point (every 15 mins)
        if ((i % 3) == 0) 
          processed.push([new Date(chartdata[i]['Date']).getTime(), parseFloat(chartdata[i]['PriceOpen']), parseFloat(chartdata[i]['PriceHigh']), parseFloat(chartdata[i]['PriceLow']), parseFloat(chartdata[i]['PriceClose'])]);
      }

      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'SouthXchange',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIxLTA0LTE5VDIwOjIyOjMwLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIxLTA0LTE5VDIwOjIyOjMwLTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMS0wNC0xOVQyMDoyMjozMC0wNjowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1MTkzODFlNC1lZDllLWE0NDAtOWE4OC0xZWI1YWU2NjNhZDIiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpmNGVmOTA2Ny0yMDgxLTVlNDUtYTE1NS1iN2I2MjM5ZTc5MDgiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjNWIwOWE5Ni0xOGU1LTNjNDAtODNkZi0wNDExNTliNWQxYTIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmM1YjA5YTk2LTE4ZTUtM2M0MC04M2RmLTA0MTE1OWI1ZDFhMiIgc3RFdnQ6d2hlbj0iMjAyMS0wNC0xOVQyMDoyMjozMC0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MTkzODFlNC1lZDllLWE0NDAtOWE4OC0xZWI1YWU2NjNhZDIiIHN0RXZ0OndoZW49IjIwMjEtMDQtMTlUMjA6MjI6MzAtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4izsm6AAABl0lEQVQ4EWNw6j61F4j/AvEnKL4NxFzuc54yWObNZpAT42dQVJBnUFJS8gDiD0D8CYr/A3EpA1CxLhD/R8M73Oc+Y7DImc4gK8LDoKiowAVU/BWqCYYfATEbyAAQTkY3BOiCZMvcWQyyQpycQAN2o2kGYWkgZoAZAMLbkA1wmXjlv1PvWQ4VDW0xOWHO/0oqqsiaU0Ca0Q3gBOKvcEO6Tvz3mP/ymEX2NAZpXsYORXk5mOYdMM3oBoCwJ4pXes/+91z4PlvHJZJBipPhm7KqGsgAbnwGgPB8ZFe4Trvz32XydUkVDS0jSTaGRDlhLgZZJIzNABA+DTPEsePof/e5zz87tB1i0HGJYNDzTGTQ906BY8IGdB7/7z7r8Wf7hh0Muq5RRBkwH0Xz7CcgWlJBWtwIGA4EvYAIxK6TwKi8/N9j7vNsTSt3BmkeYCBCohJnIKJGY/dpoN+fHTMKK2GQ5mLoQEoDOKMRNSFNvv7foe0wh5Kigpi8uMB/JWVlvAkJS1J+kmyZPxeYmfg4gZkJb1KmODNRlJ0BM1qMnKOfxJsAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};