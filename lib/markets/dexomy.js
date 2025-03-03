const request = require('postman-request');
const base_url = 'https://dexomy.com/api/v2/';
const market_url_template = 'https://dexomy.com/exchange/dashboard?coin_pair={coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + 'get-pair-list/';

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (!body.success)
      return cb((body.message != null ? body.message : api_error_msg), null, null);
    else {
      try {
        // find the correct coin pair record
        const pairObject = body.data.find(item => item.coin_pair_name === `${coin}/${exchange}`);

        if (pairObject) {
          const coindata = {
            parent_coin_id: pairObject.parent_coin_id,
            child_coin_id: pairObject.child_coin_id
          };

          const summary = {
            'high': parseFloat(pairObject.high) || 0,
            'low': parseFloat(pairObject.low) || 0,
            'volume': parseFloat(pairObject.volume) || 0,
            'last': parseFloat(pairObject.last_price) || 0,
            'change': parseFloat(pairObject.price_change) || 0
          };

          return cb(null, summary, coindata);
        } else
          return cb(api_error_msg, null, null);
      } catch(err) {
        return cb(api_error_msg, null, null);
      }
    }
  });
}

function get_trades(parent_coin_id, child_coin_id, api_error_msg, cb) {
  const req_url = `${base_url}get-exchange-market-trades?base_coin_id=${parent_coin_id}&trade_coin_id=${child_coin_id}`;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (!body.success)
        return cb((body.message != null ? body.message : api_error_msg), null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.data.transactions.data.length; t++) {
            // convert the string timestamp to iso time and then to a unix timestamp
            const isoTime = body.data.transactions.data[t].time.replace(' ', 'T') + 'Z';
            const unixTimestamp = Math.floor(new Date(isoTime).getTime() / 1000);

            trades.push({
              ordertype: body.data.transactions.data[t].price_order_type.toString().toUpperCase(),
              price: parseFloat(body.data.transactions.data[t].price) || 0,
              quantity: parseFloat(body.data.transactions.data[t].amount) || 0,
              timestamp: unixTimestamp
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

function get_orders(parent_coin_id, child_coin_id, api_error_msg, cb) {
  const req_url = `${base_url}get-exchange-all-orders?base_coin_id=${parent_coin_id}&trade_coin_id=${child_coin_id}`;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null, null);
      else if (!body.success)
        return cb((body.message != null ? body.message : api_error_msg), null, null);
      else {
        try {
          let buys = [];
          let sells = [];

          for (let b = 0; b < body.data.buy_orders.data.length; b++) {
            buys.push({
              price: parseFloat(body.data.buy_orders.data[b].price) || 0,
              quantity: parseFloat(body.data.buy_orders.data[b].amount) || 0
            });
          }

          for (let s = 0; s < body.data.sell_orders.data.length; s++) {
            sells.push({
              price: parseFloat(body.data.sell_orders.data[s].price) || 0,
              quantity: parseFloat(body.data.sell_orders.data[s].amount) || 0
            });
          }

          return cb(null, buys, sells);
        } catch(err) {
          return cb(api_error_msg, null, null);
        }
      }
    });
  });
}

