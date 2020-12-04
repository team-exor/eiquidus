var mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , Tx = require('../models/tx')
  , Address = require('../models/address')
  , AddressTx = require('../models/addresstx')
  , Richlist = require('../models/richlist')
  , Stats = require('../models/stats')
  , settings = require('../lib/settings')
  , request = require('postman-request')
  , fs = require('fs');

var mode = 'update';
var database = 'index';

// displays usage and exits
function usage() {
  console.log('Usage: scripts/sync.sh /path/to/nodejs [mode]');
  console.log('');
  console.log('Mode: (required)');
  console.log('update           Updates index from last sync to current block');
  console.log('check            Checks index for (and adds) any missing transactions/addresses');
  console.log('reindex          Clears index then resyncs from genesis to current block');
  console.log('reindex-rich     Clears and recreates the richlist data');  
  console.log('reindex-txcount  Rescan and flatten the tx count value for faster access');
  console.log('market           Updates market summaries, orderbooks, trade history + charts');
  console.log('peers            Updates peer info based on local wallet connections');
  console.log('');
  console.log('Notes:');
  console.log('- \'current block\' is the latest created block when script is executed.');
  console.log('- The market + peers databases only support (& defaults to) reindex mode.');
  console.log('- If check mode finds missing data (ignoring new data since last sync),');
  console.log('  index_timeout in settings.json is set too low.')
  console.log('');
  process.exit(0);
}

// check options
if (process.argv[2] == 'index') {
  if (process.argv.length <3) {
    usage();
  } else {
    switch(process.argv[3])
    {
      case 'update':
        mode = 'update';
        break;
      case 'check':
        mode = 'check';
        break;
      case 'reindex':
        mode = 'reindex';
        break;
      case 'reindex-rich':
        mode = 'reindex-rich';
        break;
      case 'reindex-txcount':
        mode = 'reindex-txcount';
        break;
      default:
        usage();
    }
  }
} else if (process.argv[2] == 'market') {
  database = 'market';
} else if (process.argv[2] == 'peers') {
  database = 'peers';
} else {
  usage();
}

