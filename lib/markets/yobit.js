var request = require('postman-request');
var base_url = 'https://yobit.io/api/3';
const market_url_template = 'https://yobit.net/en/trade/{coin}/{base}';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/ticker/' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      if (body.message)
        return cb(body.message, null);
      else {
        var summary = {};

        summary['bid'] = body[coin + '_' + exchange]['buy'];
        summary['ask'] = body[coin + '_' + exchange]['sell'];
        summary['volume'] = body[coin + '_' + exchange]['vol'];
        summary['high'] = body[coin + '_' + exchange]['high'];
        summary['low'] = body[coin + '_' + exchange]['low'];
        summary['last'] = body[coin + '_' + exchange]['last'];

        return cb(null, summary);
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/trades/' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      if (body.message)
        return cb(body.message, null);
      else {
        var trades = [];

        for (var i = 0; i < body[coin + '_' + exchange].length; i++) {
          var trade = {
            ordertype: (body[coin + '_' + exchange][i]['type'].toLowerCase() == 'bid' ? 'BUY' : 'SELL'),
            price: body[coin + '_' + exchange][i].price,
            quantity: body[coin + '_' + exchange][i].amount,
            timestamp: body[coin + '_' + exchange][i].timestamp
          };

          trades.push(trade);
        }

        return cb(null, trades);
      }
    }
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/depth/' + coin + '_' + exchange;

  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.success == 0)
      return cb(body.error, null, null);
    else {
      var orders = body[coin + '_' + exchange];
      var buys = [];
      var sells = [];

      if (orders['bids'].length > 0) {
        for (var i = 0; i < orders['bids'].length; i++) {
          var order = {
            price: orders.bids[i][0],
            quantity: orders.bids[i][1]
          };

          buys.push(order);
        }
      }

      if (orders['asks'].length > 0) {
        for (var i = 0; i < orders['asks'].length; i++) {
          var order = {
            price: orders.asks[i][0],
            quantity: orders.asks[i][1]
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    }
  });
}

module.exports = {
  market_name: 'Yobit',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAEsUExURQCZ2ACV1gCY2ACO1ACR1QCT1gCP1AKa2AGZ2AOa2QCX1wOa2AGa2ACS1QCU1gCV1wSb2QCY1wGV16Pc8tLu+Q6c2QCa2ASa2Ruk3DKt4AKZ2Aud2nrL61y/5gGS1QOb2WLB6Cyr3wOW1wSZ2GrE6XrK6zKu4EC04lG65eH1+1C75bjk9Syq3s7t+HjK64DN7ACQ1eT2/AOY2Lnk9Fq+55PV70y45Kne8hCd2sXq98vs+IXN7IrQ7YvR7gOR1ZnX8ASa2FG35Aec2WDB5wmd2tXw+QCM0zuu4Aab2QOO1AKS1ZXW70a24wGX153Z8ard8giY2Aub2QWb2bvm9cTp9mbC6GXC6MPo9h6j3Cap3iKo3iGo3s3s+Cus34nR7d3z+n3M7ACQ1Nry+tjy+pKA2eoAAADASURBVBjTY2AgDLjZgQQnkObkFuAAMsX4+HkYGHiZ2Fl5WVmYgAL8MuqsnIJxUSxmwuZ6yoI8DKwahqLMCcGeoa6O7sLaSlIM8sx+3hHxogFJkcyMbFZavAwcRoEhyT7MsTEcnE52tjZsDAwCBmHhib7RIkwOLmym+kABTjkTf68gIUtnNzYLTTU+oACLgjGLh5COiL21rior0FEcXBKSXBw8jNKyKoogPhBwMQIJdiYWFkYIn4EDTHNwirMzEAMA6McVLdcDhkkAAAAASUVORK5CYII=',
  market_url_template: market_url_template,
  market_url_case: 'u',
  get_data: function(settings, cb) {
    var error = null;
    get_orders(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, buys, sells) {
      if (err) { error = err; }
      get_trades(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, trades) {
        if (err) { error = err; }
        get_summary(settings.coin.toLowerCase(), settings.exchange.toLowerCase(), function(err, stats) {
          if (err) { error = err; }
          return cb(error, {buys: buys, sells: sells, chartdata: [], trades: trades, stats: stats});
        });
      });
    });
  }
};