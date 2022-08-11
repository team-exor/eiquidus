var mongoose = require('mongoose'),
    lib = require('../lib/explorer'),
    db = require('../lib/database'),
    Tx = require('../models/tx'),
    Address = require('../models/address'),
    AddressTx = require('../models/addresstx'),
    Richlist = require('../models/richlist'),
    Stats = require('../models/stats'),
    settings = require('../lib/settings'),
    async = require('async');
var mode = 'update';
var database = 'index';
var block_start = 1;
var lockCreated = false;
var stopSync = false;

// prevent stopping of the sync script to be able to gracefully shut down
process.on('SIGINT', () => {
  console.log('Stopping sync process.. Please wait..');
  stopSync = true;
});

// prevent killing of the sync script to be able to gracefully shut down
process.on('SIGTERM', () => {
  console.log('Stopping sync process.. Please wait..');
  stopSync = true;
});

// displays usage and exits
function usage() {
  console.log('Usage: /path/to/node scripts/sync.js [mode]');
  console.log('');
  console.log('Mode: (required)');
  console.log('update           Updates index from last sync to current block');
  console.log('check            Checks index for (and adds) any missing transactions/addresses');
  console.log('                 Optional parameter: block number to start checking from');
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
  console.log('- If check mode finds missing data (other than new data since last sync),');
  console.log('  this likely means that sync.update_timeout in settings.json is set too low.');
  console.log('');
  process.exit(100);
}

// exit function used to cleanup before finishing script
function exit(exitCode) {
  // always disconnect mongo connection
  mongoose.disconnect();

  // only remove sync lock if it was created in this session
  if (!lockCreated || lib.remove_lock(database) == true) {
    // clean exit with previous exit code
    process.exit(exitCode);
  } else {
    // error removing lock
    process.exit(1);
  }
}

// updates tx, address & richlist db's
function update_tx_db(coin, start, end, txes, timeout, check_only, cb) {
  var complete = false;
  var blocks_to_scan = [];
  var task_limit_blocks = settings.sync.block_parallel_tasks;
  var task_limit_txs = 1;

  // fix for invalid block height (skip genesis block as it should not have valid txs)
  if (typeof start === 'undefined' || start < 1)
    start = 1;

  if (task_limit_blocks < 1)
    task_limit_blocks = 1;

  for (i = start; i < (end + 1); i++)
    blocks_to_scan.push(i);

  async.eachLimit(blocks_to_scan, task_limit_blocks, function(block_height, next_block) {
    if (!check_only && block_height % settings.sync.save_stats_after_sync_blocks === 0) {
      Stats.updateOne({coin: coin}, {
        last: block_height - 1,
        txes: txes
      }, function() {});
    } else if (check_only) {
      console.log('Checking block ' + block_height + '...');
    }

    lib.get_blockhash(block_height, function(blockhash) {
      if (blockhash) {
        lib.get_block(blockhash, function(block) {
          if (block) {
            async.eachLimit(block.tx, task_limit_txs, function(txid, next_tx) {
              Tx.findOne({txid: txid}, function(err, tx) {
                if (tx) {
                  setTimeout( function() {
                    tx = null;

                    // check if the script is stopping
                    if (stopSync) {
                      // stop the loop
                      next_tx({});
                    } else
                      next_tx();
                  }, timeout);
                } else {
                  db.save_tx(txid, block_height, function(err, tx_has_vout) {
                    if (err)
                      console.log(err);
                    else
                      console.log('%s: %s', block_height, txid);

                    if (tx_has_vout)
                      txes++;

                    setTimeout( function() {
                      tx = null;

                      // check if the script is stopping
                      if (stopSync) {
                        // stop the loop
                        next_tx({});
                      } else
                        next_tx();
                    }, timeout);
                  });
                }
              });
            }, function() {
              setTimeout( function() {
                blockhash = null;
                block = null;

                // check if the script is stopping
                if (stopSync) {
                  // stop the loop
                  next_block({});
                } else
                  next_block();
              }, timeout);
            });
          } else {
            console.log('Block not found: %s', blockhash);

            setTimeout( function() {
              // check if the script is stopping
              if (stopSync) {
                // stop the loop
                next_block({});
              } else
                next_block();
            }, timeout);
          }
        });
      } else {
        setTimeout( function() {
          // check if the script is stopping
          if (stopSync) {
            // stop the loop
            next_block({});
          } else
            next_block();
        }, timeout);
      }
    });
  }, function() {
    // check if the script stopped prematurely
    if (!stopSync) {
      Stats.updateOne({coin: coin}, {
        last: end,
        txes: txes
      }, function() {
        return cb();
      });
    } else
      return cb();
  });
}

