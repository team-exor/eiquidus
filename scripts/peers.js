var mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../lib/settings')
  , request = require('postman-request');

var COUNT = 5000; //number of blocks to index

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }, function(err) {
  if (err) {
    console.log('Unable to connect to database: %s', dbString);
    console.log('Aborting');
    exit();
  } else {
    request({uri: 'http://127.0.0.1:' + settings.port + '/api/getpeerinfo', json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
      lib.syncLoop(body.length, function (loop) {
        var i = loop.iteration();
		var address = body[i].addr.substring(0, body[i].addr.lastIndexOf(":")).replace("[","").replace("]","");
		var rateLimit = new RateLimit(1, 2000, false);
        db.find_peer(address, function(peer) {
          if (peer) {
            // peer already exists
            loop.next();
          } else {
			rateLimit.schedule(function() {
              request({uri: 'http://ip-api.com/json/' + address + '?fields=country', json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, geo) {
                db.create_peer({
                  address: address,
                  protocol: body[i].version,
                  version: body[i].subver.replace('/', '').replace('/', ''),
                  country: geo.country
                }, function(){
                  loop.next();
                });
              });
			});
          }
        });
      }, function() {
        exit();
      });
    });
  }
});

// rate limiting class from Matteo Agosti via https://www.matteoagosti.com/blog/2013/01/22/rate-limiting-function-calls-in-javascript/
var RateLimit = (function() {
  var RateLimit = function(maxOps, interval, allowBursts) {
    this._maxRate = allowBursts ? maxOps : maxOps / interval;
    this._interval = interval;
    this._allowBursts = allowBursts;

    this._numOps = 0;
    this._start = new Date().getTime();
    this._queue = [];
  };

  RateLimit.prototype.schedule = function(fn) {
    var that = this,
        rate = 0,
        now = new Date().getTime(),
        elapsed = now - this._start;

    if (elapsed > this._interval) {
      this._numOps = 0;
      this._start = now;
    }

    rate = this._numOps / (this._allowBursts ? 1 : elapsed);

    if (rate < this._maxRate) {
      if (this._queue.length === 0) {
        this._numOps++;
        fn();
      }
      else {
        if (fn) this._queue.push(fn);

        this._numOps++;
        this._queue.shift()();
      }
    }
    else {
      if (fn) this._queue.push(fn);

      setTimeout(function() {
        that.schedule();
      }, 1 / this._maxRate);
    }
  };

  return RateLimit;
})();