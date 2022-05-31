var request = require('postman-request');
var base_url = 'https://www.exbitron.com/api/v2/peatio';
const market_url_template = 'https://www.exbitron.com/trading/{coin}{base}';

function get_summary(coin, exchange, cb) {
  var url=base_url + '/public/markets/' + coin.toLowerCase() + exchange.toLowerCase() + '/tickers';
  request({uri: url, json: true, headers: {'User-Agent': 'bitweb'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var ticker = body.ticker;
      var change = ticker.price_change_percent;
      change = change.replace('%','');
            var summary = {};
            //summary['ask'] = ticker.sell;
            //summary['bid'] = ticker.buy;
            summary['volume'] = ticker.volume;
            summary['high'] = ticker.high;
            summary['low'] = ticker.low;
            summary['last'] = ticker.last;
            summary['change'] = change;
       
      return cb(null, summary);
    } else
      return cb(error, null);
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/public/markets/' + coin.toLowerCase() + exchange.toLowerCase() + '/trades';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'bitweb'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else if (body.error !== true) {
      var trades = [];
      for (var i = 0; i < body.length; i++) {
        var trade = {
          ordertype: body[i].taker_type,
          quantity: body[i].amount,
          price: body[i].price,
          timestamp: body[i].created_at
        };

        trades.push(trade);
      }

      return cb(null, trades);
    } else
      return cb(body.Message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/public/markets/' + coin.toLowerCase() + exchange.toLowerCase() + '/depth';

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

  var req_url = base_url + '/public/markets/' + coin.toLowerCase() + exchange.toLowerCase() + '/k-line?period=60&limit=1000';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'bitweb'} }, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      var processed = [];
      var repeatCandle = [];

      for (var i = 0; i < chartdata.length; i++){
       
       // if (parseFloat(repeatCandle[4]) !== parseFloat(chartdata[i][4])){
         
       // }
        processed.push({
            time: parseInt(chartdata[i][0]),
            open: parseFloat(chartdata[i][1]),
            high: parseFloat(chartdata[i][2]),
            low: parseFloat(chartdata[i][3]),
            close: parseFloat(chartdata[i][4])
        });
    }
      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Exbitron',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABDElEQVQ4T2NkwAL09PS4f37/9gVZ6j8jk8ytW7eeoitnRBNgUldV+YvNUJjYzdt3mBkYGP7B+HADVJWVpzMxMWbg04yQ+3/u5u27xiA+zABGdVUVuKnEGHLz9h0mBgaG/2AD1FVV/sM03dggj1e/RsBDuPzN23cYKTdATVXlCyMDAzfMWAs9DrwuOHHpB1z+3////0F+hzsfJnNpoxwDG8R3GADZC+BARDfgxApZBgEOUPhgBxgGqKooP2RiZJRDD0TNQERgoSQoJPf++8/wl/JApEo0ohtCZEICux4e1Lq6uoK/fnx/R4zmfwx/DG/ffnABxQCYRmzRimwoKPUh87FHNgMDRq5Ez4UwQwD+RWfC3CqJXQAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'l',
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