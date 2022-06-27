var request = require('postman-request');
var base_url = 'https://api.freiexchange.com/public/';
const market_url_template = '{url_prefix}/market/{coin}/{base}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/ticker/' + coin;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success != null && body.success == false)
      return cb(body.result.messsage, null);
    else {
      var summary = {};

      if (body[`${coin}_${exchange}`] != null && body[`${coin}_${exchange}`].length > 0) {
        summary['bid'] = body[`${coin}_${exchange}`][0].highestBuy;
        summary['ask'] = body[`${coin}_${exchange}`][0].lowestSell;
        summary['volume'] = body[`${coin}_${exchange}`][0].volume24h;
        summary['volume_btc'] = body[`${coin}_${exchange}`][0].volume24h_btc;
        summary['low'] = body[`${coin}_${exchange}`][0].low;
        summary['high'] = body[`${coin}_${exchange}`][0].high;
        summary['last'] = body[`${coin}_${exchange}`][0].last;
        summary['change'] = body[`${coin}_${exchange}`][0].percent_change_24h;
      }
      
      return cb(null, summary);
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/trades/' + coin + (exchange == 'LTC' ? '/LTC' : '');

  request({ uri: req_url, json: true }, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success != null && body.success == false)
      return cb(body.result.messsage, null);
    else {
      var trades = [];

      for (var i = 0; i < body.length; i++) {
        // NOTE: timestamp is reduced by 7 hours (3600000ms * 7) to account for the fact the server time seems to display local time to the webserver instead of UTC time)
        trades.push({
          ordertype: body[i].type,
          price: body[i].price,
          quantity: body[i].total_coin,
          timestamp: parseInt((new Date(body[i].time).getTime()-(3600000 * 7))/1000)
        });
      }

      return cb(null, trades);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/orderbook/' + coin + (exchange == 'LTC' ? '/LTC' : '');

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.success != null && body.success == false)
      return cb(body.result.messsage, null);
    else {
      var buys = [];
      var sells = [];

      if (body['BUY'].length > 0) {
        for (var i = 0; i < body['BUY'].length; i++) {
          buys.push({
            price: body['BUY'][i].price,
            quantity: body['BUY'][i].amount
          });
        }
      }

      if (body['SELL'].length > 0) {
        for (var i = 0; i < body['SELL'].length; i++) {
          sells.push({
            price: body['SELL'][i].price,
            quantity: body['SELL'][i].amount
          });
        }
      }

      return cb(null, buys, sells);
    }
  });
}

