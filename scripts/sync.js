var mongoose = require('mongoose'),
    lib = require('../lib/explorer'),
    db = require('../lib/database'),
    Tx = require('../models/tx'),
    Address = require('../models/address'),
    AddressTx = require('../models/addresstx'),
    Richlist = require('../models/richlist'),
    Stats = require('../models/stats'),
    settings = require('../lib/settings');
var mode = 'update';
var database = 'index';

// displays usage and exits
function usage() {
  console.log('Usage: scripts/sync.sh /path/to/node [mode]');
  console.log('');
  console.log('Mode: (required)');
  console.log('update           Updates index from last sync to current block');
  console.log('check            Checks index for (and adds) any missing transactions/addresses');
  console.log('reindex          Clears index then resyncs from genesis to current block');
  console.log('reindex-rich     Clears and recreates the richlist data');
  console.log('reindex-txcount  Rescan and flatten the tx count value for faster access');
  console.log('reindex-last     Rescan and flatten the last blockindex value for faster access');
  console.log('market           Updates market summaries, orderbooks, trade history + charts');
  console.log('peers            Updates peer info based on local wallet connections');
  console.log('masternodes      Updates the list of active masternodes on the network');
  console.log('');
  console.log('Notes:');
  console.log('- \'current block\' is the latest created block when script is executed.');
  console.log('- The market + peers databases only support (& defaults to) reindex mode.');
  console.log('- If check mode finds missing data (ignoring new data since last sync),');
  console.log('  index_timeout in settings.json is set too low.');
  console.log('');
  process.exit(0);
}

// check options
if (process.argv[2] == 'index') {
  if (process.argv.length < 3)
    usage();
  else {
    switch(process.argv[3]) {
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
      case 'reindex-last':
        mode = 'reindex-last';
        break;
      default:
        usage();
    }
  }
} else if (process.argv[2] == 'market')
  database = 'market';
else if (process.argv[2] == 'peers')
  database = 'peers';
else if (process.argv[2] == 'masternodes')
  database = 'masternodes';
else
  usage();

function create_lock(cb) {
  if (database == 'index') {
    var fname = './tmp/' + database + '.pid';

    db.fs.appendFile(fname, process.pid.toString(), function (err) {
      if (err) {
        console.log("Error: unable to create %s", fname);
        process.exit(1);
      } else
        return cb();
    });
  } else
    return cb();
}

function remove_lock(cb) {
  if (database == 'index') {
    var fname = './tmp/' + database + '.pid';

    db.fs.unlink(fname, function (err) {
      if (err) {
        console.log("unable to remove lock: %s", fname);
        process.exit(1);
      } else
        return cb();
    });
  } else
    return cb();
}

function is_locked(cb) {
  if (database == 'index') {
    var fname = './tmp/' + database + '.pid';

    db.fs.exists(fname, function (exists) {
      if (exists)
        return cb(true);
      else
        return cb(false);
    });
  } else
    return cb();
}

