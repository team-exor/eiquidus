var request = require('postman-request');
var base_url = 'https://bleutrade.com/api/v3/public';
const market_url_template = 'https://bleutrade.com/en/trade/pro/{coin}/{base}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/getmarketsummary?market=' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      if (body.message)
        return cb(body.message, null);
      else {
        var retVal = {
          'high': body.result.High,
          'low': body.result.Low,
          'volume': body.result.Volume,
          'bid': body.result.Bid,
          'ask': body.result.Ask,
          'last': body.result.Last,
          'prev': body.result.PrevDay
        };

        return cb (null, retVal);
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/getmarkethistory?market=' + coin + '_' + exchange + '&count=50';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.success) {
      var trades = [];

      if (body.result.length > 0) {
          for (var i = 0; i < body.result.length; i++) {
            var trade = {
              ordertype: body.result[i]['OrderType'],
              price: body.result[i]['Price'],
              quantity: body.result[i]['Quantity'],
              total: body.result[i]['Total'],
              timestamp: parseInt(new Date(body.result[i]['TimeStamp']).getTime()/1000)
            };

            trades.push(trade);
          }
      }

      return cb(null, trades);
    } else
      return cb(body.message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/getorderbook?market=' + coin + '_' + exchange + '&type=all' + '&depth=50';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.success) {
      var orders = body.result;
      var buys = [];
      var sells = [];

      if (orders['buy'].length > 0) {
        for (var i = 0; i < orders['buy'].length; i++) {
          var order = {
            price: orders.buy[i].Rate,
            quantity: orders.buy[i].Quantity
          };

          buys.push(order);
        }
      }

      if (orders['sell'].length > 0) {
        for (var i = 0; i < orders['sell'].length; i++) {
          var order = {
            price: orders.sell[i].Rate,
            quantity: orders.sell[i].Quantity
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.message, [], []);
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + '/getcandles/?market=' + coin + '_' + exchange + '&period=1h';

  request({ uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      if (chartdata.success) {
        var processed = [];

        for (var i = 0; i < chartdata.result.length; i++) {
          // only take values more recent than the last 24 hours
          if (new Date(chartdata.result[i].TimeStamp).getTime()/1000 > start)
            processed.push([new Date(chartdata.result[i].TimeStamp).getTime(), parseFloat(chartdata.result[i].Open), parseFloat(chartdata.result[i].High), parseFloat(chartdata.result[i].Low), parseFloat(chartdata.result[i].Close)]);
        }

        return cb(null, processed);
      } else
        return cb(chartdata.message, []);
    }
  });
}

module.exports = {
  market_name: 'Bleutrade',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDIwOjQ5OjE3LTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDIwOjQ5OjE3LTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQyMDo0OToxNy0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmMmFhNzBmOS0wM2E2LTM1NGYtOGZhZi1lMDYyY2UyNzhjNzMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDoxNGY2YjlkNi0yYWFhLWRjNDItODQzNS04ZDRhY2Q4OTg2MTEiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo1YWJmZTUzNi04NmUxLWU0NGMtOWYzYy05NzAxZTZkNjhlNTYiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjVhYmZlNTM2LTg2ZTEtZTQ0Yy05ZjNjLTk3MDFlNmQ2OGU1NiIgc3RFdnQ6d2hlbj0iMjAyMC0xMi0yNVQyMDo0OToxNy0wNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmMmFhNzBmOS0wM2E2LTM1NGYtOGZhZi1lMDYyY2UyNzhjNzMiIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMjA6NDk6MTctMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4YuftVAAADR0lEQVQ4EU3B3WvVdRwH8Pf36fd0ns/ObE43k2liUYLOKHvaqEldGETDi6iIqIvsIu8DhS4y+gOWdRtCFFq07oxYD2BgWEN2laYeth23nXN+7vx++z1/v5+IUHy9mPXxFdxPSw5r1YezfucVO9cH7CSHyPLFtFX9Nq15qF3voHAs3CWZIdxDBCZFJXesr5nnvEh5ATCGapxC9YN5I/hrWskQ95F52cE9jIEV5nujzZRWwqgkn1OF5kaKE+V+cMz2w3l/pDENAhgR/iNJStxFSrzMomzKHkR+zQ+eI8u6yg1hq+J+AWN+rvrBlBsmM1qIi0xrAAySCP8zBHA8Q0pAEn2llboKDqgkhYyxyA19Q4y/01zuTrNCXyzKDkCAFMaAPAtkCATehuBIRodMWHEwdGsdWO6CCw6ZFVomGbJ6abV7YDc2JvdAdHxwBgJjDNT0mmoQTkAb6LHWWxhvHeYAmDYI66XHo5r3ZiYFbj718P72G1PNeKSJcMcQOBhgHHUc3XCp8cffH7grXZDnlOBZv8YV92xYL3+22awsDBplNxhpoHXlnxPW5WtL4JgVQQLBZ96bNp77A29vlKvtjUu1Tu/CYLQZkq0eynYNT0ZKTlJvS5WS7EduaL7e8cntDfb3n9x3nAfxAjeOfQqDGJVO/xwnOsK1OVlb7s44f934HJzD7B1FKUrmvEE0w/LiZFT3jtgrvXO83YXe2TzNcPY6gXOMXFraYfXD1aRVBUoW0sI0AtfpmUfGaeynxZrV6YfR9gaYNjC5Gdt4/rG2ntiWS2hTgDO5fnCPNBUXUBxj3/0OJ8l5US+DxQlYmtlpqxp2XjoEZBosSjkNVYA4I85BCxAcplk6jaYHlBxkyoI3iM54hWZWN+DBA40zK0cPghMAR4Iq9il4Ckj1b5LFyUdipf8Cba+9zaJkr9qMf7GT9HC1HxwVxuD2+DbwIHqX4uxBqpcug/SzEOxpFAbcDz9k1id/At3gdXn7zpxjdKXaHcDNC4hCR4aL83HZAbSeLSzL7R2aQLxrGFR1A9Hx35frm18y69NFYCuBc62z09Zmthwmw1aU9Aslzxspbqq0QFKydttR+qoYxI21J/at+dOPXpA31pZFEONfwAie3PFmXOIAAAAASUVORK5CYII=',
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
          get_summary(settings.coin, settings.exchange, function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};