module.exports = {
  market_name: 'FreiExchange',
  market_name_alt: 'FreiXLite',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTA2LTI2VDE2OjU2OjA2LTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTA2LTI2VDE2OjU2OjA2LTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0wNi0yNlQxNjo1NjowNi0wNjowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpjM2IyNDVkYy1kZDI2LWYwNGEtYmIwYS03OWJjNDhmZTQxMzMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozZWIzNDAxZC00N2U4LTFmNGUtOGYwMi1kZmMzODg0MzFlZWYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3NzY1YTNlYi1mMjRlLWVlNGQtOGM0My0xYTY3NjgzYTNkMTAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjc3NjVhM2ViLWYyNGUtZWU0ZC04YzQzLTFhNjc2ODNhM2QxMCIgc3RFdnQ6d2hlbj0iMjAyMi0wNi0yNlQxNjo1NjowNi0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjM2IyNDVkYy1kZDI2LWYwNGEtYmIwYS03OWJjNDhmZTQxMzMiIHN0RXZ0OndoZW49IjIwMjItMDYtMjZUMTY6NTY6MDYtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz48i0LMAAAC2UlEQVQ4jV1T70tTURh+7z0/7tbcKjT7XdC3QIi0yBD6F/rQl8A+SIUlaISETSVGn6QocFaYWhARTpG0MLAvFQZFEbg+ZVAYVnO7cwuderubc2/vOS2VLjzsfe/O87zPOee5ABwABMAOwcBrGFBjikA7k7UhJm/3c+vhVc7vdjDZcIKJvfsYB9Og9XwDcbYTylXzV8AigSCTzZ+FjOelhSg9iELo3xXqvwmRvcNFWBqGALZegCkY0MPlMHKJK4zjLMEmJLhAW0icJbhUI+E159EtvKQcxE4AuQ30c5NbvYqcAsAZQnwdbMPUIromoJQ4Jj3vwfSBxhGTHUOT4YLXh/PhTsw+G0X3+RhmX77Apf5+jHu8GCNiJhzG+UgEberRNLDJMK/o6UNcDKOaFghg3nXw/8eurCRU6ToZDGJGuSD0ADzSAtNC2r+UPX8AsVBAJxrFaerVVHd8HJ2JKLqZDC6MjGCS3iXBcBp8/ub2+vrGo9XVFZDilhMvCuRTKczGZ3D+chDnzp/DdLBVT87ZNsZMU08m312N9+6fKhrMQkpYTqIosDz5adX6MsGJx3S9MPpUO1ICIYBbTX19tcVlDkzJtS0UXBezX7/gD58P0y1BXFHkkWHM5XJoVxzQt5Rk/Hejr+RSy+kzDYeqqvbDIJeP9SH6N2pJ9+MEft+0GfNUZwYG9HkU1Kg3b/En1YuUD7W+GyCiD/GwyWqQ9qeucXEwgnO073RdHbp0jTYJKetzoRBt4wnGGMMU5UJl4QLjrRQEJWHCNS56VWzT/8JDuUgUg5OkGCeK75MUKEUe5d53AF4KMAUJDEkaArqFHEJlj+I6qyKs4kwEhST1WfUfkV8J9qEUfGUAW4lcphyQAJfgFRYEubg4KWRsWU+yivCg6qeEWOri1g2hvx6LeOpDKl0T2EMCfsbgIOMlbcxzso2Jzg4mHrQzfuc6k2ePc7FrNzll+uQ8qwJ/AJ4ryGtYbOHVAAAAAElFTkSuQmCC',
  market_logo_alt: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTA2LTI2VDE5OjE0OjMzLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTA2LTI2VDE5OjE0OjMzLTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0wNi0yNlQxOToxNDozMy0wNjowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozYjE4MmI1ZC0zZjU3LWVhNGMtYWFiYS01NmQ0YjVkZWVmNTUiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiNWRkYTk5MS02MGNlLTc5NGQtOWFlNy04MDcwY2I3NWVjYzkiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozMjM4NjRhMi0xNjk4LWU0NGUtODA5Yy1iYjc0ZjliM2UyMmEiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjMyMzg2NGEyLTE2OTgtZTQ0ZS04MDljLWJiNzRmOWIzZTIyYSIgc3RFdnQ6d2hlbj0iMjAyMi0wNi0yNlQxOToxNDozMy0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDozYjE4MmI1ZC0zZjU3LWVhNGMtYWFiYS01NmQ0YjVkZWVmNTUiIHN0RXZ0OndoZW49IjIwMjItMDYtMjZUMTk6MTQ6MzMtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4U//lqAAACLUlEQVQ4y42TQUiTYRzGf4GXITsowi4WjIRFXnYLPNRRXSB6M8kCD2J2cAgeJJFEIwRDqA42QmjDTiW2lGkGkRRBGkSktYrUNDZnmOg+9ZvfvqfDNjEx8oWH9/I+//eB/+8hDISBD0AcWIH8GFzagDtJGNyAm+tQOQ98BwzgFTACRMiaR4AZ4DecT8FHgQ5qE8Z/wul14PX+AY+BR8Ay9B1mPKgtqJ4EhoExgHFgHq79z7hZVKSk0ymBZuDsMPAMYA6O5x7Zbrfk9WbkdivtcEgDA9pubdWVzk6F6uslUApib+DYHEACAgJZeXmyUinlTjqRkBmJSJLiNTW63NWl5xUVe4liUHm/pARMWBLI9nhkS9rt79euzyfLspSWJL9fUVBDMKjPpaUSaA2in9rbb/dGImcQmALJ55MkWZK2q6tlR6Oyk0kJ9MLr1dVAIPf7zpfu7oe5pAh2BFJzcyZBU5PMlhZJkm0YEuhBebkuDg0p0NioREGBtVpWNpE0jIW4NIUJywIpGFRa0o7LJUkyp6eVlmT39mrU49GttjZd7+nRUnGxBOlFh6Mr3NEBcbgnkGZnZS0syKqtlR0KyXI6pbo62VVVh671K1yYIoPwCYHkckmFhToKTCbE3gHvASaBH9B+FGNOb+HcHkhPslwn4MZRzAZUjWfxf0qW5zDwDdiCSvMfZTJgYgVO/QJe7u/CGDAKLAIbmftkAvwW3N2FQRP6VqFhEfKXM439a8AfCVrpWXEdq70AAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  market_url: function(settings) {
    return 'https://' + (settings.exchange.toUpperCase() == 'LTC' ? 'freixlite' : 'freiexchange') + '.com';
  },
  isAlt: function(settings) {
    return settings.exchange.toUpperCase() == 'LTC';
  },
  get_data: function(settings, cb) {
    var error = null;
    get_orders(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, buys, sells) {
      if (err) { error = err; }
      get_trades(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, trades) {
        if (err) { error = err; }
        get_summary(settings.coin.toUpperCase(), settings.exchange.toUpperCase(), function(err, stats) {
          if (err) { error = err; }
          return cb(error, {buys: buys, sells: sells, chartdata: [], trades: trades, stats: stats});
        });
      });
    });
  }
};