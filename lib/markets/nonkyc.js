const request = require('postman-request');
const base_url = 'https://api.nonkyc.io/api/v2';
const market_url_template = 'https://nonkyc.io/market/{coin}_{base}';

// initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
const rateLimitLib = require('../ratelimit');
const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

function get_summary(coin, exchange, api_error_msg, cb) {
  const req_url = base_url + '/market/getbysymbol/' + coin + '_' + exchange;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb((body.error.message != null ? body.error.message : api_error_msg), null);
      else {
        try {
          const summary = {
            'high': parseFloat(body.highPriceNumber) || 0,
            'low': parseFloat(body.lowPriceNumber) || 0,
            'volume': parseFloat(body.volumeNumber) || 0,
            'volume_btc': parseFloat(body.volumeUsdNumber) || 0,
            'bid': parseFloat(body.bestBidNumber) || 0,
            'ask': parseFloat(body.bestAskNumber) || 0,
            'last': parseFloat(body.lastPriceNumber) || 0,
            'prev': parseFloat(body.yesterdayPriceNumber) || 0,
            'change': parseFloat(body.changePercentNumber) || 0
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
  const req_url = base_url + '/historical_trades?ticker_id=' + coin + '_' + exchange + '&limit=300';

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object')
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb((body.error.message != null ? body.error.message : api_error_msg), null);
      else {
        try {
          let trades = [];

          for (let t = 0; t < body.length; t++) {
            trades.push({
              ordertype: body[t].type,
              price: parseFloat(body[t].price) || 0,
              quantity: parseFloat(body[t].base_volume) || 0,
              timestamp: parseInt(new Date(body[t].trade_timestamp).getTime() / 1000)
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
  const req_url = base_url + '/market/getorderbookbysymbol/' + coin + '_' + exchange;

  // NOTE: no need to pause here because this is the first api call
  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null, null);
    else if (body == null || body == '' || typeof body !== 'object')
      return cb(api_error_msg, null, null);
    else if (body.error != null)
      return cb((body.error.message != null ? body.error.message : api_error_msg), null, null);
    else {
      try {
        let buys = [];
        let sells = [];

        for (let b = 0; b < body.bids.length; b++) {
          buys.push({
            price: parseFloat(body.bids[b].numberprice) || 0,
            quantity: parseFloat(body.bids[b].quantity) || 0
          });
        }

        for (let s = 0; s < body.asks.length; s++) {
          sells.push({
            price: parseFloat(body.asks[s].numberprice) || 0,
            quantity: parseFloat(body.asks[s].quantity) || 0
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
  const end = Date.now() / 1000;
  const start = end - 86400;
  const req_url = base_url + '/market/candles/?symbol=' + coin + '_' + exchange + '&from=' + parseInt(start).toString() + '&to=' + parseInt(end).toString() + '&resolution=15' ;

  // pause for 2 seconds before continuing
  rateLimit.schedule(function() {
    request({uri: req_url, json: true}, function (error, response, body) {
      if (error)
        return cb(error, null);
      else if (body == null || body == '' || typeof body !== 'object' || typeof body == 'string' || body instanceof String)
        return cb(api_error_msg, null);
      else if (body.error != null)
        return cb((body.error.message != null ? body.error.message : api_error_msg), null);
      else {
        try {
          let chartdata = [];

          for (let c = 0; c < body.bars.length; c++) {
            chartdata.push([
              parseInt(body.bars[c].time),
              parseFloat(body.bars[c].open) || 0,
              parseFloat(body.bars[c].high) || 0,
              parseFloat(body.bars[c].low) || 0,
              parseFloat(body.bars[c].close) || 0
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
  market_name: 'Nonkyc',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAKrmlDQ1BJQ0MgUHJvZmlsZQAASImVlwdUE1kXgN/MpBdaQihSQm/SWwApIbTQpYONkAQIJcZAQLEjiyu4FlREUFF0VUTBtQBiRxTbotiwb5BFRFkXC6Ki8g9wCLv7n///z3/Peed+c+e+e+97M2/OHQCoKjyJJAtWASBbnCuNCvRlJiQmMfF9AAFaAABdQOTxcyTsyMhQ9ApM6r/Lx/sAGtN3rMdi/fv9/yqqAmEOHwAoEuUUQQ4/G+Xj6HjFl0hzAUB2oXaj/FzJGLehTJeiBaL8YIzTJnhgjFPGGQPGfWKiOCjTASBQeDxpGgAUJmpn5vHT0DgUH5TtxAKRGGUJyl7Z2fMFKB9B2Rz1QW2UsfislL/ESftbzBRFTB4vTcETaxkXgp8oR5LFW/R/bsf/luws2WQOU3RQ0qVBUWP50D17kDk/RMHilPCISRYJJmoa43RZUOwk83M4SZMs4PmFKOZmhYdOcqoogKuIk8uNmWRhjn/0JEvnRylypUo57EnmScfzklCWyzJjFfZ0IVcRvyA9Jn6S80Rx4ZOckxkdMuXDUdilsihF/UJxoO9U3gDF2rNz/rJeEVcxNzc9Jkixdt5U/UIxeypmToKiNoHQz3/KJ1bhL8n1VeSSZEUq/IVZgQp7Tl60Ym4u+kJOzY1U7GEGLzhykoEIhAEe4DOVJwmAXOHC3LGFcOZLFklFaem5TDZ6woRMrphvM53pYOfgCMDYeZ14Hd4zxs8hxLg2ZVu1EwDP46Ojo6embCEtABwrRR9L15TNbCkAShcAuFLFl0nzJmzjZwmLPj1lQEe/BnrACJgDa+AAXIAH8AH+IBhEgBiQCOaitaaDbCAF+WAJWAmKQSnYALaASlAN9oAD4DA4CprAaXABXAbXwS1wDzwGctALXoNB8BGMQBCEh6gQDdKC9CETyApygFiQF+QPhUJRUCKUDKVBYkgGLYFWQaVQGVQJ7YZqoV+gk9AF6CrUCT2EuqF+6B30BUZgCkyHdWFT2BZmwWw4BI6B58Bp8AK4AC6C18EVcA18CG6EL8DX4XuwHH4NDyEAISMMxACxRlgIB4lAkpBURIosQ0qQcqQGqUdakHbkDiJHBpDPGByGhmFirDEemCBMLIaPWYBZhlmLqcQcwDRi2jB3MN2YQcx3LBWrg7XCumO52ARsGjYfW4wtx+7DnsBewt7D9mI/4nA4Bs4M54oLwiXiMnCLcWtxO3ANuPO4TlwPbgiPx2vhrfCe+Ag8D5+LL8Zvwx/Cn8PfxvfiPxHIBH2CAyGAkEQQEwoJ5YSDhLOE24Q+wghRhWhCdCdGEAXERcT1xL3EFuJNYi9xhKRKMiN5kmJIGaSVpApSPekS6QnpPZlMNiS7kWeSReQV5AryEfIVcjf5M0WNYknhUGZTZJR1lP2U85SHlPdUKtWU6kNNouZS11FrqRepz6iflGhKNkpcJYHScqUqpUal20pvlInKJsps5bnKBcrlyseUbyoPqBBVTFU4KjyVZSpVKidVulSGVGmq9qoRqtmqa1UPql5VfamGVzNV81cTqBWp7VG7qNZDQ2hGNA6NT1tF20u7ROul4+hmdC49g15KP0zvoA+qq6k7qcepL1SvUj+jLmcgDFMGl5HFWM84yrjP+KKhq8HWEGqs0ajXuK0xrDlN00dTqFmi2aB5T/OLFlPLXytTa6NWk9ZTbYy2pfZM7XztndqXtAem0ad5TONPK5l2dNojHVjHUidKZ7HOHp0bOkO6erqBuhLdbboXdQf0GHo+ehl6m/XO6vXr0/S99EX6m/XP6b9iqjPZzCxmBbONOWigYxBkIDPYbdBhMGJoZhhrWGjYYPjUiGTEMko12mzUajRorG8cZrzEuM74kQnRhGWSbrLVpN1k2NTMNN50tWmT6UszTTOuWYFZndkTc6q5t/kC8xrzuxY4C5ZFpsUOi1uWsKWzZbplleVNK9jKxUpktcOqczp2utt08fSa6V3WFGu2dZ51nXW3DcMm1KbQpsnmja2xbZLtRtt22+92znZZdnvtHtur2QfbF9q32L9zsHTgO1Q53HWkOgY4LndsdnzrZOUkdNrp9MCZ5hzmvNq51fmbi6uL1KXepd/V2DXZdbtrF4vOimStZV1xw7r5ui13O+322d3FPdf9qPufHtYemR4HPV7OMJshnLF3Ro+noSfPc7en3Ivpley1y0vubeDN867xfu5j5CPw2efTx7ZgZ7APsd/42vlKfU/4DnPcOUs55/0Qv0C/Er8OfzX/WP9K/2cBhgFpAXUBg4HOgYsDzwdhg0KCNgZ1cXW5fG4tdzDYNXhpcFsIJSQ6pDLkeahlqDS0JQwOCw7bFPYk3CRcHN4UASK4EZsinkaaRS6IPDUTNzNyZtXMF1H2UUui2qNp0fOiD0Z/jPGNWR/zONY8VhbbGqccNzuuNm443i++LF6eYJuwNOF6onaiKLE5CZ8Ul7QvaWiW/6wts3pnO88unn1/jtmchXOuztWemzX3zDzlebx5x5KxyfHJB5O/8iJ4NbyhFG7K9pRBPoe/lf9a4CPYLOgXegrLhH2pnqllqS/TPNM2pfWne6eXpw+IOKJK0duMoIzqjOHMiMz9maNZ8VkN2YTs5OyTYjVxprhtvt78hfM7JVaSYol8gfuCLQsGpSHSfTlQzpyc5lw62hjdkJnLfpB153nlVeV9yo/LP7ZQdaF44Y1FlovWLOorCCj4eTFmMX9x6xKDJSuXdC9lL929DFqWsqx1udHyouW9KwJXHFhJWpm58tdCu8Kywg+r4le1FOkWrSjq+SHwh7pipWJpcddqj9XVP2J+FP3YscZxzbY130sEJddK7UrLS7+u5a+99pP9TxU/ja5LXdex3mX9zg24DeIN9zd6bzxQplpWUNazKWxT42bm5pLNH7bM23K13Km8eitpq2yrvCK0onmb8bYN275Wplfeq/Ktatius33N9uEdgh23d/rsrK/WrS6t/rJLtOvB7sDdjTWmNeV7cHvy9rzYG7e3/WfWz7X7tPeV7vu2X7xffiDqQFuta23tQZ2D6+vgOlld/6HZh24d9jvcXG9dv7uB0VB6BByRHXn1S/Iv94+GHG09xjpWf9zk+PYTtBMljVDjosbBpvQmeXNic+fJ4JOtLR4tJ07ZnNp/2uB01Rn1M+vPks4WnR09V3Bu6Lzk/MCFtAs9rfNaH19MuHi3bWZbx6WQS1cuB1y+2M5uP3fF88rpq+5XT15jXWu67nK98YbzjRO/Ov96osOlo/Gm683mW263WjpndJ697X37wh2/O5fvcu9evxd+r/N+7P0HXbO75A8ED14+zHr49lHeo5HHK55gn5Q8VXla/kznWc1vFr81yF3kZ7r9um88j37+uIff8/r3nN+/9ha9oL4o79Pvq33p8PJ0f0D/rVezXvW+lrweGSj+Q/WP7W/M3xz/0+fPG4MJg71vpW9H3619r/V+/wenD61DkUPPPmZ/HBku+aT16cBn1uf2L/Ff+kbyv+K/Vnyz+NbyPeT7k9Hs0VEJT8obbwUQdMCpqQC82w8ANREA2i20f5g10U+PCzTxDzBO4D/xRM89Li4A1KNqrC3inAfgCDpMfdDYqB5riWJ8AOzoqBiTve94nz4mOPSPpR6vnF9L7myxXQH+IRM9/F/q/qcGY1GdwD/1vwDFOAe+Dmu0xAAAAJZlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAACQAAAAAQAAAJAAAAABAAOShgAHAAAAEgAAAISgAgAEAAAAAQAAABCgAwAEAAAAAQAAABAAAAAAQVNDSUkAAABTY3JlZW5zaG90JdHC9QAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAtdpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjE5ODwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlVzZXJDb21tZW50PlNjcmVlbnNob3Q8L2V4aWY6VXNlckNvbW1lbnQ+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4xOTg8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj4xNDQ8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjE0NDwvdGlmZjpYUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjo54jUAAAIhSURBVDgRjVPPaxNBFJ6Zna2JiJBAEHuoWKht3YBI24s/UPAgXhRb1v/ANJpcBL2WPfbkSfwjmmNP4iFQvCTNbg7ZHgJaCtIghEJjaCxpdsb5ZrPtJkTwHXa+7/3a9968IWSCSEko1J5XuOF5xWngSAccFxYnwFI6rFSytV4IOU/p4GboYzPYxv3/yR3nwvm/AxG0s5O7Pinr1pZtTLLpksrlxxxBq8/bD7JWuuX7xfvgrvt21XXzT4EtK/Py9mKqVavlFsCREKfuq93OSBAzSfYOW7/fn572m+Cci29SChdYCFI5bHU/mObVn+C2jXlJPWxwUi47ugpNxrj6qxnpcUoZ/h2YVyqvbzHG6cqK06zX1+cSl8yPvT/i3dKS8933C5uU0mPL+rTZaBSXGZMbJycyR+nnX563fqffD444Y0bGNClKaQYBT6uAJ4yRFLIzxpaJFEfAag8yhsEeGUZwBVxZpxMJPgix+sbLOlcOwUivShcNUJtxx9E9o9dqtWCN9wzH7e3c5d3dfDYKxonEjFJHELKnpzk1ZdzLWik/CNhDBFWr+Vee9+YZ8MwMf7Ewn27Mzl6bA4eoduVw8iWVhJBej9d/7HfWpDRr4J2O+JJMDrTt7Gzw9WD/eK3b7R3AZtthDLCW8ccSn0kcD90v7n+oOE+CfYhmonq+q7ZxEcaw59FdgX5kedRlqo10BlEC9RoTqjK9pbZtSTWvAEFx+QtkiuwAOEtBDgAAAABJRU5ErkJggg==',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
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