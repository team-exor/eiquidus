var request = require('postman-request');
var base_url = 'https://www.ztb.im/api/v1';
const market_url_template = 'https://www.ztb.im/exchange?coin={coin}_{base}';

function get_summary(coin, exchange, cb) {
  var url=base_url + '/tickers';
  request({uri: url, json: true, headers: {'User-Agent': 'bitweb'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var tickers = body.ticker;
      for (var ticker of tickers) 
        {
          if(ticker.symbol == 'BTE_USDT'){
            var summary = {};
            summary['ask'] = ticker.sell;
            summary['bid'] = ticker.buy;
            summary['volume'] = ticker.vol;
            summary['high'] = ticker.high;
            summary['low'] = ticker.low;
            summary['last'] = ticker.last;
            summary['change'] = ticker.change;
          }
        }
      return cb(null, summary);
    } else
      return cb(error, null);
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/trades?symbol=' + coin.toUpperCase() + '_' + exchange.toUpperCase() + '&size=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'bitweb'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var trades = [];
      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i].side,
          quantity: body[i].amount,
          price: body[i].price,
          timestamp: body[i].timestamp/1000
        };

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.Message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/depth?symbol=' + coin.toUpperCase() + '_' + exchange.toUpperCase() + '&size=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'bitweb'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var buys = [];
      var sells = [];
  

      if (body['bids'].length > 0) {
        for (var i = 0; i < body['bids'].length; i++) {
          var order = {
            price: body['bids'][i][0],
            quantity: body['bids'][i][1]
          };

          buys.push(order);
        }
      }

      if (body['asks'].length > 0) {
        for (var i = 0; i < body['asks'].length; i++) {
          var order = {
            price: body['asks'][i][0],
            quantity: body['asks'][i][1]
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

  var req_url = base_url + '/kline?symbol=' + coin.toUpperCase() + '_' + exchange.toUpperCase() + '&type=30min&size=100';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'bitweb'} }, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      var processed = [];
      var repeatCandle = [];

      for (var i = 0; i < chartdata.length; i++){
       
       // if (parseFloat(repeatCandle[4]) !== parseFloat(chartdata[i][4])){
         
       // }
        processed.push([parseInt(chartdata[i][0]), parseFloat(chartdata[i][1]), parseFloat(chartdata[i][2]), parseFloat(chartdata[i][3]), parseFloat(chartdata[i][4])]);
    }
    
    //console.log(processed);
      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Ztb',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFHSURBVDhPrZFNK0RRHMYfL7GgKIqNRImVJGt7CRNfADULLwsrSlIWluIT2PMBpCxE2chCGc05Z7ozmfs/984sfYLrmXvPYhbiTDz163bP0/8df1dZJmHsPrQctYSxB1B2CtBhHtpW+SCtIWWoag6o13tRZBclu0LyXuhoFe/hBIzpzsZQdpAZH9nJpxfG3qFS6c+CGyoUuqCiBSbZaGKL1XYzZIf/m+m7lnXo6jyukw4X/Y3K0SirXDHgIcPeIKhNO9dDJRmBiU5Z7SLFyDEKlWHneqixIB0ect6TFCXbiOMe53rIRGts+5nflxRtLxEEfc71kIrHOMYyr5NL0TKDJGlz7i+6v+9kwDk7sBli2cEZE/yw9WYlSTtPNwsTL6XocBFvXKq3dG2cHdyy+qvjCcWPOed6KKgNQYV72RVI4wIiA879bwFfuAEkLH8UYzQAAAAASUVORK5CYII=',
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