function exit() {
  remove_lock(function() {
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
  var rateLimitLib = require('../lib/ratelimit');
  console.log('syncing peers.. please wait..');

  // syncing peers does not require a lock
  mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }, function(err) {
    if (err) {
      console.log('Unable to connect to database: %s', dbString);
      console.log('Aborting');
      exit();
    } else {
      lib.get_peerinfo(function (body) {
        if (body != null) {
          lib.syncLoop(body.length, function (loop) {
            var i = loop.iteration();
            var address = body[i].addr;
            var port = null;

            if (occurrences(address, ':') == 1 || occurrences(address, ']:') == 1) {
              // Separate the port # from the IP address
              address = address.substring(0, address.lastIndexOf(":")).replace("[", "").replace("]", "");
              port = body[i].addr.substring(body[i].addr.lastIndexOf(":") + 1);
            }

            if (address.indexOf("]") > -1) {
              // Remove [] characters from IPv6 addresses
              address = address.replace("[", "").replace("]", "");
            }

            db.find_peer(address, function(peer) {
              if (peer) {
                if ((peer['port'] != null && (isNaN(peer['port']) || peer['port'].length < 2)) || peer['country'].length < 1 || peer['country_code'].length < 1) {
                  db.drop_peers(function() {
                    console.log('Saved peers missing ports or country, dropping peers. Re-run this script afterwards.');
                    exit();
                  });
                }

                // peer already exists
                console.log('Updated peer %s [%s/%s]', address, (i + 1).toString(), body.length.toString());
                loop.next();
              } else {
                var rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

                rateLimit.schedule(function() {
                  lib.get_geo_location(address, function (error, geo) {
                    // check if an error was returned
                    if (error) {
                      console.log(error);
                      exit();
                    } else {
                      // add peer to collection
                      db.create_peer({
                        address: address,
                        port: port,
                        protocol: body[i].version,
                        version: body[i].subver.replace('/', '').replace('/', ''),
                        country: geo.country_name,
                        country_code: geo.country_code
                      }, function() {
                        console.log('Added new peer %s [%s/%s]', address, (i + 1).toString(), body.length.toString());
                        loop.next();
                      });
                    }
                  });
                });
              }
            });
          }, function() {
            // update network_last_updated value
            db.update_last_updated_stats(settings.coin.name, { network_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
              console.log('peer sync complete');
              exit();
            });
          });
        } else {
          console.log('no peers found');
          exit();
        }
      });
    }
  });
} else if (database == 'masternodes') {
  console.log('syncing masternodes.. please wait..');

  // syncing masternodes does not require a lock
  mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }, function(err) {
    if (err) {
      console.log('Unable to connect to database: %s', dbString);
      console.log('Aborting');
      exit();
    } else {
      lib.get_masternodelist(function (body) {
        if (body != null) {
          var isObject = false;
          var objectKeys = null;

          // Check if the masternode data is an array or an object
          if (body.length == null) {
            // Process data as an object
            objectKeys = Object.keys(body);
            isObject = true;
          }

          lib.syncLoop((isObject ? objectKeys : body).length, function (loop) {
            var i = loop.iteration();

            db.save_masternode((isObject ? body[objectKeys[i]] : body[i]), function (success) {
              if (success)
                loop.next();
              else {
                console.log('error: cannot save masternode %s.', (isObject ? (body[objectKeys[i]].payee ? body[objectKeys[i]].payee : 'UNKNOWN') : (body[i].addr ? body[i].addr : 'UNKNOWN')));
                exit();
              }
            });
          }, function () {
            db.remove_old_masternodes(function (cb) {
              db.update_last_updated_stats(settings.coin.name, { masternodes_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
                console.log('masternode sync complete');
                exit();
              });
            });
          });
        } else {
          console.log('no masternodes found');
          exit();
        }
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
      create_lock(function () {
        console.log("script launched with pid: " + process.pid);
        mongoose.connect(dbString, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false }, function(err) {
          if (err) {
            console.log('Unable to connect to database: %s', dbString);
            console.log('Aborting');
            exit();
          } else if (database == 'index') {
            db.check_stats(settings.coin.name, function(exists) {
              if (exists == false) {
                console.log('Run \'npm start\' to create database structures before running this script.');
                exit();
              } else {
                db.update_db(settings.coin.name, function(stats) {
                  // check if stats returned properly
                  if (stats !== false) {
                    if (settings.blockchain_specific.heavycoin.enabled == true)
                      db.update_heavy(settings.coin.name, stats.count, 20, function() {});
                    if (mode == 'reindex') {
                      Tx.deleteMany({}, function(err) {
                        console.log('TXs cleared.');

                        Address.deleteMany({}, function(err2) {
                          console.log('Addresses cleared.');

                          AddressTx.deleteMany({}, function(err3) {
                            console.log('Address TXs cleared.');

                            Richlist.updateOne({coin: settings.coin.name}, {
                              received: [],
                              balance: []
                            }, function(err3) {
                              Stats.updateOne({coin: settings.coin.name}, {
                                last: 0,
                                count: 0,
                                supply: 0
                              }, function() {
                                console.log('index cleared (reindex)');
                              });

                              // Check if the sync msg should be shown
                              check_show_sync_message(stats.count);

                              db.update_tx_db(settings.coin.name, 1, stats.count, stats.txes, settings.sync.update_timeout, function() {
                                db.update_richlist('received', function() {
                                  db.update_richlist('balance', function() {
                                    db.get_stats(settings.coin.name, function(nstats) {
                                      // always check for and remove the sync msg if exists
                                      remove_sync_message();
                                      // update richlist_last_updated value
                                      db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
                                        // update blockchain_last_updated value
                                        db.update_last_updated_stats(settings.coin.name, { blockchain_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
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
                        });
                      });
                    } else if (mode == 'check') {
                      console.log('starting check.. please wait..');

                      db.update_tx_db(settings.coin.name, 1, stats.count, stats.txes, settings.sync.check_timeout, function() {
                        db.get_stats(settings.coin.name, function(nstats) {
                          console.log('check complete (block: %s)', nstats.last);
                          exit();
                        });
                      });
                    } else if (mode == 'update') {
                      // Get the last synced block index value
                      var last = (stats.last ? stats.last : 0);
                      // Get the total number of blocks
                      var count = (stats.count ? stats.count : 0);
                      // Check if the sync msg should be shown
                      check_show_sync_message(count - last);

                      db.update_tx_db(settings.coin.name, last, count, stats.txes, settings.sync.update_timeout, function() {
                        db.update_richlist('received', function() {
                          db.update_richlist('balance', function() {
                            db.get_stats(settings.coin.name, function(nstats) {
                              // always check for and remove the sync msg if exists
                              remove_sync_message();
                              // update richlist_last_updated value
                              db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
                                // update blockchain_last_updated value
                                db.update_last_updated_stats(settings.coin.name, { blockchain_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
                                  console.log('update complete (block: %s)', nstats.last);
                                  exit();
                                });
                              });
                            });
                          });
                        });
                      });
                    } else if (mode == 'reindex-rich') {
                      console.log('check richlist');

                      db.check_richlist(settings.coin.name, function(exists) {
                        if (exists)
                          console.log('richlist entry found, deleting now..');

                        db.delete_richlist(settings.coin.name, function(deleted) {
                          if (deleted)
                            console.log('richlist entry deleted');

                          db.create_richlist(settings.coin.name, function() {
                            console.log('richlist created.');

                            db.update_richlist('received', function() {
                              console.log('richlist updated received.');

                              db.update_richlist('balance', function() {
                                // update richlist_last_updated value
                                db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
                                  console.log('richlist update complete');
                                  exit();
                                });
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
                        Stats.updateOne({coin: settings.coin.name}, {
                          txes: count
                        }, function() {
                          console.log('tx count update complete');
                          exit();
                        });
                      });
                    } else if (mode == 'reindex-last') {
                      console.log('finding last blockindex.. please wait..');

                      // Resetting the last blockindex counter requires a single lookup on the txes collection to find the last indexed blockindex
                      Tx.find({}, {blockindex:1, _id:0}).sort({blockindex: -1}).limit(1).exec(function(err, tx) {
                        // check if any blocks exists
                        if (err != null || tx == null || tx.length == 0) {
                          console.log('no blocks found. setting last blockindex to 0.');

                          Stats.updateOne({coin: settings.coin.name}, {
                            last: 0
                          }, function() {
                            console.log('last blockindex update complete');
                            exit();
                          });
                        } else {
                          console.log('found last blockindex: ' + tx[0].blockindex.toString());

                          Stats.updateOne({coin: settings.coin.name}, {
                            last: tx[0].blockindex
                          }, function() {
                            console.log('last blockindex update complete');
                            exit();
                          });
                        }
                      });
                    }
                  } else {
                    // update_db threw an error so exit
                    exit();
                  }
                });
              }
            });
          } else {
            // check if market feature is enabled
            if (settings.markets_page.enabled == true) {
              var complete = 0;
              var total_pairs = 0;
              var exchanges = Object.keys(settings.markets_page.exchanges);

              // loop through all exchanges to determine how many trading pairs must be updated
              exchanges.forEach(function (key, index, map) {
                // check if market is enabled via settings
                if (settings.markets_page.exchanges[key].enabled == true) {
                  // check if market is installed/supported
                  if (db.fs.existsSync('./lib/markets/' + key + '.js')) {
                    // add trading pairs to total
                    total_pairs += settings.markets_page.exchanges[key].trading_pairs.length;

                    // loop through all trading pairs for this market
                    for (var i = 0; i < settings.markets_page.exchanges[key].trading_pairs.length; i++) {
                      // ensure trading pair setting is always uppercase
                      settings.markets_page.exchanges[key].trading_pairs[i] = settings.markets_page.exchanges[key].trading_pairs[i].toUpperCase();
                    }
                  }
                }
              });

              // check if there are any trading pairs to update
              if (total_pairs > 0) {
                // initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
                var rateLimitLib = require('../lib/ratelimit');
                var rateLimit = new rateLimitLib.RateLimit(1, 2000, false);
                // loop through and test all exchanges defined in the settings.json file
                exchanges.forEach(function (key, index, map) {
                  // check if market is enabled via settings
                  if (settings.markets_page.exchanges[key].enabled == true) {
                    // check if market is installed/supported
                    if (db.fs.existsSync('./lib/markets/' + key + '.js')) {
                      // loop through all trading pairs
                      settings.markets_page.exchanges[key].trading_pairs.forEach(function (pair_key, pair_index, pair_map) {
                        // split the pair data
                        var split_pair = pair_key.split('/');
                        // check if this is a valid trading pair
                        if (split_pair.length == 2) {
                          // lookup the exchange in the market collection
                          db.check_market(key, split_pair[0], split_pair[1], function(mkt, exists) {
                            // check if exchange trading pair exists in the market collection
                            if (exists) {
                              // automatically pause for 2 seconds in between requests
                              rateLimit.schedule(function() {
                                // update market data
                                db.update_markets_db(key, split_pair[0], split_pair[1], function(err) {
                                  if (!err) {
                                    console.log('%s[%s]: market data updated successfully.', key, pair_key);
                                    complete++;

                                    if (complete == total_pairs)
                                      get_last_usd_price();
                                  } else {
                                    console.log('%s[%s] error: %s', key, pair_key, err);
                                    complete++;

                                    if (complete == total_pairs)
                                      get_last_usd_price();
                                  }
                                });
                              });
                            } else {
                              console.log('error: entry for %s does not exist in markets database.', key);
                              complete++;
                              if (complete == total_pairs)
                                get_last_usd_price();
                            }
                          });
                        }
                      });
                    } else {
                      // market not installed
                      console.log('%s market not installed', key);
                      complete++;

                      if (complete == total_pairs)
                        get_last_usd_price();
                    }
                  }
                });
              } else {
                // no market trading pairs are enabled
                console.log('error: no market trading pairs are enabled in settings');
                exit();
              }
            } else {
              // market page is not enabled
              console.log('error: market feature is disabled in settings');
              exit();
            }
          }
        });
      });
    }
  });
}

function check_show_sync_message(blocks_to_sync) {
  var retVal = false;
  var filePath = './tmp/show_sync_message.tmp';
  // Check if the sync msg should be shown
  if (blocks_to_sync > settings.sync.show_sync_msg_when_syncing_more_than_blocks) {
    // Check if the show sync stub file already exists
    if (!db.fs.existsSync(filePath)) {
      // File doesn't exist, so create it now
      db.fs.writeFileSync(filePath, '');
    }

    retVal = true;
  }

  return retVal;
}

function remove_sync_message() {
  var filePath = './tmp/show_sync_message.tmp';
  // Check if the show sync stub file exists
  if (db.fs.existsSync(filePath)) {
    // File exists, so delete it now
    try {
      db.fs.unlinkSync(filePath);
    } catch (err) {
      console.log(err);
    }
  }
}

function get_last_usd_price() {
  // Get the last usd price for coinstats
  db.get_last_usd_price(function(retVal) {
    // update markets_last_updated value
    db.update_last_updated_stats(settings.coin.name, { markets_last_updated: Math.floor(new Date() / 1000) }, function (cb) {
      console.log('market sync complete');
      exit();
    });
  });
}

/** Function that count occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
function occurrences(string, subString, allowOverlapping) {
  string += "";
  subString += "";
  if (subString.length <= 0) return (string.length + 1);

  var n = 0,
      pos = 0,
      step = allowOverlapping ? 1 : subString.length;

  while (true) {
      pos = string.indexOf(subString, pos);
      if (pos >= 0) {
          ++n;
          pos += step;
      } else break;
  }
  return n;
}