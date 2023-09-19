var request = require('postman-request');
var base_url = 'https://api.xeggex.com/api/v2';
const market_url_template = 'https://xeggex.com/market/{coin}_{base}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/market/getbysymbol/' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      if (body.message)
        return cb(body.message, null);
      else {
        var retVal = {
          'high': body.highPriceNumber,
          'low': body.lowPriceNumber,
          'volume': body.volumeUsdNumber,
          'bid': body.bestBidNumber,
          'ask': body.bestAskNumber,
          'last': body.lastPriceNumber,
          'prev': body.yesterdayPriceNumber
        };

        return cb (null, retVal);
      }
    }
  });
}

function formatTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);  // Convert to milliseconds
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} UTC`;
}
function get_trades(coin, exchange, cb) {

    // Now proceed to the second API request
    var req_url = base_url + '/historical_trades?ticker_id=' + coin + '_' + exchange + '&limit=300' ;

    request({uri: req_url, json: true}, function (error, response, body) {
      if (error) return cb(error, null);

      var trades = [];

      if (body.length > 0) {
        for (var i = 0; i < body.length; i++) {
          var trade = {
            ordertype: body[i]['type'],
            price: body[i]['price'],
            quantity: body[i]['base_volume'],
            timestamp: formatTimestamp(parseInt(new Date(body[i]['trade_timestamp']).getTime()/1000))
          };
          trades.push(trade);
        }
      }
      return cb(null, trades);
    });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/market/getorderbookbysymbol/' + coin + '_' + exchange

  request({uri: req_url, json: true}, function (error, response, body)  {
    if (body) {
      var orders = body;
      var buys = [];
      var sells = [];

      if (orders['bids'].length > 0) {
        for (var i = 0; i < orders['bids'].length; i++) {
          var order = {
            price: orders.bids[i].numberprice,
            quantity: orders.bids[i].quantity
          };

          buys.push(order);
        }
      }

      if (orders['asks'].length > 0) {
        for (var i = 0; i < orders['asks'].length; i++) {
          var order = {
            price: orders.asks[i].numberprice,
            quantity: orders.asks[i].quantity
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body, [], []);
  });
}

module.exports = {
  market_name: 'Xeggex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTEyLTI1VDIwOjQ5OjE3LTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEyLTI1VDIwOjQ5OjE3LTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0xMi0yNVQyMDo0OToxNy0wNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmMmFhNzBmOS0wM2E2LTM1NGYtOGZhZi1lMDYyY2UyNzhjNzMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDoxNGY2YjlkNi0yYWFhLWRjNDItODQzNS04ZDRhY2Q4OTg2MTEiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo1YWJmZTUzNi04NmUxLWU0NGMtOWYzYy05NzAxZTZkNjhlNTYiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjVhYmZlNTM2LTg2ZTEtZTQ0Yy05ZjNjLTk3MDFlNmQ2OGU1NiIgc3RFdnQ6d2hlbj0iMjAyMC0xMi0yNVQyMDo0OToxNy0wNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmMmFhNzBmOS0wM2E2LTM1NGYtOGZhZi1lMDYyY2UyNzhjNzMiIHN0RXZ0OndoZW49IjIwMjAtMTItMjVUMjA6NDk6MTctMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4YuftVAAADR0lEQVQ4EU3B3WvVdRwH8Pf36fd0ns/ObE43k2liUYLOKHvaqEldGETDi6iIqIvsIu8DhS4y+gOWdRtCFFq07oxYD2BgWEN2laYeth23nXN+7vx++z1/v5+IUHy9mPXxFdxPSw5r1YezfucVO9cH7CSHyPLFtFX9Nq15qF3voHAs3CWZIdxDBCZFJXesr5nnvEh5ATCGapxC9YN5I/hrWskQ95F52cE9jIEV5nujzZRWwqgkn1OF5kaKE+V+cMz2w3l/pDENAhgR/iNJStxFSrzMomzKHkR+zQ+eI8u6yg1hq+J+AWN+rvrBlBsmM1qIi0xrAAySCP8zBHA8Q0pAEn2llboKDqgkhYyxyA19Q4y/01zuTrNCXyzKDkCAFMaAPAtkCATehuBIRodMWHEwdGsdWO6CCw6ZFVomGbJ6abV7YDc2JvdAdHxwBgJjDNT0mmoQTkAb6LHWWxhvHeYAmDYI66XHo5r3ZiYFbj718P72G1PNeKSJcMcQOBhgHHUc3XCp8cffH7grXZDnlOBZv8YV92xYL3+22awsDBplNxhpoHXlnxPW5WtL4JgVQQLBZ96bNp77A29vlKvtjUu1Tu/CYLQZkq0eynYNT0ZKTlJvS5WS7EduaL7e8cntDfb3n9x3nAfxAjeOfQqDGJVO/xwnOsK1OVlb7s44f934HJzD7B1FKUrmvEE0w/LiZFT3jtgrvXO83YXe2TzNcPY6gXOMXFraYfXD1aRVBUoW0sI0AtfpmUfGaeynxZrV6YfR9gaYNjC5Gdt4/rG2ntiWS2hTgDO5fnCPNBUXUBxj3/0OJ8l5US+DxQlYmtlpqxp2XjoEZBosSjkNVYA4I85BCxAcplk6jaYHlBxkyoI3iM54hWZWN+DBA40zK0cPghMAR4Iq9il4Ckj1b5LFyUdipf8Cba+9zaJkr9qMf7GT9HC1HxwVxuD2+DbwIHqX4uxBqpcug/SzEOxpFAbcDz9k1id/At3gdXn7zpxjdKXaHcDNC4hCR4aL83HZAbSeLSzL7R2aQLxrGFR1A9Hx35frm18y69NFYCuBc62z09Zmthwmw1aU9Aslzxspbqq0QFKydttR+qoYxI21J/at+dOPXpA31pZFEONfwAie3PFmXOIAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
      get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin, settings.exchange, function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin, settings.exchange, function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, trades: trades, stats: stats});
        });
      });
    });
  }
};
