var mongoose = require('mongoose'),
    lib = require('../lib/explorer'),
    db = require('../lib/database'),
    Tx = require('../models/tx'),
    Address = require('../models/address'),
    AddressTx = require('../models/addresstx'),
    Orphans = require('../models/orphans'),
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

// updates tx & address balances
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
    if (check_only == 0 && block_height % settings.sync.save_stats_after_sync_blocks === 0) {
      Stats.updateOne({coin: coin}, {
        last: block_height - 1,
        txes: txes
      }).then(() => {});
    } else if (check_only == 1) {
      console.log('Checking block ' + block_height + '...');
    }

    lib.get_blockhash(block_height, function(blockhash) {
      if (blockhash) {
        lib.get_block(blockhash, function(block) {
          if (block) {
            async.eachLimit(block.tx, task_limit_txs, function(txid, next_tx) {
              Tx.findOne({txid: txid}).then((tx) => {
                if (tx && check_only != 2) {
                  setTimeout(function() {
                    tx = null;

                    // check if the script is stopping
                    if (stopSync && check_only != 2) {
                      // stop the loop
                      next_tx({});
                    } else
                      next_tx();
                  }, timeout);
                } else {
                  // check if the transaction exists but doesn't match the current block height
                  check_delete_tx(tx, block_height, txes, timeout, function(updated_txes, tx_deleted) {
                    // update the running tx count
                    txes = updated_txes;

                    // check if this tx should be added to the local database
                    if (tx_deleted || !tx) {
                      // save the transaction to local database
                      db.save_tx(txid, block_height, function(err, tx_has_vout) {
                        if (err)
                          console.log(err);
                        else
                          console.log('%s: %s', block_height, txid);

                        if (tx_has_vout)
                          txes++;

                        setTimeout(function() {
                          tx = null;

                          // check if the script is stopping
                          if (stopSync && check_only != 2) {
                            // stop the loop
                            next_tx({});
                          } else
                            next_tx();
                        }, timeout);
                      });
                    } else {
                      // skip adding the current tx
                      setTimeout(function() {
                        tx = null;

                        // check if the script is stopping
                        if (stopSync && check_only != 2) {
                          // stop the loop
                          next_tx({});
                        } else
                          next_tx();
                      }, timeout);
                    }
                  });
                }
              }).catch((err) => {
                console.log(err);

                setTimeout(function() {
                  tx = null;

                  // check if the script is stopping
                  if (stopSync && check_only != 2) {
                    // stop the loop
                    next_tx({});
                  } else
                    next_tx();
                }, timeout);
              });
            }, function() {
              setTimeout(function() {
                blockhash = null;
                block = null;

                // check if the script is stopping
                if (stopSync && check_only != 2) {
                  // stop the loop
                  next_block({});
                } else
                  next_block();
              }, timeout);
            });
          } else {
            console.log('Block not found: %s', blockhash);

            setTimeout(function() {
              // check if the script is stopping
              if (stopSync && check_only != 2) {
                // stop the loop
                next_block({});
              } else
                next_block();
            }, timeout);
          }
        });
      } else {
        setTimeout(function() {
          // check if the script is stopping
          if (stopSync && check_only != 2) {
            // stop the loop
            next_block({});
          } else
            next_block();
        }, timeout);
      }
    });
  }, function() {
    var statUpdateObject = {};

    // check what stats data should be updated
    if (stopSync || check_only == 2) {
      // only update txes when fixing invalid and missing blocks or when a "normal" sync was stopped prematurely
      statUpdateObject.txes = txes;
    } else {
      // update last and txes values for "normal" sync that finishes without being stopped prematurely
      statUpdateObject = {
        txes: txes,
        last: end
      };
    }

    // update local stats
    Stats.updateOne({coin: coin}, statUpdateObject).then(() => {
      return cb(txes);
    }).catch((err) => {
      console.log(err);
      return cb(txes);
    });
  });
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
                  var tx_count = 0;

                  // check if the good block hash is in the list of blockhashes
                  if (blockhashes.indexOf(correct_block_data.prev_hash) > -1) {
                    // remove the good block hash
                    blockhashes.splice(blockhashes.indexOf(correct_block_data.prev_hash), 1);
                  }

                  // loop through the remaining orphaned block hashes
                  lib.syncLoop(blockhashes.length, function(block_loop) {
                    var i = block_loop.iteration();

                    console.log('Resolving orphaned block [' + (i + 1).toString() + '/' + blockhashes.length.toString() + ']: ' + blockhashes[i]);

                    // find all orphaned txid's from the current orphan block hash
                    get_orphaned_txids(blockhashes[i], function(txids) {
                      // save the orphan block data to the orphan collection
                      create_orphan(current_block, blockhashes[i], correct_block_data.prev_hash, block_data.previousblockhash, correct_block_data.next_hash, function() {
                        // loop through the remaining orphaned block hashes
                        lib.syncLoop(txids.length, function(tx_loop) {
                          var t = tx_loop.iteration();

                          // remove the orphaned tx and cleanup all associated data
                          delete_and_cleanup_tx(txids[t], current_block, tx_count, timeout, function(updated_tx_count) {
                            // update the running tx count
                            tx_count = updated_tx_count;

                            // some blockchains will reuse the same orphaned transaction ids
                            // lookup the transaction that was just deleted to ensure it doesn't belong to another block
                            check_add_tx(txids[t], blockhashes[i], tx_count, function(updated_tx_count2) {
                              // update the running tx count
                              tx_count = updated_tx_count2;

                              setTimeout(function() {
                                // move to the next tx record
                                tx_loop.next();
                              }, timeout);
                            });
                          });
                        }, function() {
                          setTimeout(function() {
                            // move to the next block record
                            block_loop.next();
                          }, timeout);
                        });
                      });
                    });
                  }, function() {
                    // get the most recent stats
                    Stats.findOne({coin: settings.coin.name}).then((stats) => {
                      // add missing txes for the current block
                      update_tx_db(settings.coin.name, current_block, current_block, (stats.txes + tx_count), timeout, 2, function(updated_tx_count) {
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
          // display the msg
          console.log(err);

          // stop fixing orphaned block data
          return cb();
        } else {
          // check if the script is stopping
          if (!stopSync)
            console.log('Finished looking for forks');

          // get the list of orphans with a null next_blockhash
          Orphans.find({next_blockhash: null}).exec().then((orphans) => {
            // loop through the list of orphans
            lib.syncLoop(orphans.length, function(orphan_loop) {
              var o = orphan_loop.iteration();

              // lookup the block data from the wallet
              lib.get_block(orphans[o].good_blockhash, function (good_block_data) {
                // check if the next block hash is known
                if (good_block_data.nextblockhash != null) {
                  // update the next blockhash for this orphan record
                  Orphans.updateOne({blockindex: orphans[o].blockindex, orphan_blockhash: orphans[o].orphan_blockhash}, {
                    next_blockhash: good_block_data.nextblockhash
                  }).then(() => {
                    setTimeout(function() {
                      // move to the next orphan record
                      orphan_loop.next();
                    }, timeout);
                  }).catch((err) => {
                    console.log(err);

                    setTimeout(function() {
                      // move to the next orphan record
                      orphan_loop.next();
                    }, timeout);
                  });
                } else {
                  setTimeout(function() {
                    // move to the next orphan record
                    orphan_loop.next();
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
    console.log('Finding the earliest orphaned blockindex.. Please wait..');

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
          db.save_tx(txid, block.height, function(save_tx_err, tx_has_vout) {
            // check if there were any save errors
            if (save_tx_err)
              console.log(save_tx_err);
            else
              console.log('%s: %s', block.height, txid);

            // check if the tx was saved correctly
            if (tx_has_vout) {
              // keep a running total of txes that were added
              tx_count++;
            }

            return cb(tx_count);
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

function delete_and_cleanup_tx(txid, block_height, tx_count, timeout, cb) {
  // lookup all address tx records associated with the current tx
  AddressTx.find({txid: txid}).exec().then((address_txes) => {
    if (address_txes.length == 0) {
      // no vouts for this tx, so just delete the tx without cleaning up addresses
      delete_tx(txid, block_height, function(tx_err, tx_result) {
        if (tx_err) {
          console.log(tx_err);
          return cb(tx_count);
        } else {
          // NOTE: do not subtract from the tx_count here because only txes with vouts are counted
          return cb(tx_count);
        }
      });
    } else {
      // lookup the current tx in the local database
      Tx.findOne({txid: txid}).then((tx) => {
        var addressTxArray = [];
        var has_vouts = (tx.vout != null && tx.vout.length > 0);

        // check if this is a coinbase tx
        if (tx.vin == null || tx.vin.length == 0) {
          // add a coinbase tx into the addressTxArray array
          addressTxArray.push({
            txid: txid,
            a_id: 'coinbase',
            amount: tx.total
          });
        }

        // check if there are any vin addresses
        if (tx.vin != null && tx.vin.length > 0) {
          // loop through the vin data
          for (var vin_tx_counter = tx.vin.length - 1; vin_tx_counter >= 0; vin_tx_counter--) {
            // loop through the addresstxe data
            for (var vin_addresstx_counter = address_txes.length - 1; vin_addresstx_counter >= 0; vin_addresstx_counter--) {
              // check if there is a tx record that exactly matches to the addresstx
              if (tx.vin[vin_tx_counter].addresses == address_txes[vin_addresstx_counter].a_id && tx.vin[vin_tx_counter].amount == -address_txes[vin_addresstx_counter].amount) {
                // add the address into the addressTxArray array
                addressTxArray.push({
                  txid: txid,
                  a_id: tx.vin[vin_tx_counter].addresses,
                  amount: address_txes[vin_addresstx_counter].amount
                });

                // remove the found records from both arrays
                tx.vin.splice(vin_tx_counter, 1);
                address_txes.splice(vin_addresstx_counter, 1);

                break;
              }
            }
          }
        }

        // check if there are any vout addresses
        if (tx.vout != null && tx.vout.length > 0) {
          // loop through the vout data
          for (var vout_tx_counter = tx.vout.length - 1; vout_tx_counter >= 0; vout_tx_counter--) {
            // loop through the addresstxe data
            for (var vout_addresstx_counter = address_txes.length - 1; vout_addresstx_counter >= 0; vout_addresstx_counter--) {
              // check if there is a tx record that exactly matches to the addresstx
              if (tx.vout[vout_tx_counter].addresses == address_txes[vout_addresstx_counter].a_id && tx.vout[vout_tx_counter].amount == address_txes[vout_addresstx_counter].amount) {
                // add the address into the addressTxArray array
                addressTxArray.push({
                  txid: txid,
                  a_id: tx.vout[vout_tx_counter].addresses,
                  amount: address_txes[vout_addresstx_counter].amount
                });

                // remove the found records from both arrays
                tx.vout.splice(vout_tx_counter, 1);
                address_txes.splice(vout_addresstx_counter, 1);

                break;
              }
            }
          }
        }

        // check if there are still more vin/vout records to process
        if (tx.vin.length > 0 || tx.vout.length > 0 || address_txes.length > 0) {
          // get all unique remaining addresses
          var address_list = [];

          // get unique addresses from the tx vin
          tx.vin.forEach(function(vin) {
            if (address_list.indexOf(vin.addresses) == -1)
              address_list.push(vin.addresses);
          });

          // get unique addresses from the tx vout
          tx.vout.forEach(function(vout) {
            if (address_list.indexOf(vout.addresses) == -1)
              address_list.push(vout.addresses);
          });

          // get unique addresses from the addresstxes
          address_txes.forEach(function(address_tx) {
            if (address_list.indexOf(address_tx.a_id) == -1)
              address_list.push(address_tx.a_id);
          });

          // loop through each unique address
          address_list.forEach(function(address) {
            var vin_total = 0;
            var vout_total = 0;
            var address_tx_total = 0;

            // add up all the vin amounts for this address
            tx.vin.forEach(function(vin) {
              // check if this is the correct address
              if (vin.addresses == address)
                vin_total += vin.amount;
            });

            // add up all the vout amounts for this address
            tx.vout.forEach(function(vout) {
              // check if this is the correct address
              if (vout.addresses == address)
                vout_total += vout.amount;
            });

            // add up all the addresstx amounts for this address
            address_txes.forEach(function(address_tx) {
              // check if this is the correct address
              if (address_tx.a_id == address)
                address_tx_total += address_tx.amount;
            });

            // check if the tx and addresstx totals match
            if ((vout_total - vin_total) == address_tx_total) {
              // the values match (this indicates that this address sent coins to themselves)
              // add a vin record for this address into the addressTxArray array
              addressTxArray.push({
                txid: txid,
                a_id: address,
                amount: -vin_total
              });

              // add a vout record for this address into the addressTxArray array
              addressTxArray.push({
                txid: txid,
                a_id: address,
                amount: vout_total
              });
            } else {
              // the values do not match (this indicates there was a problem saving the data)
              // output the data for this address as-is, using the addresstx values
              address_txes.forEach(function(address_tx) {
                // check if this is the correct address
                if (address_tx.a_id == address) {
                  // add a record for this address into the addressTxArray array
                  addressTxArray.push({
                    txid: txid,
                    a_id: address,
                    amount: address_tx.amount
                  });
                }
              });
            }
          });
        }

        // loop through the address txes
        lib.syncLoop(addressTxArray.length, function(address_loop) {
          var a = address_loop.iteration();

           // fix the balance, sent and received data for the current address
          fix_address_data(addressTxArray[a], function() {
            setTimeout(function() {
              // move to the next address record
              address_loop.next();
            }, timeout);
          });
        }, function() {
          // delete all AddressTx records from the local collection for this tx
          AddressTx.deleteMany({txid: txid}).then((address_tx_result) => {
            // delete the tx from the local database
            delete_tx(txid, block_height, function(tx_err, tx_result) {
              if (tx_err) {
                console.log(tx_err);
                return cb(tx_count);
              } else {
                // check if the deleted tx had vouts
                if (has_vouts) {
                  // keep a running total of txes that were removed
                  tx_count -= tx_result.deletedCount;
                }

                return cb(tx_count);
              }
            });
          }).catch((err) => {
            console.log(err);

            // delete the tx from the local database
            delete_tx(txid, block_height, function(tx_err, tx_result) {
              if (tx_err) {
                console.log(tx_err);
                return cb(tx_count);
              } else {
                // check if the deleted tx had vouts
                if (has_vouts) {
                  // keep a running total of txes that were removed
                  tx_count -= tx_result.deletedCount;
                }

                return cb(tx_count);
              }
            });
          });
        });
      }).catch((err) => {
        console.log(err);
        return cb(tx_count);
      });
    }
  }).catch((err) => {
    console.log(err);
    return cb(tx_count);
  });
}

function fix_address_data(address_data, cb) {
  var addr_inc = {};
  var amount = address_data.amount;

  // determine how to fix the address balances
  if (address_data.a_id == 'coinbase')
    addr_inc.sent = -amount;
  else if (amount < 0) {
    // vin
    addr_inc.sent = amount;
    addr_inc.balance = -amount;
  } else {
    // vout
    addr_inc.received = -amount;
    addr_inc.balance = -amount;
  }

  // reverse the amount from the running totals in the Address collection for the current address
  Address.findOneAndUpdate({a_id: address_data.a_id}, {
    $inc: addr_inc
  }, {
    upsert: false
  }).then((return_address) => {
    // finished fixing the address balance data 
    return cb();
  }).catch((err) => {
    console.log(err);
    return cb();
  });
}

function delete_tx(txid, block_height, cb) {
  // delete the tx from the local database
  Tx.deleteOne({txid: txid, blockindex: block_height}).then((tx_result) => {
    return cb(null, tx_result);
  }).catch((err) => {
    return cb(err, null);
  });
}

function check_delete_tx(tx, block_height, tx_count, timeout, cb) {
  // check if the tx object exists and does not match the current block height
  if (tx && tx.blockindex != block_height) {
    // the transaction exists but does not match the correct block height, therefore it should be deleted
    delete_and_cleanup_tx(tx.txid, tx.blockindex, tx_count, timeout, function(updated_tx_count) {
      // finished removing the transaction
      return cb(updated_tx_count, true);
    });
  } else {
    // tx dosn't exist or block heights match so nothing to do
    return cb(tx_count, false);
  }
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
  console.log('Calculating market price.. Please wait..');

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

function block_sync(reindex, stats) {
  // Get the last synced block index value
  var last = (stats.last ? stats.last : 0);
  // Get the total number of blocks
  var count = (stats.count ? stats.count : 0);

  // Check if the sync msg should be shown
  check_show_sync_message(count - last);

  update_tx_db(settings.coin.name, last, count, stats.txes, settings.sync.update_timeout, 0, function() {
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
    console.log("Script launched with pid: " + process.pid);

    if (mode == 'update')
      console.log(`Syncing ${(database == 'index' ? 'blocks' : database)}.. Please wait..`);

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
                  console.log('Checking blocks.. Please wait..');

                  update_tx_db(settings.coin.name, block_start, stats.count, stats.txes, settings.sync.check_timeout, 1, function() {
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
                  console.log('Calculating tx count.. Please wait..');

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
                  console.log('Finding last blockindex.. Please wait..');

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
                      console.log('Updated peer %s%s [%s/%s]', address, (port == null || port == '' ? '' : ':' + port.toString()), (i + 1).toString(), body.length.toString());

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
                          console.log('Added new peer %s%s [%s/%s]', address, (port == null || port == '' ? '' : ':' + port.toString()), (i + 1).toString(), body.length.toString());

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
                            db.update_markets_db(key, split_pair[0], split_pair[1], function(err) {
                              if (!err)
                                console.log('%s[%s]: Market data updated successfully', key, pair_key);
                              else
                                console.log('%s[%s] Error: %s', key, pair_key, err);

                              complete++;

                              if (complete == total_pairs || stopSync)
                                get_last_usd_price();
                            });
                          });
                        } else {
                          console.log('%s[%s] Error: Market not found in local database. Please restart the explorer', key, pair_key);
                          complete++;

                          if (complete == total_pairs || stopSync)
                            get_last_usd_price();
                        }
                      });
                    } else {
                      // market pair not formatted correctly
                      console.log('%s market pair is invalid', pair_key);
                      complete++;

                      if (complete == total_pairs || stopSync)
                        get_last_usd_price();
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