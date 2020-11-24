var request = require('postman-request'); 
var base_url = 'https://api3.stex.com/public';

function get_summary(coin, exchange, stex_id, cb) {
    var summary = {};

    request({ uri: base_url + '/ticker/' + stex_id, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
        if (error)
            return cb(error, null);
        else if (body.success === true) {
            summary['bid'] = parseFloat(body.data['bid']).toFixed(8);
            summary['ask'] = parseFloat(body.data['ask']).toFixed(8);
            summary['volume'] = body.data['volume'];
            summary['high'] = parseFloat(body.data['high']).toFixed(8);
            summary['low'] = parseFloat(body.data['low']).toFixed(8);
            summary['last'] = parseFloat(body.data['last']).toFixed(8);
            return cb(null, summary);
        } else
            return cb(error, null);
    }).on('error', function(err) {
		return cb(error, null);
    });
}

function get_trades(coin, exchange, stex_id, cb) {
    var req_url = base_url + '/trades/' + stex_id + '?sort=DESC&limit=100';

    request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
         if (body.success == true) {
             var tTrades = body.data;
             var trades = [];
             for (var i = 0; i < tTrades.length; i++) {
                 var Trade = {
                     orderpair: coin,
                     ordertype: tTrades[i].type,
                     amount: parseFloat(tTrades[i].amount).toFixed(8),
                     price: parseFloat(tTrades[i].price).toFixed(8),
                     //  total: parseFloat(tTrades[i].Total).toFixed(8)
                     // Necessary because API will return 0.00 for small volume transactions
                     total: (parseFloat(tTrades[i].amount).toFixed(8) * parseFloat(tTrades[i].price)).toFixed(8),
                     timestamp: tTrades[i].timestamp
                 }
                 trades.push(Trade);
             }
             return cb(null, trades);
         }
		 else
             return cb(body.message, null);
    }).on('error', function(err) {
		return cb(error, null);
    });
}

function get_orders(coin, exchange, stex_id, cb) {
    var req_url = base_url + '/orderbook/' + stex_id + '?limit_bids=100&limit_asks=100';

    request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
        if (body.success == true) {
            var orders = body.data;
            var buys = [];
            var sells = [];
            if (orders['bid'].length > 0){
                for (var i = 0; i < orders['bid'].length; i++) {
                    var order = {
                        amount: parseFloat(orders.bid[i].amount).toFixed(8),
                        price: parseFloat(orders.bid[i].price).toFixed(8),
                        //  total: parseFloat(orders.bid[i].Total).toFixed(8)
                        // Necessary because API will return 0.00 for small volume transactions
                        total: (parseFloat(orders.bid[i].amount).toFixed(8) * parseFloat(orders.bid[i].price)).toFixed(8)
                    }
                    buys.push(order);
                }
            }
            if (orders['ask'].length > 0) {
                for (var x = 0; x < orders['ask'].length; x++) {
                    var order = {
                        amount: parseFloat(orders.ask[x].amount).toFixed(8),
                        price: parseFloat(orders.ask[x].price).toFixed(8),
                        //    total: parseFloat(orders.ask[x].Total).toFixed(8)
                        // Necessary because API will return 0.00 for small volume transactions
                        total: (parseFloat(orders.ask[x].amount).toFixed(8) * parseFloat(orders.ask[x].price)).toFixed(8)
                    }
                    sells.push(order);
                }
            }
            return cb(null, buys, sells);
        }
		else
			return cb(body.message, [], [])
    }).on('error', function(err) {
		return cb(error, null, null);
    });
}

function get_chartdata(coin, exchange, stex_id, cb) {
	// do not collect chart data for now
	return cb(null, []);
/*
  var req_url = base_url + '/chart/' + stex_id + '/30?timeStart=' + start + '&timeEnd=' + end + '&limit=100';
  var end = Date.now();
  end = end / 1000;
  start = end - 86400;

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error) {
      return cb(error, []);
    } else {
      if (chartdata.success == true) {
        var processed = [];
        for (var i = 0; i < chartdata.data.length; i++) {
		  processed.push([chartdata.data[i].time, parseFloat(chartdata.data[i].open), parseFloat(chartdata.data[i].high), parseFloat(chartdata.data[i].low), parseFloat(chartdata.data[i].close)]);
          if (i == chartdata.data.length - 1)
            return cb(null, processed);
        }
      }
      else
        return cb(chartdata.message, []);
    }
  });
*/
}

function get_pair_id(coin, exchange, cb) {
    // Lookup the currency pair id needed to use the stex api
    request({ uri: base_url + '/currency_pairs/list/' + exchange, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, body) {
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
    get_data: function (settings, cb) {
        var error = null;
        get_pair_id(settings.coin, settings.exchange, function (err, stex_id) {
          get_chartdata(settings.coin, settings.exchange, stex_id, function (err, chartdata) {
            if (err) { chartdata = []; error = err; }
              get_orders(settings.coin, settings.exchange, stex_id, function (err, buys, sells) {
                if (err) { error = err; }
                  get_trades(settings.coin, settings.exchange, stex_id, function (err, trades) {
                    if (err) { error = err; }
                    get_summary(settings.coin, settings.exchange, stex_id, function (err, stats) {
                      if (err) { error = err; }
                      return cb(error, { buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats });
                    });
                  });
              });
           });
        });
    }
};