function update_heavy(coin, height, count, heavycoin_enabled, cb) {
  if (heavycoin_enabled == true) {
    db.update_heavy(coin, height, count, function() {
      return cb(true);
    });
  } else
    return cb(false);
}

function update_network_history(height, network_history_enabled, cb) {
  if (network_history_enabled == true) {
    db.update_network_history(height, function() {
      return cb(true);
    });
  } else
    return cb(false);
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

function get_last_usd_price() {
  // get the last usd price for coinstats
  db.get_last_usd_price(function(err) {
    // check for errors
    if (err == null) {
      // update markets_last_updated value
      db.update_last_updated_stats(settings.coin.name, { markets_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
        // check if the script stopped prematurely
        if (stopSync) {
          console.log('Market sync was stopped prematurely');
          exit(1);
        } else {
          console.log('Market sync complete');
          exit(0);
        }
      });
    } else {
      // display error msg
      console.log('Error: %s', err);
      exit(1);      
    }
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

// check options
if (process.argv[2] == null || process.argv[2] == 'index' || process.argv[2] == 'update') {
  mode = null;

  switch (process.argv[3]) {
    case undefined:
    case null:
    case 'update':
      mode = 'update';
      break;
    case 'check':
      mode = 'check';

      // check if the block start value was passed in and is an integer
      if (!isNaN(process.argv[4]) && Number.isInteger(parseFloat(process.argv[4]))) {
        // Check if the block start value is less than 1
        if (parseInt(process.argv[4]) < 1)
          block_start = 1;
        else
          block_start = parseInt(process.argv[4]);
      }

      break;
    case 'reindex':
      // check if readlinesync module is installed
      if (!db.fs.existsSync('./node_modules/readline-sync')) {
        const { execSync } = require('child_process');

        console.log('Installing missing packages.. Please wait..');

        // install updated packages
        execSync('npm update');
      }

      const readlineSync = require('readline-sync');

      console.log('You are about to delete all blockchain data (transactions and addresses)');
      console.log('and resync from the genesis block.');

      // prompt for the reindex
      if (readlineSync.keyInYN('Are you sure you want to do this? ')) {
        // set mode to 'reindex'
        mode = 'reindex';
      } else {
        console.log('Process aborted. Nothing was deleted');
        exit(2);
      }

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
} else if (process.argv[2] == 'peers' || process.argv[2] == 'masternodes')
  database = process.argv[2];
else if (process.argv[2] == 'market')
  database = `${process.argv[2]}s`;
else
  usage();

// check if this sync option is already running/locked
if (lib.is_locked([database]) == false) {
  // create a new sync lock before checking the rest of the locks to minimize problems with running scripts at the same time
  lib.create_lock(database);
  // ensure the lock will be deleted on exit
  lockCreated = true;
  // check the backup, restore and delete locks since those functions would be problematic when updating data
  if (lib.is_locked(['backup', 'restore', 'delete']) == false) {
    // all tests passed. OK to run sync
    console.log("Script launched with pid: " + process.pid);

    if (mode == 'update')
      console.log(`Syncing ${(database == 'index' ? 'blocks' : database)}.. Please wait..`);

    var dbString = 'mongodb://' + encodeURIComponent(settings.dbsettings.user);
    dbString = dbString + ':' + encodeURIComponent(settings.dbsettings.password);
    dbString = dbString + '@' + settings.dbsettings.address;
    dbString = dbString + ':' + settings.dbsettings.port;
    dbString = dbString + '/' + settings.dbsettings.database;

    mongoose.connect(dbString, function(err) {
      if (err) {
        console.log('Error: Unable to connect to database: %s', dbString);
        exit(1);
      } else if (database == 'index') {
        db.check_stats(settings.coin.name, function(exists) {
          if (exists == false) {
            console.log('Run \'npm start\' to create database structures before running this script.');
            exit(1);
          } else {
            db.update_db(settings.coin.name, function(stats) {
              // check if stats returned properly
              if (stats !== false) {
                // determine which index mode to run
                if (mode == 'reindex') {
                  console.log('Deleting transactions.. Please wait..');
                  Tx.deleteMany({}, function(err) {
                    console.log('Transactions deleted successfully');

                    console.log('Deleting addresses.. Please wait..');
                    Address.deleteMany({}, function(err2) {
                      console.log('Addresses deleted successfully');

                      console.log('Deleting address transactions.. Please wait..');
                      AddressTx.deleteMany({}, function(err3) {
                        console.log('Address transactions deleted successfully');

                        console.log('Deleting top 100 data.. Please wait..');
                        Richlist.updateOne({coin: settings.coin.name}, {
                          received: [],
                          balance: []
                        }, function(err3) {
                          console.log('Top 100 data deleted successfully');

                          console.log('Deleting block index.. Please wait..');
                          Stats.updateOne({coin: settings.coin.name}, {
                            last: 0,
                            count: 0,
                            supply: 0,
                            txes: 0,
                            blockchain_last_updated: 0,
                            richlist_last_updated: 0
                          }, function() {
                            console.log('Block index deleted successfully');

                            // Check if the sync msg should be shown
                            check_show_sync_message(stats.count);

                            console.log('Starting resync of blockchain data.. Please wait..');
                            update_tx_db(settings.coin.name, block_start, stats.count, stats.txes, settings.sync.update_timeout, false, function() {
                              // check if the script stopped prematurely
                              if (stopSync) {
                                console.log('Reindex was stopped prematurely');
                                exit(1);
                              } else {
                                // update blockchain_last_updated value
                                db.update_last_updated_stats(settings.coin.name, { blockchain_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                                  db.update_richlist('received', function() {
                                    db.update_richlist('balance', function() {
                                      // update richlist_last_updated value
                                      db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                                        db.get_stats(settings.coin.name, function(nstats) {
                                          // check for and update heavycoin data if applicable
                                          update_heavy(settings.coin.name, stats.count, 20, settings.blockchain_specific.heavycoin.enabled, function(heavy) {
                                            // check for and update network history data if applicable
                                            update_network_history(nstats.last, settings.network_history.enabled, function(network_hist) {
                                              // always check for and remove the sync msg if exists
                                              db.remove_sync_message();

                                              console.log('Reindex complete (block: %s)', nstats.last);
                                              exit(0);
                                            });
                                          });
                                        });
                                      });
                                    });
                                  });
                                });
                              }
                            });
                          });
                        });
                      });
                    });
                  });
                } else if (mode == 'check') {
                  console.log('Checking blocks.. Please wait..');

                  update_tx_db(settings.coin.name, block_start, stats.count, stats.txes, settings.sync.check_timeout, true, function() {
                    // check if the script stopped prematurely
                    if (stopSync) {
                      console.log('Block check was stopped prematurely');
                      exit(1);
                    } else {
                      db.get_stats(settings.coin.name, function(nstats) {
                        console.log('Block check complete (block: %s)', nstats.last);
                        exit(0);
                      });
                    }
                  });
                } else if (mode == 'update') {
                  // Get the last synced block index value
                  var last = (stats.last ? stats.last : 0);
                  // Get the total number of blocks
                  var count = (stats.count ? stats.count : 0);
                  // Check if the sync msg should be shown
                  check_show_sync_message(count - last);

                  update_tx_db(settings.coin.name, last, count, stats.txes, settings.sync.update_timeout, false, function() {
                    // check if the script stopped prematurely
                    if (stopSync) {
                      console.log('Block sync was stopped prematurely');
                      exit(1);
                    } else {
                      // update blockchain_last_updated value
                      db.update_last_updated_stats(settings.coin.name, { blockchain_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                        db.update_richlist('received', function() {
                          db.update_richlist('balance', function() {
                            // update richlist_last_updated value
                            db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function(cb) {                              
                              db.get_stats(settings.coin.name, function(nstats) {
                                // check for and update heavycoin data if applicable
                                update_heavy(settings.coin.name, stats.count, 20, settings.blockchain_specific.heavycoin.enabled, function(heavy) {
                                  // check for and update network history data if applicable
                                  update_network_history(nstats.last, settings.network_history.enabled, function(network_hist) {
                                    // always check for and remove the sync msg if exists
                                    db.remove_sync_message();

                                    console.log('Block sync complete (block: %s)', nstats.last);
                                    exit(0);
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    }
                  });
                } else if (mode == 'reindex-rich') {
                  console.log('Check richlist');

                  db.check_richlist(settings.coin.name, function(exists) {
                    if (exists)
                      console.log('Richlist entry found, deleting now..');

                    db.delete_richlist(settings.coin.name, function(deleted) {
                      if (deleted)
                        console.log('Richlist entry deleted');

                      db.create_richlist(settings.coin.name, false, function() {
                        console.log('Richlist created');

                        db.update_richlist('received', function() {
                          console.log('Richlist updated received');

                          db.update_richlist('balance', function() {
                            // update richlist_last_updated value
                            db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                              console.log('Richlist update complete');
                              exit(0);
                            });
                          });
                        });
                      });
                    });
                  });
                } else if (mode == 'reindex-txcount') {
                  console.log('Calculating tx count.. Please wait..');

                  // Resetting the transaction counter requires a single lookup on the txes collection to find all txes that have a positive or zero total and 1 or more vout
                  Tx.find({'total': {$gte: 0}, 'vout': { $gte: { $size: 1 }}}).countDocuments(function(err, count) {
                    console.log('Found tx count: ' + count.toString());
                    Stats.updateOne({coin: settings.coin.name}, {
                      txes: count
                    }, function() {
                      console.log('Tx count update complete');
                      exit(0);
                    });
                  });
                } else if (mode == 'reindex-last') {
                  console.log('Finding last blockindex.. Please wait..');

                  // Resetting the last blockindex counter requires a single lookup on the txes collection to find the last indexed blockindex
                  Tx.find({}, {blockindex:1, _id:0}).sort({blockindex: -1}).limit(1).exec(function(err, tx) {
                    // check if any blocks exists
                    if (err != null || tx == null || tx.length == 0) {
                      console.log('No blocks found. setting last blockindex to 0.');

                      Stats.updateOne({coin: settings.coin.name}, {
                        last: 0
                      }, function() {
                        console.log('Last blockindex update complete');
                        exit(0);
                      });
                    } else {
                      console.log('Found last blockindex: ' + tx[0].blockindex.toString());

                      Stats.updateOne({coin: settings.coin.name}, {
                        last: tx[0].blockindex
                      }, function() {
                        console.log('Last blockindex update complete');
                        exit(0);
                      });
                    }
                  });
                }
              } else {
                // update_db threw an error so exit
                exit(1);
              }
            });
          }
        });
      } else if (database == 'peers') {
        lib.get_peerinfo(function(body) {
          if (body != null) {
            lib.syncLoop(body.length, function(loop) {
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

              db.find_peer(address, port, function(peer) {
                if (peer) {
                  if (peer['port'] != null && (isNaN(peer['port']) || peer['port'].length < 2)) {
                    db.drop_peers(function() {
                      console.log('Removing peers due to missing port information. Re-run this script to add peers again.');
                      exit(1);
                    });
                  }

                  // peer already exists and should be refreshed
                  // drop peer
                  db.drop_peer(address, port, function() {
                    // re-add the peer to refresh the data and extend the expiry date
                    db.create_peer({
                      address: address,
                      port: port,
                      protocol: peer.protocol,
                      version: peer.version,
                      country: peer.country,
                      country_code: peer.country_code
                    }, function() {
                      console.log('Updated peer %s:%s [%s/%s]', address, port.toString(), (i + 1).toString(), body.length.toString());

                      // check if the script is stopping
                      if (stopSync) {
                        // stop the loop
                        loop.break(true);
                      }

                      loop.next();
                    });
                  });
                } else {
                  const rateLimitLib = require('../lib/ratelimit');
                  const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

                  rateLimit.schedule(function() {
                    lib.get_geo_location(address, function(error, geo) {
                      // check if an error was returned
                      if (error) {
                        console.log(error);
                        exit(1);
                      } else if (geo == null || typeof geo != 'object') {
                        console.log('Error: geolocation api did not return a valid object');
                        exit(1);
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
                          console.log('Added new peer %s:%s [%s/%s]', address, port.toString(), (i + 1).toString(), body.length.toString());

                          // check if the script is stopping
                          if (stopSync) {
                            // stop the loop
                            loop.break(true);
                          }

                          loop.next();
                        });
                      }
                    });
                  });
                }
              });
            }, function() {
              // update network_last_updated value
              db.update_last_updated_stats(settings.coin.name, { network_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                // check if the script stopped prematurely
                if (stopSync) {
                  console.log('Peer sync was stopped prematurely');
                  exit(1);
                } else {
                  console.log('Peer sync complete');
                  exit(0);
                }
              });
            });
          } else {
            console.log('No peers found');
            exit(2);
          }
        });
      } else if (database == 'masternodes') {
        lib.get_masternodelist(function(body) {
          if (body != null) {
            var isObject = false;
            var objectKeys = null;

            // Check if the masternode data is an array or an object
            if (body.length == null) {
              // Process data as an object
              objectKeys = Object.keys(body);
              isObject = true;
            }

            lib.syncLoop((isObject ? objectKeys : body).length, function(loop) {
              var i = loop.iteration();

              db.save_masternode((isObject ? body[objectKeys[i]] : body[i]), function(success) {
                if (success) {
                  // check if the script is stopping
                  if (stopSync) {
                    // stop the loop
                    loop.break(true);
                  }

                  loop.next();
                } else {
                  console.log('Error: Cannot save masternode %s.', (isObject ? (body[objectKeys[i]].payee ? body[objectKeys[i]].payee : 'UNKNOWN') : (body[i].addr ? body[i].addr : 'UNKNOWN')));
                  exit(1);
                }
              });
            }, function() {
              db.remove_old_masternodes(function(cb) {
                db.update_last_updated_stats(settings.coin.name, { masternodes_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
                  // check if the script stopped prematurely
                  if (stopSync) {
                    console.log('Masternode sync was stopped prematurely');
                    exit(1);
                  } else {
                    console.log('Masternode sync complete');
                    exit(0);
                  }
                });
              });
            });
          } else {
            console.log('No masternodes found');
            exit(2);
          }
        });
      } else {
        // check if market feature is enabled
        if (settings.markets_page.enabled == true) {
          var complete = 0;
          var total_pairs = 0;
          var exchanges = Object.keys(settings.markets_page.exchanges);

          // loop through all exchanges to determine how many trading pairs must be updated
          exchanges.forEach(function(key, index, map) {
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
            exchanges.forEach(function(key, index, map) {
              // check if market is enabled via settings
              if (settings.markets_page.exchanges[key].enabled == true) {
                // check if market is installed/supported
                if (db.fs.existsSync('./lib/markets/' + key + '.js')) {
                  // loop through all trading pairs
                  settings.markets_page.exchanges[key].trading_pairs.forEach(function(pair_key, pair_index, pair_map) {
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
                                console.log('%s[%s]: Market data updated successfully.', key, pair_key);
                                complete++;

                                if (complete == total_pairs || stopSync)
                                  get_last_usd_price();
                              } else {
                                console.log('%s[%s] Error: %s', key, pair_key, err);
                                complete++;

                                if (complete == total_pairs || stopSync)
                                  get_last_usd_price();
                              }
                            });
                          });
                        } else {
                          console.log('Error: Entry for %s[%s] does not exist in markets database.', key, pair_key);
                          complete++;
                          if (complete == total_pairs || stopSync)
                            get_last_usd_price();
                        }
                      });
                    }
                  });
                } else {
                  // market not installed
                  console.log('%s market not installed', key);
                  complete++;

                  if (complete == total_pairs || stopSync)
                    get_last_usd_price();
                }
              }
            });
          } else {
            // no market trading pairs are enabled
            console.log('Error: No market trading pairs are enabled in settings');
            exit(1);
          }
        } else {
          // market page is not enabled
          console.log('Error: Market feature is disabled in settings');
          exit(1);
        }
      }
    });
  } else {
    // another script process is currently running
    console.log("Sync aborted");
    exit(2);
  }
} else {
  // sync process is already running
  console.log("Sync aborted");
  exit(2);
}