function get_chartdata(parent_coin_id, child_coin_id, api_error_msg, cb) {
  const end = Date.now();
  const start = end - 86400000;
  const req_url = `${base_url}get-exchange-chart-data?base_coin_id=${parent_coin_id}&trade_coin_id=${child_coin_id}&interval=15`;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function(error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (!body.success)
        return cb((body.message != null ? body.message : api_error_msg), null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.data.length; c++) {
            // only take values more recent than the last 24 hours
            if ((body.data[c].time * 1000) > start)
              chartdata.push([
                parseInt(body.data[c].time * 1000),
                parseFloat(body.data[c].open) || 0,
                parseFloat(body.data[c].high) || 0,
                parseFloat(body.data[c].low) || 0,
                parseFloat(body.data[c].close) || 0
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
  market_name: 'Dexomy',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAACbVBMVEUAAAAoTTU2RzdBISEnAQQjIBkpGxolDg9bMi6sTD4nDhlTGyAVTy4QDwzl5uBbNjEUSCllcnIgJR0AFRcAEhYLNyK5KSA8KCgHPCU/TkkuJCUMHhy8q6eOlpUvNDMSMx1IVE1qXVJCWk8zRTGZeGSKk2/GnIFx0ZRQgl2Nonppl3geWy9WV1aOeXusSz4iOyFcOzMxRzI6KCWFiYmIMjKhMDCHeGuMZlYgAQM3OThXISe5pIC3wbVQZU5aOzNlZFdigH9sbGegMixKBAjEYlBBDQ1ZaE0dNiynSzhXGB5EFBaMkZJhX2EcERVkMDGhb2sdExgoQCJKJh9sGxtgPz+OEhM0Py2jamYKExNiNyo2AAdABwJjKiVZWVeOTj8bXzm4Tjk3STd3Oi0mKi0KOiosJScrMSQ3KiN2JyMANiJZHB9NKhobFBWOEBRqCxRVDxMKDxN9BhMBCgpKAAUuAAKrxY6DsXpkc3aAqnOTdHN/unHcgXBla255mWtjZmFLa19SjFokhFmPlFTCWVLNcU5HTEhHRUaNYENveUKTZEIjSUKfaEGQZkC4Uz01YjtkdzokZzo9YzpXOzrpSzk7VDg3NDjJPze0SjZMPjVvODJvSDEVPjFVNTGUNjBNMjCGNy+2Ly8pPi3XMS1RKi1eSiykSytAPisfMCvZJykkQCh+NCg+OCU4RSRKMSQ6MyMeICJYMCGsHiE5FyEAKB9AJh9SJB9dQh0AOx2gLB0vLB0PJR0zHR0hHRx8GhuJEBtuDxsCFhhsHReiDxefGxYgDhROABQALhMCIBMoFxIrGRBTBg0tBg13AAumAAZhAADJFxIcAAAAXXRSTlMA/hMI1UAcD/z6+vf29PLy8vHx8fHw8O/v7e3t7Onp5uXf3tzVzMrJx8XFxcG/v7+9vby7u7m4trW0tKupqKelnpyclZCPjoyBfHp5dnNubGVXV1FORUA+PTAvJgb/bIgPAAABGklEQVQY0w3HQ2IDABAAwI1r27Zt23Zss7Zt27Zt803N3AaS1bxdbR1tHJz8fXyjsgEAU1ez1kTYO+vt3DkR89MASgpMqllfjEf+WMsgQ5AIgMLZrf5JN4nsq4Wlka4gHED+RT/l2znTkzj99IzQzIH05pWq7XdkYVFcI/OXW58CWfH2HTfGSfrosLLxn9NFFwDwu1xXQqtPsmY5PAHTAlAxlQ9UqoIiiUNmf9wtG0KCcvn+aGu4R0Bg6dvL/YQV6HlF0NvMsEhscIXkVkwOhegty+s5o+Jct9rzqY0jRB5A7JBIRBdSGgZ6hl9p1igApClvhjDf3k06lB0jMgAgBP+5yz0QSmUSWl+q/JF4VS0dbV0NAxVzd4z8/2atXThWWOQQAAAAAElFTkSuQmCC',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    get_summary(settings.coin, settings.exchange, settings.api_error_msg, function(summary_error, stats, coindata) {
      if (summary_error == null) {
        get_orders(coindata.parent_coin_id, coindata.child_coin_id, settings.api_error_msg, function(order_error, buys, sells) {
          if (order_error == null) {
            get_trades(coindata.parent_coin_id, coindata.child_coin_id, settings.api_error_msg, function(trade_error, trades) {
              if (trade_error == null) {
                get_chartdata(coindata.parent_coin_id, coindata.child_coin_id, settings.api_error_msg, function (chart_error, chartdata) {
                  if (chart_error == null)
                    return cb(null, {buys: buys, sells: sells, trades: trades, stats: stats, chartdata: chartdata});
                  else
                    return cb(chart_error, null);
                });
              } else
                return cb(trade_error, null);
            });
          } else
            return cb(order_error, null);
        });
      } else
        return cb(summary_error, null);
    });
  }
};