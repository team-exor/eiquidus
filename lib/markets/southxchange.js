const request = require('postman-request');
const base_url = 'https://www.southxchange.com/api/v3/';
const market_url_template = 'https://market.southxchange.com/Market/Book/{coin}/{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + 'price/' + coin + '/' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.Message != null)
        return cb(body.Message, null);
      else {
        try {
          const summary = {
            'volume': parseFloat(body.Volume24Hr) || 0,
            'bid': parseFloat(body.Bid) || 0,
            'ask': parseFloat(body.Ask) || 0,
            'last': parseFloat(body.Last) || 0,
            'change': parseFloat(body.Variation24Hr) || 0
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
  const req_url = base_url + 'trades/' + coin + '/' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.Message != null)
        return cb(body.Message, null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].Type,
              price: parseFloat(body[t].Price) || 0,
              quantity: parseFloat(body[t].Amount) || 0,
              timestamp: parseInt(body[t].At)
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
  const req_url = base_url + 'book/' + coin + '/' + exchange;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
      else if (body.Message != null)
        return cb(body.Message, null, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.BuyOrders.length; b++) {
          buys.push({
            price: parseFloat(body.BuyOrders[b].Price) || 0,
            quantity: parseFloat(body.BuyOrders[b].Amount) || 0
          });
        }

        for (let s = 0; s < body.SellOrders.length; s++) {
          sells.push({
            price: parseFloat(body.SellOrders[s].Price) || 0,
            quantity: parseFloat(body.SellOrders[s].Amount) || 0
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
  const req_url = base_url + 'history/' + coin + '/' + exchange + '/' + start.toString() + '/' + end.toString() + '/96';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.Message != null)
        return cb(body.Message, null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.length; c++) {
            // only display every 3rd data point (every 15 mins)
            if ((c % 3) == 0)
              chartdata.push([
                parseInt(new Date(body[c].Date.toString() + 'Z').getTime()),
                parseFloat(body[c].PriceOpen) || 0,
                parseFloat(body[c].PriceHigh) || 0,
                parseFloat(body[c].PriceLow) || 0,
                parseFloat(body[c].PriceClose) || 0
              ]);
          }

          return cb(null, chartdata);
        } catch(err) {
          return cb(api_error_msg, null);
        }
      }
    });
  });
}

module.exports = {
  market_name: 'SouthXchange',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIxLTA0LTE5VDIwOjIyOjMwLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIxLTA0LTE5VDIwOjIyOjMwLTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMS0wNC0xOVQyMDoyMjozMC0wNjowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1MTkzODFlNC1lZDllLWE0NDAtOWE4OC0xZWI1YWU2NjNhZDIiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpmNGVmOTA2Ny0yMDgxLTVlNDUtYTE1NS1iN2I2MjM5ZTc5MDgiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjNWIwOWE5Ni0xOGU1LTNjNDAtODNkZi0wNDExNTliNWQxYTIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmM1YjA5YTk2LTE4ZTUtM2M0MC04M2RmLTA0MTE1OWI1ZDFhMiIgc3RFdnQ6d2hlbj0iMjAyMS0wNC0xOVQyMDoyMjozMC0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MTkzODFlNC1lZDllLWE0NDAtOWE4OC0xZWI1YWU2NjNhZDIiIHN0RXZ0OndoZW49IjIwMjEtMDQtMTlUMjA6MjI6MzAtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4izsm6AAABl0lEQVQ4EWNw6j61F4j/AvEnKL4NxFzuc54yWObNZpAT42dQVJBnUFJS8gDiD0D8CYr/A3EpA1CxLhD/R8M73Oc+Y7DImc4gK8LDoKiowAVU/BWqCYYfATEbyAAQTkY3BOiCZMvcWQyyQpycQAN2o2kGYWkgZoAZAMLbkA1wmXjlv1PvWQ4VDW0xOWHO/0oqqsiaU0Ca0Q3gBOKvcEO6Tvz3mP/ymEX2NAZpXsYORXk5mOYdMM3oBoCwJ4pXes/+91z4PlvHJZJBipPhm7KqGsgAbnwGgPB8ZFe4Trvz32XydUkVDS0jSTaGRDlhLgZZJIzNABA+DTPEsePof/e5zz87tB1i0HGJYNDzTGTQ906BY8IGdB7/7z7r8Wf7hh0Muq5RRBkwH0Xz7CcgWlJBWtwIGA4EvYAIxK6TwKi8/N9j7vNsTSt3BmkeYCBCohJnIKJGY/dpoN+fHTMKK2GQ5mLoQEoDOKMRNSFNvv7foe0wh5Kigpi8uMB/JWVlvAkJS1J+kmyZPxeYmfg4gZkJb1KmODNRlJ0BM1qMnKOfxJsAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
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