function create_lock(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.appendFile(fname, process.pid.toString(), function (err) {
      if (err) {
        console.log("Error: unable to create %s", fname);
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }
}

function remove_lock(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.unlink(fname, function (err){
      if(err) {
        console.log("unable to remove lock: %s", fname);
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }
}

function is_locked(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.exists(fname, function (exists){
      if(exists) {
        return cb(true);
      } else {
        return cb(false);
      }
    });
  } else {
    return cb();
  }
}

function exit() {
  remove_lock(function(){
    mongoose.disconnect();
    process.exit(0);
  });
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

if (database == 'peers') {
  console.log('syncing peers.. please wait..');
  // Initialize the rate limiting class from Matteo Agosti via https://www.matteoagosti.com/blog/2013/01/22/rate-limiting-function-calls-in-javascript/
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
  // syncing peers does not require a lock
  mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }, function(err) {
    if (err) {
      console.log('Unable to connect to database: %s', dbString);
      console.log('Aborting');
      exit();
    } else {
      request({uri: 'http://127.0.0.1:' + settings.port + '/api/getpeerinfo', json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
        lib.syncLoop(body.length, function (loop) {
          var i = loop.iteration();
          var address = body[i].addr.substring(0, body[i].addr.lastIndexOf(":")).replace("[","").replace("]","");
          var port = body[i].addr.substring(body[i].addr.lastIndexOf(":") + 1);
          var rateLimit = new RateLimit(1, 2000, false);
          db.find_peer(address, function(peer) {
            if (peer) {
              if (isNaN(peer['port']) || peer['port'].length < 2 || peer['country'].length < 1 || peer['country_code'].length < 1) {
                db.drop_peers(function() {
                  console.log('Saved peers missing ports or country, dropping peers. Re-run this script afterwards.');
                  exit();
                });
              }
              // peer already exists
              loop.next();
            } else {
              rateLimit.schedule(function() {
                request({uri: 'https://freegeoip.app/json/' + address, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, geo) {
                  db.create_peer({
                    address: address,
                    port: port,
                    protocol: body[i].version,
                    version: body[i].subver.replace('/', '').replace('/', ''),
                    country: geo.country_name,
                    country_code: geo.country_code
                  }, function(){
                    loop.next();
                  });
                });
              });
            }
          });
        }, function() {
          console.log('peer sync complete');
          exit();
        });
      });
    }
  });
} else {
  // index and market sync requires locking
  is_locked(function (exists) {
    if (exists) {
      console.log("Script already running..");
      process.exit(0);
    } else {
      create_lock(function (){
        console.log("script launched with pid: " + process.pid);
        mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }, function(err) {
          if (err) {
            console.log('Unable to connect to database: %s', dbString);
            console.log('Aborting');
            exit();
          } else if (database == 'index') {
            db.check_stats(settings.coin, function(exists) {
              if (exists == false) {
                console.log('Run \'npm start\' to create database structures before running this script.');
                exit();
              } else {
                db.update_db(settings.coin, function(stats){
                  if (settings.heavy == true) {
                    db.update_heavy(settings.coin, stats.count, 20, function(){
                      });
                    }
                    if (mode == 'reindex') {
                      Tx.deleteMany({}, function(err) {
                        console.log('TXs cleared.');
                        Address.deleteMany({}, function(err2) {
                          console.log('Addresses cleared.');
                          AddressTx.deleteMany({}, function(err3) {
                            console.log('Address TXs cleared.');
                            Richlist.updateOne({coin: settings.coin}, {
                              received: [],
                              balance: [],
                            }, function(err3) {
                              Stats.updateOne({coin: settings.coin}, {
                                last: 0,
                                count: 0,
                                supply: 0
                              }, function() {
                                console.log('index cleared (reindex)');
                              });
                              db.update_tx_db(settings.coin, 1, stats.count, stats.txes, settings.update_timeout, function(){
                                db.update_richlist('received', function(){
                                  db.update_richlist('balance', function(){
                                    db.get_stats(settings.coin, function(nstats){
                                      console.log('reindex complete (block: %s)', nstats.last);
                                      exit();
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  } else if (mode == 'check') {
                    console.log('starting check.. please wait..');
                    db.update_tx_db(settings.coin, 1, stats.count, stats.txes, settings.check_timeout, function(){
                      db.get_stats(settings.coin, function(nstats){
                        console.log('check complete (block: %s)', nstats.last);
                        exit();
                      });
                    });
                  } else if (mode == 'update') {
                    // Lookup the last block index
                    Tx.findOne({}, {blockindex:1}).sort({blockindex:-1}).limit(1).exec(function(err, data){
                      var nLast = stats.last;
                      if (!err && data) {
                        // start from the last block index
                        nLast = data.blockindex;
                      }

                      db.update_tx_db(settings.coin, nLast, stats.count, stats.txes, settings.update_timeout, function(){
                        db.update_richlist('received', function(){
                          db.update_richlist('balance', function(){
                            db.get_stats(settings.coin, function(nstats){
                              console.log('update complete (block: %s)', nstats.last);
                              exit();
                            });
                          });
                        });
                      });
                    });
                  } else if (mode == 'reindex-rich') {
                    console.log('check richlist');
                    db.check_richlist(settings.coin, function(exists) {
                      if (exists) console.log('richlist entry found, deleting now..');
                      db.delete_richlist(settings.coin, function(deleted) {
                        if (deleted) console.log('richlist entry deleted');
                        db.create_richlist(settings.coin, function() {
                          console.log('richlist created.');
                          db.update_richlist('received', function() {
                            console.log('richlist updated received.');
                            db.update_richlist('balance', function() {
                              console.log('richlist update complete');
                              exit();
                            });
                          });
                        });
                      });
                    });
                  } else if (mode == 'reindex-txcount') {
                    console.log('calculating tx count.. please wait..');
                    // Resetting the transaction counter requires a single lookup on the txes collection to find all txes that have a positive or zero total and 1 or more vout
                    Tx.find({'total': {$gte: 0}, 'vout': { $gte: { $size: 1 }}}).countDocuments(function(err, count) {
                      console.log('found tx count: ' + count.toString());
                      Stats.updateOne({coin: settings.coin}, {
                        txes: count
                      }, function() {
                        console.log('tx count update complete');
                        exit();
                      });
                    });
                  }
                });
              }
            });
          } else {
            //update markets
            var markets = settings.markets.enabled;
            var complete = 0;
            for (var x = 0; x < markets.length; x++) {
              var market = markets[x];
              db.check_market(market, function(mkt, exists) {
                if (exists) {
                  db.update_markets_db(mkt, function(err) {
                    if (!err) {
                      console.log('%s market data updated successfully.', mkt);
                      complete++;
                      if (complete == markets.length)
                        get_last_usd_price();
                    } else {
                      console.log('%s: %s', mkt, err);
                      complete++;
                      if (complete == markets.length)
                        get_last_usd_price();
                    }
                  });
                } else {
                  console.log('error: entry for %s does not exists in markets db.', mkt);
                  complete++;
                  if (complete == markets.length)
                  get_last_usd_price();
                }
              });
            }
          }
        });
      });
    }
  });
}

function get_last_usd_price() {
  // Get the last usd price for coinstats
  db.get_last_usd_price(function(retVal) { exit(); });
}