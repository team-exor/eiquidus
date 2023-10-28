const request = require('postman-request');
const base_url = 'https://api.dex-trade.com/v1/public/';
const base_chart_url = 'https://socket.dex-trade.com/graph/';
const market_url_template = 'https://dex-trade.com/spot/trading/{coin}{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, bid, ask, cb) {
  const req_url = base_url + 'ticker?pair=' + coin + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.status == null || body.status == false)
        return cb((body.error != null ? body.error : api_error_msg), null);
      else {
        try {
          const summary = {
            'high': parseFloat(body.data.high) || 0,
            'low': parseFloat(body.data.low) || 0,
            'volume': parseFloat(body.data.volume_24H) || 0,
            'bid': parseFloat(bid) || 0,
            'ask': parseFloat(ask) || 0,
            'last': parseFloat(body.data.last) || 0
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
  const req_url = base_url + 'trades?pair=' + coin + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.status == null || body.status == false)
        return cb((body.error != null ? body.error : api_error_msg), null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.data.length; t++) {
            trades.push({
              ordertype: body.data[t].type,
              price: parseFloat(body.data[t].rate) || 0,
              quantity: parseFloat(body.data[t].volume) || 0,
              timestamp: parseInt(body.data[t].timestamp)
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
  const req_url = base_url + 'book?pair=' + coin + exchange;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.status == null || body.status == false)
      return cb((body.error != null ? body.error : api_error_msg), null, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.data.buy.length; b++) {
          buys.push({
            price: parseFloat(body.data.buy[b].rate) || 0,
            quantity: parseFloat(body.data.buy[b].volume) || 0
          });
        }

        for (let s = 0; s < body.data.sell.length; s++) {
          sells.push({
            price: parseFloat(body.data.sell[s].rate) || 0,
            quantity: parseFloat(body.data.sell[s].volume) || 0
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
  const req_url = base_chart_url + 'hist?t=' + coin + exchange + '&r=15&limit=100';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.length; c++) {
            // only take values more recent than the last 24 hours
            if ((body[c].time * 1000) > start)
              chartdata.push([
                parseInt(body[c].time * 1000),
                parseFloat(body[c].open) || 0,
                parseFloat(body[c].high) || 0,
                parseFloat(body[c].low) || 0,
                parseFloat(body[c].close) || 0
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
  market_name: 'Dex-Trade',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAGTGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTA2LTI2VDIxOjEwOjEwLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTA2LTI2VDIxOjEwOjEwLTA2OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0wNi0yNlQyMToxMDoxMC0wNjowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozNDk5ZmMyYy02YjE0LWNhNDItOWNkYS05ODI4YTQ5MTBiNWMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpjMzIwOGQ5Yy05M2MyLTNkNDEtYTI0OC0yMjhkMjJkNjhmMmEiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxYmVhYmUxYS1hY2FlLTQ1NGEtYThjMy1mMjlkMWNjOTBhZjkiIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxYmVhYmUxYS1hY2FlLTQ1NGEtYThjMy1mMjlkMWNjOTBhZjkiIHN0RXZ0OndoZW49IjIwMjItMDYtMjZUMjE6MTA6MTAtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MzQ5OWZjMmMtNmIxNC1jYTQyLTljZGEtOTgyOGE0OTEwYjVjIiBzdEV2dDp3aGVuPSIyMDIyLTA2LTI2VDIxOjEwOjEwLTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPjMyOTEwNDQzQzdFMjhCQTc2QTlCNTRFQkNFMjczMDkwPC9yZGY6bGk+IDwvcmRmOkJhZz4gPC9waG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+3wqdeQAAA4xJREFUOI1NU2tMG1QUPrzpBlRs0U4efTAcK6UMQcu2zsdiZkZndKMjCyoUSCbskel8xB9zw2abmEDiwEQIREVd3TRubqL82SYT1gkUSmlpxyhtN1oeIzCpFST8+Ly96uJNvuSec/J955x7zqVx9x2a8EzSQL+Vhqw2amn7XLVHX96oVGlsaVJlUJKaFVRv0jpe2l3WZKw7XXjlSi/dHBimEecdGhrxEN0e91Hwj2Vyu31kqK41iiWZIEpgIFz9pRsXLlzm9zDWJKxD2StVjdYRJ03PLZFleILI5wvQ/MIilejLu4jiERUvRnyiBIaqWvx3tmp34HsmdLzuFBd6QVfS4/PPkcs9RTQzt0BHjr5nJIrGWmEqFI/n4zVDDTwe7wOBu34/Fu7fx++Li6DIRCYSAUN1zae+ST/RxUtdiqSH0yEUy1hQiJOnGljZlzixu/sGNm/RYnb2Hvr6+3BvbhbllbVMIAoxAhG+MX1bSIaqg00UIeTOQ0fehWPUha/PmtDS2obo+BResiq3COabfQgEAvjhcifzrQVFJGJvacV5Ktr6vJsoEhtVGsywTMM2G/YfeIMTk1PkWJ/9JH/UvCe0aGg4A7P5N+zeW8F8Aqjzt/hJ/KhiRbJOynsMBoP4sfNnaJ8tRlyCBPKsPEgz1UhX5CKW2U3NLTh3/jscOPwWkkUZSJfn/MUSJa7WHHqH92yxWNB9vYdNIgVpshxODiNNpgJFPQS7YxST/gB27ipBZnYBHnlswwrlFWi9QqYmX78JoVAInT918fIj40ScLM/KR6pMyX11H3zIE7V/9iW3c9Sbp6miuqYlbJTuq+TBcBums+dQrNNDkCTh/QtFMjyl2YZr164/GG1axgZoirZfpK86TMrY2CQ4nE78/9jtdpQb9kO3aw+am1vhdI3B4/PC6/Xh1q3bKC2rxPETp7fR0vIyvfn2+x/LMnOhe1GPg4ePwniyHq2t7VxkaelPhhACU/+MUCiS8vJfNbxuWlldZavsnyLvZICU6qLecCAiJhmFRdv5Kh87ZkRbeweustK9vrtsmQY4OTunwOp2eykwPUvUZxmhwMw8ucYnqLTM8EnsGjFfKqK4fz+VgCGGE6MFKXhZv69jcMgWOb8QIuuwk2jI5iSbY4wGbaP0a6+Z6usbnynWlXzBlmRMqlAHMxS5wY25GvfTz+00nTB+tKPHfIP6+gfJ5ZogO+P9DaehK5oI+uoTAAAAAElFTkSuQmCC',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    // ensure coin info is uppercase
    settings.coin = settings.coin.toUpperCase();
    settings.exchange = settings.exchange.toUpperCase();

    get_orders(settings.coin, settings.exchange, settings.api_error_msg, function(order_error, buys, sells) {
      if (order_error == null) {
        get_trades(settings.coin, settings.exchange, settings.api_error_msg, function(trade_error, trades) {
          if (trade_error == null) {
            get_summary(settings.coin, settings.exchange, settings.api_error_msg, (buys == null || buys.length == 0 ? null : buys[0].price), (sells == null || sells.length == 0 ? null : sells[0].price), function(summary_error, stats) {
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