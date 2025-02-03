const mongoose = require('mongoose');
const lib = require('../lib/explorer');
const blkSync = require('../lib/block_sync');
const db = require('../lib/database');
const Tx = require('../models/tx');
const Address = require('../models/address');
const AddressTx = require('../models/addresstx');
const Orphans = require('../models/orphans');
const Richlist = require('../models/richlist');
const Stats = require('../models/stats');
const settings = require('../lib/settings');
const async = require('async');
let mode = 'update';
let database = 'index';
let block_start = 1;
let lockCreated = false;
let stopSync = false;

// prevent stopping of the sync script to be able to gracefully shut down
process.on('SIGINT', () => {
  if (!blkSync.getStackSizeErrorId())
    console.log(`${settings.localization.stopping_sync_process}.. ${settings.localization.please_wait}..`);

  blkSync.setStopSync(true);
  stopSync = true;
});

// prevent killing of the sync script to be able to gracefully shut down
process.on('SIGTERM', () => {
  if (!blkSync.getStackSizeErrorId())
    console.log(`${settings.localization.stopping_sync_process}.. ${settings.localization.please_wait}..`);

  blkSync.setStopSync(true);
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

// fixes data belonging to orphaned blocks
function update_orphans(orphan_index, orphan_current, last_blockindex, timeout, cb) {
  // lookup the earliest orphaned block if this is the first time that orphans are being checked
  get_earliest_orphan_block(orphan_index, orphan_current, last_blockindex, function(orphan_data, err) {
    if (err != null) {
      console.log(err);
      return cb();
    } else {
      // re-populate the orphan data in case it has changed
      orphan_index = orphan_data.orphan_index;
      orphan_current = orphan_data.orphan_current;

      // Check if the sync msg should be shown
      check_show_sync_message(last_blockindex - orphan_index);

      // start from the current orphan (if exists) or else use the last orphan index
      let current_block = (orphan_current == 0 ? orphan_index : orphan_current);
      let unresolved_forks = [];
      let correct_block_data = null;

      // loop infinitely until finished iterating through all known blocks
      async.forever(function(next) {
        // check if the script is stopping or if the last block has been reached
        if (stopSync || current_block >= last_blockindex) {
          // stop the main loop
          next('stop');
        } else {
          if (unresolved_forks.length == 0 && current_block % settings.sync.save_stats_after_sync_blocks === 0) {
            Stats.updateOne({coin: settings.coin.name}, {
              orphan_index: current_block - 1,
              orphan_current: (unresolved_forks.length == 0 ? 0 : unresolved_forks[0])
            }).then(() => {}).catch((staterr) => {
              console.log(staterr);
            });
          }

          // do not show the 'checking...' msg if this block is about to be resolved
          if (correct_block_data == null)
            console.log(current_block.toString() + ': Checking for forks...');

          // check if there is a fork in this block
          check_block_height_for_fork(current_block, function(blockhashes, fork_err) {
            if (fork_err != null) {
              // an error occurred
              // stop looking for orphans
              next(fork_err);
            } else if (blockhashes == null) {
              // no forks found in this block
              // check if there are previously unresolved forks
              if (unresolved_forks.length == 0) {
                // move to the next block
                current_block++;

                setTimeout(function() {
                  // process next block
                  next(null);
                }, timeout);
              } else {
                // one or more forks still need to be resolved
                // set the current block to the block after the next orphaned block
                current_block = unresolved_forks[unresolved_forks.length - 1] + 1;

                // lookup the block hash using the block height
                lib.get_blockhash(current_block, function(block_hash) {
                  // check if the block hash was found
                  if (block_hash) {
                    // lookup the current block data from the wallet
                    lib.get_block(block_hash, function (block_data) {
                      // remember the correct block hashes
                      correct_block_data = {
                        prev_hash: block_data.previousblockhash,
                        next_hash: block_data.hash
                      };

                      console.log('Good ' + current_block.toString() + ' block found. Returning to fix block ' + unresolved_forks[unresolved_forks.length -1].toString());

                      // go back to the last unresolved fork
                      current_block = unresolved_forks.pop();

                      setTimeout(function() {
                        // process next block
                        next(null);
                      }, timeout);
                    });
                  } else {
                    // an error occurred
                    // stop looking for orphans
                    next('cannot find block ' + current_block.toString());
                  }
                });
              }
            } else {
              // there is at least one fork in this block height
              // check if the correct block hash is known
              if (correct_block_data != null) {
                // this fork needs to be resolved
                // lookup the current block data from the wallet
                lib.get_block(correct_block_data.prev_hash, function (block_data) {
                  let tx_count = 0;

                  // check if the good block hash is in the list of blockhashes
                  if (blockhashes.indexOf(correct_block_data.prev_hash) > -1) {
                    // remove the good block hash
                    blockhashes.splice(blockhashes.indexOf(correct_block_data.prev_hash), 1);
                  }

                  // loop through the remaining orphaned block hashes
                  async.timesSeries(blockhashes.length, function(i, block_loop) {
                    console.log('Resolving orphaned block [' + (i + 1).toString() + '/' + blockhashes.length.toString() + ']: ' + blockhashes[i]);

                    // find all orphaned txid's from the current orphan block hash
                    get_orphaned_txids(blockhashes[i], function(txids) {
                      // save the orphan block data to the orphan collection
                      create_orphan(current_block, blockhashes[i], correct_block_data.prev_hash, block_data.previousblockhash, correct_block_data.next_hash, function() {
                        // loop through the remaining orphaned block hashes
                        async.eachSeries(txids, function(current_txid, tx_loop) {
                          // remove the orphaned tx and cleanup all associated data
                          blkSync.delete_and_cleanup_tx(current_txid, current_block, timeout, function(updated_tx_count) {
                            // update the running tx count
                            tx_count += updated_tx_count;

                            // some blockchains will reuse the same orphaned transaction ids
                            // lookup the transaction that was just deleted to ensure it doesn't belong to another block
                            check_add_tx(current_txid, blockhashes[i], tx_count, function(updated_tx_count2) {
                              // update the running tx count
                              tx_count = updated_tx_count2;

                              setTimeout(function() {
                                // check if there was a memory error
                                if (blkSync.getStackSizeErrorId() != null) {
                                  // stop the loop
                                  tx_loop({});
                                } else {
                                  // move to the next tx record
                                  tx_loop();
                                }
                              }, timeout);
                            });
                          });
                        }, function() {
                          setTimeout(function() {
                            // check if there was a memory error
                            if (blkSync.getStackSizeErrorId() != null) {
                              // stop the loop
                              block_loop({});
                            } else {
                              // move to the next block record
                              block_loop();
                            }
                          }, timeout);
                        });
                      });
                    });
                  }, function() {
                    // check if there was a memory error
                    if (!blkSync.getStackSizeErrorId()) {
                      // get the most recent stats
                      Stats.findOne({coin: settings.coin.name}).then((stats) => {
                        // add missing txes for the current block
                        blkSync.update_tx_db(settings.coin.name, current_block, current_block, (stats.txes + tx_count), timeout, 2, function(updated_tx_count) {
                          // update the stats collection by removing the orphaned txes in this block from the tx count
                          // and setting the orphan_index and orphan_current values in case the sync is interrupted before finishing
                          Stats.updateOne({coin: settings.coin.name}, {
                            orphan_index: current_block,
                            orphan_current: (unresolved_forks.length == 0 ? 0 : unresolved_forks[0])
                          }).then(() => {
                            // clear the saved block hash data
                            correct_block_data = null;

                            // move to the next block
                            current_block++;

                            setTimeout(function() {
                              // process next block
                              next(null);
                            }, timeout);
                          }).catch((err) => {
                            console.log(err);

                            // clear the saved block hash data
                            correct_block_data = null;

                            // move to the next block
                            current_block++;

                            setTimeout(function() {
                              // process next block
                              next(null);
                            }, timeout);
                          });
                        });
                      }).catch((err) => {
                        console.log(err);

                        setTimeout(function() {
                          // process next block
                          next(null);
                        }, timeout);
                      });
                    } else {
                      setTimeout(function() {
                        // stop the loop
                        next('StackSizeError');
                      }, timeout);
                    }
                  });
                });
              } else {
                // correct block hash is unknown
                console.log('Block ' + current_block.toString() + ' has ' + (blockhashes.length - 1).toString() + ' unresolved fork' + (blockhashes.length - 1 == 1 ? '' : 's'));

                // add this block height to the list of unresolved forks
                unresolved_forks.push(current_block);

                // move to the next block
                current_block++;

                setTimeout(function() {
                  // process next block
                  next(null);
                }, timeout);
              }
            }
          });
        }
      },
      function(err) {
        // check if there is a msg to display
        if (err != '' && err != 'stop') {
          // check if this is the StackSizeError error
          if (err == 'StackSizeError') {
            // reload the sync process
            blkSync.respawnSync();
          } else {
            // display the msg
            console.log(err);

            // stop fixing orphaned block data
            return cb();
          }
        } else {
          // check if the script is stopping
          if (!stopSync)
            console.log('Finished looking for forks');

          // get the list of orphans with a null next_blockhash
          Orphans.find({next_blockhash: null}).exec().then((orphans) => {
            // loop through the list of orphans
            async.eachSeries(orphans, function(current_orphan, orphan_loop) {
              // lookup the block data from the wallet
              lib.get_block(current_orphan.good_blockhash, function (good_block_data) {
                // check if the next block hash is known
                if (good_block_data.nextblockhash != null) {
                  // update the next blockhash for this orphan record
                  Orphans.updateOne({blockindex: current_orphan.blockindex, orphan_blockhash: current_orphan.orphan_blockhash}, {
                    next_blockhash: good_block_data.nextblockhash
                  }).then(() => {
                    setTimeout(function() {
                      // move to the next orphan record
                      orphan_loop();
                    }, timeout);
                  }).catch((err) => {
                    console.log(err);

                    setTimeout(function() {
                      // move to the next orphan record
                      orphan_loop();
                    }, timeout);
                  });
                } else {
                  setTimeout(function() {
                    // move to the next orphan record
                    orphan_loop();
                  }, timeout);
                }
              });
            }, function() {
              // update the orphan stats
              Stats.updateOne({coin: settings.coin.name}, {
                orphan_index: current_block - 1,
                orphan_current: (unresolved_forks.length == 0 ? 0 : unresolved_forks[0])
              }).then(() => {
                // finished fixing orphaned block data
                return cb();
              }).catch((err) => {
                console.log(err);
                return cb();
              });
            });
          }).catch((err) => {
            console.log(err);
            return cb();
          });
        }
      });
    }
  });
}

function get_earliest_orphan_block(orphan_index, orphan_current, last_blockindex, cb) {
  // check if it is necessary to search for orphan data
  if (orphan_index == null || orphan_index == 0) {
    console.log(`${settings.localization.finding_earliest_orphan}.. ${settings.localization.please_wait}..`);

    Tx.aggregate([
      { $match: {
        "vout": { $exists: true, $ne: [] }
      }},
      { $group: {
        _id: "$blockindex",
        blockhashes: { $addToSet: "$blockhash" }
      }},
      { $match: {
        "blockhashes.1": { "$exists": true }
      }},
      { $sort: {
        "_id": 1
      }},
      { $limit: 1 },
      { $project: {
        "_id": 1
      }}
    ]).option({ allowDiskUse: true }).then((data) => {
      if (data.length > 0) {
        // found the first unprocessed orphaned block
        orphan_current = data[0]._id;
        orphan_index = (orphan_current - 1);
        console.log('Found orphan block index: ' + orphan_current.toString());

        Stats.updateOne({coin: settings.coin.name}, {
          orphan_current: orphan_current,
          orphan_index: orphan_index
        }).then(() => {
          return cb({orphan_index: orphan_index, orphan_current: orphan_current}, null);
        });
      } else {
        // no unprocessed orphaned blocks found
        orphan_current = 0;
        orphan_index = last_blockindex;
        console.log('No orphaned blocks found');

        Stats.updateOne({coin: settings.coin.name}, {
          orphan_current: orphan_current,
          orphan_index: orphan_index
        }).then(() => {
          return cb({orphan_index: orphan_index, orphan_current: orphan_current}, null);
        });
      }
    }).catch((err) => {
      return cb(null, err);
    });
  } else
    return cb({orphan_index: orphan_index, orphan_current: orphan_current}, null);
}

function check_block_height_for_fork(block_height, cb) {
  // find all unique blockhashes in the txes collections for this block height
  Tx.aggregate([
    { $match: {
      $and: [
        {"blockindex": { $eq: block_height }},
        {"vout": { $exists: true, $ne: [] }}
      ]
    }},
    { $group: {
      _id: "$blockindex",
      blockhashes: { $addToSet: "$blockhash" }
    }}
  ]).then((data) => {
    if (data.length > 0) {
      // lookup the "good" block hash using the block height
      lib.get_blockhash(block_height, function(block_hash) {
        // check if there is more than 1 block hash
        if (data[0].blockhashes.length == 1) {
          // 1 block found
          // check if the found block is the good block
          if (data[0].blockhashes[0] == block_hash) {
            // no forks found
            return cb(null, null);
          } else {
            // add the good block to the list of blockhashes
            data[0].blockhashes.push(block_hash);

            // return the block hashes
            return cb(data[0].blockhashes, null);
          }
        } else {
          // more than 1 block found
          // check if the good block is already in the list
          if (data[0].blockhashes.indexOf(block_hash) == -1) {
            // add the good block to the list of blockhashes
            data[0].blockhashes.push(block_hash);
          }

          // return the block hashes
          return cb(data[0].blockhashes, null);
        }
      });
    } else {
      // no blocks found
      return cb(null, null);
    }
  }).catch((err) => {
    // an error was returned
    return cb(null, err);
  });
}

function create_orphan(blockindex, orphan_blockhash, good_blockhash, prev_blockhash, next_blockhash, cb) {
  var newOrphan = new Orphans({
    blockindex: blockindex,
    orphan_blockhash: orphan_blockhash,
    good_blockhash: good_blockhash,
    prev_blockhash: prev_blockhash,
    next_blockhash: next_blockhash
  });

  // create a new orphan record in the local database
  newOrphan.save().then(() => {
    // new orphan record saved successfully
    return cb();
  }).catch((err) => {
    // check if this is a duplicate key error which can be ignored
    if (!(err.toString().indexOf('E11000') > -1 || err.toString().indexOf('duplicate key error') > -1))
      console.log(err);

    return cb();
  });
}

function get_orphaned_txids(block_hash, cb) {
  // get all transactions by block hash
  Tx.find({blockhash: block_hash}).exec().then((txes) => {
    if (txes.length > 0) {
      // found at least one orphaned transaction
      var txids = [];

      // populate an array of txids without the object data
      for (t = 0; t < txes.length; t++)
        txids.push(txes[t].txid);

      return cb(txids, null);
    } else {
      // no txes found
      return cb(null, null);
    }
  }).catch((err) => {
    // an error was returned
    return cb(null, err);
  });
}

function check_add_tx(txid, blockhash, tx_count, cb) {
  // lookup the transaction to ensure it doesn't belong to another block
  lib.get_rawtransaction(txid, function(tx) {
    // check if this txid belongs to the main blockchain
    if (tx && tx.txid && tx.blockhash != blockhash && tx.confirmations > 0) {
      // lookup the correct block index in case it is not the same as the current block
      lib.get_block(tx.blockhash, function(block) {
        // check if the block was found
        if (block) {
          // save the tx to the local database
          blkSync.save_tx(txid, block.height, block, function(save_tx_err, tx_has_vout, newTx) {
            // check for errors
            if (save_tx_err) {
              // check the error code
              if (save_tx_err.code == 'StackSizeError') {
                // ensure the process halts after stopping all sync threads
                blkSync.setStackSizeErrorId(txid);
              } else
                console.log(save_tx_err);

              return cb(tx_count);
            } else {
              // save the tx
              newTx.save().then(() => {
                console.log('%s: %s', block.height, txid);

                // check if the tx has vouts
                if (tx_has_vout) {
                  // keep a running total of txes that were added
                  tx_count++;
                }

                return cb(tx_count);
              }).catch((err) => {
                console.log(err);
                return cb(tx_count);
              });
            }
          });
        } else {
          // block not found so there is nothing to fix
          return cb(tx_count);
        }
      });
    } else {
      // block does not belong to main blockchain so there is nothing to fix
      return cb(tx_count);
    }
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

function get_market_price(market_array) {
  // check how the market price should be updated
  if (settings.markets_page.market_price == 'COINGECKO') {
    // find the coingecko id
    find_coingecko_id(settings.coin.symbol, function(coingecko_id) {
      // check if the coingecko_id was found
      if (coingecko_id != null && coingecko_id != '') {
        const coingecko = require('../lib/apis/coingecko');
        const currency = lib.get_market_currency_code();

        console.log(`${settings.localization.calculating_market_price}.. ${settings.localization.please_wait}..`);

        // get the market price from coingecko api
        coingecko.get_market_prices(coingecko_id, currency, settings.markets_page.coingecko_api_key, function (err, last_price, last_usd_price) {
          // check for errors
          if (err == null) {
            // get current stats
            Stats.findOne({coin: settings.coin.name}).then((stats) => {
              // update market stat prices
              Stats.updateOne({coin: settings.coin.name}, {
                last_price: (last_price == null ? 0 : last_price),
                last_usd_price: (last_usd_price == null ? 0 : last_usd_price)
              }).then(() => {
                // market prices updated successfully
                finish_market_sync();
              }).catch((err) => {
                // error saving stats
                console.log(err);
                exit(1);
              });
            }).catch((err) => {
              // error getting stats
              console.log(err);
              exit(1);
            });
          } else {
            // coingecko api returned an error
            console.log(`${settings.localization.ex_error}: ${err}`);
            exit(1);
          }
        });
      } else {
        // coingecko_id is not set which should have already thrown an error, so just exit
        exit(1);
      }
    });
  } else {
    console.log(`${settings.localization.calculating_market_price}.. ${settings.localization.please_wait}..`);

    // get the list of coins from coingecko
    coingecko_coin_list_api(market_array, function (coin_err, coin_list) {
      // check for errors
      if (coin_err == null) {
        let api_ids = '';

        // loop through all unique currencies in the market_array
        for (let m = 0; m < market_array.length; m++) {
          const index = coin_list.findIndex(p => p.symbol.toLowerCase() == market_array[m].currency.toLowerCase());

          // check if the market currency is found in the coin list
          if (index > -1) {
            // add to the list of api_ids
            api_ids += (api_ids == '' ? '' : ',') + coin_list[index].id;

            // add the coingecko id back to the market_array
            market_array[m].coingecko_id = coin_list[index].id;
          } else {
            // coin symbol not found in the api
            console.log('Error: Cannot find symbol "' + market_array[m].currency + '" in the coingecko api');
          }
        }

        // check if any api_ids were found
        if (api_ids != '') {
          const coingecko = require('../lib/apis/coingecko');
          const currency = lib.get_market_currency_code();

          // get the market price from coingecko api
          coingecko.get_avg_market_prices(api_ids, currency, market_array, settings.markets_page.coingecko_api_key, function (mkt_err, last_price, last_usd) {   
            // check for errors
            if (mkt_err == null) {
              // update the last usd price
              Stats.updateOne({coin: settings.coin.name}, {
                last_price: last_price,
                last_usd_price: last_usd
              }).then(() => {
                // market price updated successfully
                finish_market_sync();
              }).catch((err) => {
                // error saving stat data
                console.log(err);
                exit(1);
              });
            } else {
              // coingecko api returned an error
              console.log(`Error: ${mkt_err}`);
              exit(1);
            }
          });
        } else {
          // no api_ids found so cannot continue to getting the usd price and error msgs were already thrown, so just exit
          exit(1);
        }
      } else {
        // coingecko api returned an error
        console.log(`Error: ${coin_err}`);
        exit(1);
      }
    });
  }
}

function finish_market_sync() {
  // update markets_last_updated value
  db.update_last_updated_stats(settings.coin.name, { markets_last_updated: Math.floor(new Date() / 1000) }, function() {
    // check if the script stopped prematurely
    if (stopSync) {
      console.log('Market sync was stopped prematurely');
      exit(1);
    } else {
      console.log('Market sync complete');
      exit(0);
    }
  });
}

function coingecko_coin_list_api(market_symbols, cb) {
  let coin_array = [];
  let call_coin_list_api = false;

  // check if market_symbols is an array
  if (!Array.isArray(market_symbols)) {
    // add this symbol to an array
    market_symbols = [{currency: market_symbols}];
  }

  // loop through all symbols
  for (var symbol of market_symbols) {
    // check if this symbol has a default coingecko id in the settings
    const index = settings.default_coingecko_ids.findIndex(p => p.symbol.toLowerCase() == symbol.currency.toLowerCase());

    // check if the coin symbol is found in settings
    if (index > -1) {
      // add this symbol and id to a new array
      coin_array.push({
        id: settings.default_coingecko_ids[index].id.toLowerCase(),
        symbol: symbol.currency.toLowerCase()
      });
    } else {
      // missing at least 1 symbol, so the coingecko api must be called
      call_coin_list_api = true;
      break;
    }
  }

  // check if the coin list api needs to be called
  if (call_coin_list_api) {
    const coingecko = require('../lib/apis/coingecko');

    // get the list of coins from coingecko
    coingecko.get_coin_data(settings.markets_page.coingecko_api_key, function (err, coin_list) {
      // check if there was an error
      if (err == null) {
          // initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
          const rateLimitLib = require('../lib/ratelimit');
          const rateLimit = new rateLimitLib.RateLimit(1, 2000, false);

          // automatically pause for 2 seconds in between requests
          rateLimit.schedule(function() {
            return cb(err, coin_list);
          });
      } else {
        return cb(err, coin_list);
      }
    });
  } else {
    // return the custom array of known symbols and ids
    return cb(null, coin_array);
  }
}

function find_coingecko_id(symbol, cb) {
  coingecko_coin_list_api(symbol, function (err, coin_list) {
    // check for errors
    if (err == null) {
      // find the index of the first coin symbol match
      const index = coin_list.findIndex(p => p.symbol.toLowerCase() == symbol.toLowerCase());

      // check if the coin symbol is found in the api coin list
      if (index > -1)
        return cb(coin_list[index].id);
      else {
        // coin symbol not found in the api
        console.log('Error: Cannot find symbol "' + symbol + '" in the coingecko api');
        return cb('');
      }
    } else {
      // failed to get the coingecko api list
      console.log(`Error: ${err}`);
      return cb('');
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

function block_sync(reindex, stats) {
  // get the last synced block index value
  let last = (stats.last ? stats.last : 0);

  // get the total number of blocks
  let count = (stats.count ? stats.count : 0);

  // Check if the sync msg should be shown
  check_show_sync_message(count - last);

  blkSync.update_tx_db(settings.coin.name, last, count, stats.txes, settings.sync.update_timeout, 0, function() {
    // check if the script stopped prematurely
    if (stopSync) {
      console.log(`${(reindex ? 'Reindex' : 'Block sync')} was stopped prematurely`);
      exit(1);
    } else {
      // update blockchain_last_updated value
      db.update_last_updated_stats(settings.coin.name, { blockchain_last_updated: Math.floor(new Date() / 1000) }, function(cb) {
        // fix data from orphaned blocks
        update_orphans(stats.orphan_index, stats.orphan_current, count, settings.sync.update_timeout, function() {
          // check if the script stopped prematurely
          if (stopSync) {
            console.log(`${(reindex ? 'Reindex' : 'Block sync')} was stopped prematurely`);
            exit(1);
          } else {
            db.update_richlist('received', function() {
              db.update_richlist('balance', function() {
                // update richlist_last_updated value
                db.update_last_updated_stats(settings.coin.name, { richlist_last_updated: Math.floor(new Date() / 1000) }, function(cb) {                              
                  db.get_stats(settings.coin.name, function(nstats) {
                    // check for and update heavycoin data if applicable
                    update_heavy(settings.coin.name, count, 20, settings.blockchain_specific.heavycoin.enabled, function(heavy) {
                      // check for and update network history data if applicable
                      update_network_history(nstats.last, settings.network_history.enabled, function(network_hist) {
                        // always check for and remove the sync msg if exists
                        db.remove_sync_message();

                        console.log(`${(reindex ? 'Reindex' : 'Block sync')} complete (block: %s)`, nstats.last);
                        exit(0);
                      });
                    });
                  });
                });
              });
            });
          }
        });
      });
    }
  });
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
    console.log(`${settings.localization.script_launched }: ${process.pid}`);

    if (mode == 'update') {
      switch (database) {
        case 'index':
          console.log(`${settings.localization.syncing_blocks}.. ${settings.localization.please_wait}..`);
          break;
        case 'peers':
          console.log(`${settings.localization.syncing_peers}.. ${settings.localization.please_wait}..`);
          break;
        case 'masternodes':
          console.log(`${settings.localization.syncing_masternodes}.. ${settings.localization.please_wait}..`);
          break;
        default: // markets
          console.log(`${settings.localization.syncing_markets}.. ${settings.localization.please_wait}..`);
          break;
      }
    }

    var dbString = 'mongodb://' + encodeURIComponent(settings.dbsettings.user);
    dbString = dbString + ':' + encodeURIComponent(settings.dbsettings.password);
    dbString = dbString + '@' + settings.dbsettings.address;
    dbString = dbString + ':' + settings.dbsettings.port;
    dbString = dbString + '/' + settings.dbsettings.database;

    mongoose.set('strictQuery', true);

    mongoose.connect(dbString).then(() => {
      if (database == 'index') {
        db.check_stats(settings.coin.name, function(exists) {
          if (exists == false) {
            console.log('Run \'npm start\' to create database structures before running this script.');
            exit(1);
          } else {
            // determine which index mode to run
            if (mode == 'reindex') {
              const { execSync } = require('child_process');

              try {
                // delete the database
                execSync(`node ./scripts/delete_database.js ${mode}`, {stdio : 'inherit'});
              } catch (err) {
                // delete_database.js was not successful, so exit
                exit(1);
              }

              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
                  // start the block sync
                  block_sync(true, stats);
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            } else if (mode == 'check') {
              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
                  console.log(`${settings.localization.checking_blocks}.. ${settings.localization.please_wait}..`);

                  blkSync.update_tx_db(settings.coin.name, block_start, stats.count, stats.txes, settings.sync.check_timeout, 1, function() {
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
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            } else if (mode == 'update') {
              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
                  // start the block sync
                  block_sync(false, stats);
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            } else if (mode == 'reindex-rich') {
              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
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
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            } else if (mode == 'reindex-txcount') {
              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
                  console.log(`${settings.localization.calculating_tx_count}.. ${settings.localization.please_wait}..`);

                  // Resetting the transaction counter requires a single lookup on the txes collection to find all txes that have a positive or zero total and 1 or more vout
                  Tx.find({'total': {$gte: 0}, 'vout': { $gte: { $size: 1 }}}).countDocuments().then((count) => {
                    console.log('Found tx count: ' + count.toString());
                    Stats.updateOne({coin: settings.coin.name}, {
                      txes: count
                    }).then(() => {
                      console.log('Tx count update complete');
                      exit(0);
                    }).catch((err) => {
                      console.log(err);
                      exit(1);
                    });
                  }).catch((err) => {
                    console.log(err);
                    exit(1);
                  });
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            } else if (mode == 'reindex-last') {
              db.update_db(settings.coin.name, function(stats) {
                // check if stats returned properly
                if (stats !== false) {
                  console.log(`${settings.localization.finding_last_blockindex}.. ${settings.localization.please_wait}..`);

                  // Resetting the last blockindex counter requires a single lookup on the txes collection to find the last indexed blockindex
                  Tx.find({}, {blockindex:1, _id:0}).sort({blockindex: -1}).limit(1).exec().then((tx) => {
                    // check if any blocks exists
                    if (tx == null || tx.length == 0) {
                      console.log('No blocks found. setting last blockindex to 0.');

                      Stats.updateOne({coin: settings.coin.name}, {
                        last: 0
                      }).then(() => {
                        console.log('Last blockindex update complete');
                        exit(0);
                      }).catch((err) => {
                        console.log(err);
                        exit(1);
                      });
                    } else {
                      console.log('Found last blockindex: ' + tx[0].blockindex.toString());

                      Stats.updateOne({coin: settings.coin.name}, {
                        last: tx[0].blockindex
                      }).then(() => {
                        console.log('Last blockindex update complete');
                        exit(0);
                      }).catch((err) => {
                        console.log(err);
                        exit(1);
                      });
                    }
                  }).catch((err) => {
                    console.log(err);
                    exit(1);
                  });
                } else {
                  // update_db threw an error so exit
                  exit(1);
                }
              });
            }
          }
        });
      } else if (database == 'peers') {
        lib.get_peerinfo(function(body) {
          if (body != null) {
            async.timesSeries(body.length, function(i, loop) {
              let address = body[i].addr;
              let port = null;

              if (occurrences(address, ':') == 1 || occurrences(address, ']:') == 1) {
                // separate the port # from the IP address
                address = address.substring(0, address.lastIndexOf(':')).replace('[', '').replace(']', '');
                port = body[i].addr.substring(body[i].addr.lastIndexOf(':') + 1);
              }

              if (address.indexOf(']') > -1) {
                // remove [] characters from IPv6 addresses
                address = address.replace('[', '').replace(']', '');
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
                      console.log('Updated peer %s%s [%s/%s]', address, (port == null || port == '' ? '' : ':' + port.toString()), (i + 1).toString(), body.length.toString());

                      // check if the script is stopping
                      if (stopSync) {
                        // stop the loop
                        loop({});
                      } else {
                        // move to next peer
                        loop();
                      }
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
                          console.log('Added new peer %s%s [%s/%s]', address, (port == null || port == '' ? '' : ':' + port.toString()), (i + 1).toString(), body.length.toString());

                          // check if the script is stopping
                          if (stopSync) {
                            // stop the loop
                            loop({});
                          } else {
                            // move to next peer
                            loop();
                          }
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
            let isObject = false;
            let objectKeys = null;

            // check if the masternode data is an array or an object
            if (body.length == null) {
              // process data as an object
              objectKeys = Object.keys(body);
              isObject = true;
            }

            async.timesSeries((isObject ? objectKeys : body).length, function(i, loop) {
              db.save_masternode((isObject ? body[objectKeys[i]] : body[i]), (isObject ? objectKeys[i] : null), function(success) {
                if (success) {
                  // check if the script is stopping
                  if (stopSync) {
                    // stop the loop
                    loop({});
                  } else {
                    // move to next masternode
                    loop();
                  }
                } else {
                  console.log('Error: Cannot save masternode %s.', (isObject ? (body[objectKeys[i]].payee ? body[objectKeys[i]].payee : 'UNKNOWN') : (body[i].addr ? body[i].addr : 'UNKNOWN')));
                  exit(1);
                }
              });
            }, function() {
              db.remove_old_masternodes(function() {
                db.update_last_updated_stats(settings.coin.name, { masternodes_last_updated: Math.floor(new Date() / 1000) }, function(update_success) {
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
        // start market sync
        // check if market feature is enabled or the market_price option is set to COINGECKO
        if (settings.markets_page.enabled == true || settings.markets_page.market_price == 'COINGECKO') {
          var total_pairs = 0;
          var exchanges = Object.keys(settings.markets_page.exchanges);

          // loop through all exchanges to determine how many trading pairs must be updated
          exchanges.forEach(function(key, index, map) {
            // check if market is enabled via settings
            if (settings.markets_page.enabled == true && settings.markets_page.exchanges[key].enabled == true) {
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
            let market_array = [];

            // initialize the rate limiter to wait 2 seconds between requests to prevent abusing external apis
            var rateLimitLib = require('../lib/ratelimit');
            var rateLimit = new rateLimitLib.RateLimit(1, 2000, false);
            var complete = 0;

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
                            db.update_markets_db(key, split_pair[0], split_pair[1], function(err, last_price) {
                              if (!err) {
                                console.log('%s[%s]: Market data updated successfully', key, pair_key);

                                // only add to the market_array if market data is being averaged
                                if (settings.markets_page.market_price == 'AVERAGE') {
                                  // check if the currency already exists in the market array
                                  const index = market_array.findIndex(item => item.currency.toUpperCase() == split_pair[1].toUpperCase());

                                  if (index != -1) {
                                    // update the last_price
                                    market_array[index].last_price = (market_array[index].last_price + last_price) / 2;
                                  } else {
                                    // add new object to the array
                                    market_array.push({currency: split_pair[1], last_price: last_price});
                                  }
                                }
                              } else
                                console.log('%s[%s] Error: %s', key, pair_key, err);

                              complete++;

                              if (complete == total_pairs || stopSync)
                                get_market_price(market_array);
                            });
                          });
                        } else {
                          console.log('%s[%s] Error: Market not found in local database. Please restart the explorer', key, pair_key);
                          complete++;

                          if (complete == total_pairs || stopSync)
                            get_market_price(market_array);
                        }
                      });
                    } else {
                      // market pair not formatted correctly
                      console.log('%s market pair is invalid', pair_key);
                      complete++;

                      if (complete == total_pairs || stopSync)
                        get_market_price(market_array);
                    }
                  });
                } else {
                  // market not installed
                  console.log('%s market not installed', key);
                  complete++;

                  if (complete == total_pairs || stopSync)
                    get_market_price(market_array);
                }
              }
            });
          } else if (settings.markets_page.market_price == 'COINGECKO')
            get_market_price([]);
          else {
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
    }).catch((err) => {
      console.log('Error: Unable to connect to database: %s', err);
      exit(1);
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