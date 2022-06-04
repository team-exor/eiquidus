var request = require('postman-request');
var base_url = 'https://api.bittrex.com/v3';
const market_url_template = 'https://global.bittrex.com/Market/Index?MarketName={base}-{coin}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/markets/' + coin + '-' + exchange + '/summary';

  request({uri: req_url, json: true}, function (error, response, summary) {
    if (error)
      return cb(error, null);
    else {
      if (summary.code)
        return cb(summary.code, null);
      else {
        req_url = base_url + '/markets/' + coin + '-' + exchange + '/ticker';
        request({uri: req_url, json: true}, function (error, response, ticker) {
          if (error)
            return cb(error, null);
          else {
            if (ticker.code)
              return cb(ticker.code, null);
            else {
              var retVal = {
                'high': summary.high,
                'low': summary.low,
                'volume': summary.volume,
                'bid': ticker.bidRate,
                'ask': ticker.askRate,
                'last': ticker.lastTradeRate,
                'change': summary.percentChange
              };

              return cb (null, retVal);
            }
          }
        });
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/markets/' + coin + '-' + exchange + '/trades';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      var trades = [];

      if (body.length > 0) {
        for (var i = 0; i < body.length; i++) {
          var trade = {
            ordertype: body[i]['takerSide'],
            price: body[i]['rate'],
            quantity: body[i]['quantity'],
            timestamp: parseInt(new Date(body[i]['executedAt']).getTime()/1000)
          };

          trades.push(trade);
        }
      }

      return cb(null, trades);
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/markets/' + coin + '-' + exchange + '/orderbook?depth=25';

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, [], []);
    else {
      var buys = [];
      var sells = [];

      if (body['bid'].length > 0) {
        for (var i = 0; i < body['bid'].length; i++) {
          var order = {
            price: body.bid[i].rate,
            quantity: body.bid[i].quantity
          };

          buys.push(order);
        }
      }

      if (body['ask'].length > 0) {
        for (var i = 0; i < body['ask'].length; i++) {
          var order = {
            price: body.ask[i].rate,
            quantity: body.ask[i].quantity
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
  
  var req_url = base_url + '/markets/' + coin + '-' + exchange + '/candles/MINUTE_5/recent';

  request({ uri: req_url, json: true}, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      var processed = [];

      for (var i = 0; i < chartdata.length; i++) {
        // only display every 3rd data point (every 15 mins) and only more recent than the last 24 hours
        if (new Date(chartdata[i].startsAt).getTime()/1000 > start && (i % 3) == 0) 
          processed.push([new Date(chartdata[i].startsAt).getTime(), parseFloat(chartdata[i].open), parseFloat(chartdata[i].high), parseFloat(chartdata[i].low), parseFloat(chartdata[i].close)]);
      }

      return cb(null, processed);
    }
  });
}

module.exports = {
  market_name: 'Bittrex',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACjElEQVR4nHWTzWtdZRCHn3nf95x789GWlJs2mgRdiEhAEKQhFGmsIBSyFtG1BCy2oII7DUW3biwYyD8QKF0IIrqKxK+NC6GLi8WvhTEkN+GaxBPvPee874yL3GhMdRazmt8sZp5HADATRAyAd79/BhcWwa6gaRIA3CbOraNxhbef+OpkRv4OL33eJJ96H3GL4rPgUgmaBnkPoQEpxqRphWrjTW5d7WMmwgt3PDOXMnz1CaPnn6PYMaIptTrECRgcNQUcrYvCn9016nyB9re1AHCr/SFnL7zqi53KKs2vPn6GN+bG6NWGd4O4wF4/8dqn29Vh3sql6Czb0sx1Yak9Rxa+QVWdmNci8vyT55h9uMnaDwWh4UlqZE744NpFFlZ/ZWMvJsmDs6q+HHDckKwp1isYaXpWX3mUMhpFqTw9P05MSu4d7325y71OSfACphAaQqxvBJB5YglqbmzIM5I57rb3Gc0dX/9ySKqM159tcXl6GDVDBmclloDMB4QJNAIiXuDHbkUjOMaHPd/9fAjAxkGNF7CjRwMiaARhwnGqGl7IHEQ1EIHgaO9WtHdKMi+nxwkYW/gwCZUBIiJ0e4mbs2PMPdQkyz2/9xLBwVMTTQ5KBTHDZUKMWwFsndB4mbLSZPjWsOfj+wX3tkuamaCVMfvIEL3aeOuzbfZKBSdqoeGJ9XpAuU0sX8I5ikqZPhv46MUp+tEQgbpWHmvlvLO+y0+bfcK5AOKgLg3l9r9Akj861dhQyIczQY7vLVBGZa+vxGQoVnHmQs5BZ5mlmesPorzfMWyArchgixlOFMExOi4U3TXSMcqnZBJxi/gsHLHxj0wWGpDqSNIV4kmZ/k9nsyvYQGfxvyHyxX/p/BcTSUaGzEtUTgAAAABJRU5ErkJggg==',
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