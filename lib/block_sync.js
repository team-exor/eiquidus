const Stats = require('../models/stats');
const Tx = require('../models/tx');
const Address = require('../models/address');
const AddressTx = require('../models/addresstx');
const lib = require('./explorer');
const settings = require('../lib/settings');
const async = require('async');
let stopSync = false;
let stackSizeErrorId = null;

function check_delete_tx(tx, block_height, timeout, cb) {
  // check if the tx object exists and does not match the current block height
  if (tx && tx.blockindex != block_height) {
    // the transaction exists but does not match the correct block height, therefore it should be deleted
    module.exports.delete_and_cleanup_tx(tx.txid, tx.blockindex, timeout, function(updated_tx_count) {
      // finished removing the transaction
      return cb(updated_tx_count, true);
    });
  } else {
    // tx dosn't exist or block heights match so nothing to do
    return cb(0, false);
  }
}

function delete_tx(txid, block_height, cb) {
  // delete the tx from the local database
  Tx.deleteOne({txid: txid, blockindex: block_height}).then((tx_result) => {
    return cb(null, tx_result);
  }).catch((err) => {
    return cb(err, null);
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

function hex_to_ascii(hex) {
  let str = '';

  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));

  return str;
}

function update_addresses(addresses, blockheight, txid, cb) {
  const bulkAddresses = addresses.map((address) => {
    return {
      updateOne: {
        filter: { a_id: address.hash },
        update: {
          $setOnInsert: { a_id: address.hash },
          $inc: { sent: address.sent, balance: address.balance, received: address.received },
        },
        upsert: true
      }
    };
  });

  const bulkAddressTxes = addresses
    .filter((address) => address.hash !== 'coinbase')
    .map((address) => {
      return {
        updateOne: {
          filter: { a_id: address.hash, txid: txid },
          update: {
            $setOnInsert: { a_id: address.hash, blockindex: blockheight, txid: txid },
            $inc: { amount: (address.type == 'vin' ? -address.amount : address.amount) }
          },
          upsert: true
        }
      };
    });

  try {
    let completed = 0;
    let errorCalled = false;

    // callback to run when one of the 2 table writes is complete
    function onDone(err) {
      // check if the previous process already returned an error
      if (errorCalled) {
        // stop if there was already an error
        return;
      } else {
        // check if there was an error
        if (err) {
          // ensure the next data set knows there was already an error
          errorCalled = true;

          // return the error
          return cb(err);
        }

        // increment the completed counter
        completed += 1;

        // check if both data sets completed
        if (completed === 2) {
          // finished updating address data
          return cb();
        }
      }
    }

    // start processing both sets of data in parallel
    processInBatches(Address, bulkAddresses, onDone);
    processInBatches(AddressTx, bulkAddressTxes, onDone);
  } catch (err) {
    return cb(err);
  }
}

function processInBatches(collection, data, cb) {
  const batch_size = settings.sync.batch_size;
  let index = 0;

  function processNextBatch() {
    // check if all records were saved
    if (index >= data.length) {
      // all records were saved
      return cb();
    }

    // get the next batch of data
    const batch = data.slice(index, index + batch_size);

    // increment the index by the batch size
    index += batch_size;

    try {
      // asynchronously write data to the collection database
      collection.bulkWrite(batch, { ordered: false, writeConcern: { w: (settings.sync.wait_for_bulk_database_save ? 1 : 0) } }).then((result) => {
        // process the next batch of records
        processNextBatch();
      }).catch((err) => {
        console.log(err);

        // process the next batch of records
        processNextBatch();
      });
    } catch(err) {
      console.log(err);

      // process the next batch of records
      processNextBatch();
    }
  }

  // start processing records
  processNextBatch();
}

function finalize_update_tx_db(coin, check_only, end, txes, cb) {
  let statUpdateObject = {};

  // check what stats data should be updated
  if (stopSync || stackSizeErrorId || check_only == 2) {
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
    return cb();
  }).catch((err) => {
    console.log(err);
    return cb();
  });
}

module.exports = {
  save_tx: function(txid, blockheight, block, cb) {
    try {
      lib.get_rawtransaction(txid, function(tx) {
        if (tx && tx != `${settings.localization.ex_error}: ${settings.localization.check_console}`) {
          lib.prepare_vin(tx, function(vin, tx_type_vin) {
            lib.prepare_vout(tx.vout, txid, vin, ((!settings.blockchain_specific.zksnarks.enabled || typeof tx.vjoinsplit === 'undefined' || tx.vjoinsplit == null) ? [] : tx.vjoinsplit), function(vout, nvin, tx_type_vout) {
              // check if vout is null which indicates an error
              if (vout != null) {
                let addressBatch = [];

                // add all vin addresses to the batch array
                nvin.forEach(function(input) {
                  // check if address is inside an array
                  if (Array.isArray(input.addresses)) {
                    // extract the address
                    input.addresses = input.addresses[0];
                  }

                  // check if a vin address exists
                  if (input.addresses) {
                    const index = lib.is_unique(addressBatch, input.addresses, 'hash');
                    let sent = 0;
                    let balance = 0;

                    if (input.addresses == 'coinbase')
                      sent = input.amount;
                    else {
                      sent = input.amount;
                      balance = -input.amount;
                    }

                    // check if the address already exists in the array
                    if (index == -1) {
                      // unique address
                      addressBatch.push({
                        hash: input.addresses,
                        amount: input.amount,
                        type: 'vin',
                        sent: sent,
                        balance: balance,
                        received: 0
                      });
                    } else {
                      // address already exists
                      addressBatch[index].amount += input.amount;
                      addressBatch[index].sent += sent;
                      addressBatch[index].balance += balance;
                    }
                  }
                });

                // add all vout addresses to the batch array
                vout.forEach(function(output) {
                  // check if address is inside an array
                  if (Array.isArray(output.addresses)) {
                    // extract the address
                    output.addresses = output.addresses[0];
                  }

                  // check if a vout address exists
                  if (output.addresses) {
                    const index = lib.is_unique(addressBatch, output.addresses, 'hash');
                    const balance = output.amount;
                    const received = output.amount;

                    // check if the address already exists in the array
                    if (index == -1) {
                      // unique address
                      addressBatch.push({
                        hash: output.addresses,
                        amount: output.amount,
                        type: 'vout',
                        sent: 0,
                        balance: balance,
                        received: received
                      });
                    } else {
                      // address already exists
                      addressBatch[index].amount -= output.amount;
                      addressBatch[index].balance += balance;
                      addressBatch[index].received += received;
                    }
                  }
                });

                // save the addresses to the database
                update_addresses(addressBatch, blockheight, txid, function(err) {
                  if (err)
                    return cb(err, false, null);
                  else {
                    const total = lib.calculate_total(vout);
                    let op_return = null;
                    let algo = null;

                    // check if the op_return value should be decoded and saved
                    if (settings.transaction_page.show_op_return) {
                      // loop through vout to find the op_return value
                      tx.vout.forEach(function(vout_data) {
                        // check if the op_return value exists
                        if (vout_data.scriptPubKey != null && vout_data.scriptPubKey.asm != null && vout_data.scriptPubKey.asm.indexOf('OP_RETURN') > -1) {
                          // decode the op_return value
                          op_return = hex_to_ascii(vout_data.scriptPubKey.asm.replace('OP_RETURN', '').trim());
                        }
                      });
                    }

                    // check if the algo value should be saved
                    if (settings.block_page.multi_algorithm.show_algo) {
                      // get the algo value
                      algo = block[settings.block_page.multi_algorithm.key_name];
                    }

                    // return the transaction data
                    return cb(null, vout.length > 0, new Tx({
                      txid: tx.txid,
                      vin: (vin == null || vin.length == 0 ? [] : nvin),
                      vout: vout,
                      total: total.toFixed(8),
                      timestamp: tx.time,
                      blockhash: tx.blockhash,
                      blockindex: blockheight,
                      tx_type: (tx_type_vout == null ? tx_type_vin : tx_type_vout),
                      op_return: op_return,
                      algo: algo
                    }));
                  }
                });
              } else {
                // create a custom error that will be specifically checked for later
                // NOTE: tx_type_vout contains the error code in this special case
                const customError = new Error(tx_type_vout);

                customError.code = tx_type_vout;

                // return the custom error
                return cb(customError, false, null);
              }
            });
          });
        } else
          return cb('tx not found: ' + txid, false, null);
      });
    } catch(err) {
      return cb(`Error querying database for txid ${txid}: ${err}`, false, null);
    }
  },

  // updates tx & address balances
  update_tx_db: function(coin, start, end, txes, timeout, check_only, cb) {
    let blocks_to_scan = [];
    let parallel_tasks = settings.sync.block_parallel_tasks;
    let last_block_height_to_save = 0;

    // fix for invalid block height (skip genesis block as it should not have valid txs)
    if (typeof start === 'undefined' || start < 1)
      start = 1;

    if (parallel_tasks < 1)
      parallel_tasks = 1;

    let finished_tasks = 0;
    let processed_last_block = false;

    for (i = start; i < (end + 1); i++)
      blocks_to_scan.push(i);

    // create an array to help keep track of all block numbers being processed at the same time
    const block_numbers = Array(parallel_tasks).fill(0);

    // add a queue to manage access to the block array
    const block_queue = async.queue((task, cb) => {
      const { block_height, onComplete } = task;

      // select the first block number array index that is set to 0
      const slotIndex = block_numbers.findIndex((v) => v === 0);

      // wait for an available slot in the block array
      if (slotIndex === -1) {
        setTimeout(() => block_queue.push(task, cb), 1); // retry after 1 ms
        return;
      }

      // assign the current block height to the slot
      block_numbers[slotIndex] = block_height;

      // pass the slot index back
      onComplete(slotIndex);
      cb();
    });

    async.eachLimit(blocks_to_scan, parallel_tasks, function(block_height, next_block) {
      // check if this is the last block to process
      if (block_height == end) {
        // ensure the process knows not to wait for more threads to stop after this
        processed_last_block = true;
      }

      // add the current block height to a queue and wait for it to be next in queue before starting to sync the block
      block_queue.push(
        {
          block_height,
          onComplete: (slotIndex) => {
            // check if it's time to save the last known block height to the database
            if (
                (
                  check_only == 0 &&
                  block_height % settings.sync.save_stats_after_sync_blocks === 0
                ) ||
                (
                  last_block_height_to_save > 0 &&
                  block_numbers.every((value) => value >= last_block_height_to_save)
                )
            ) {
              // get the lowest block height currently being processed
              const lowest_block_height = Math.min(...block_numbers.filter((v) => v !== 0));

              // check if the current thread is processing the lowest block height
              // or there was a previous block height that needs to be saved now that all threads have advanced beyond that saved height
              if (block_height == lowest_block_height || last_block_height_to_save > 0) {
                // save the last known block height to the database along with the current tx count
                Stats.updateOne({coin: coin}, {
                  last: (last_block_height_to_save == 0 ? block_height : last_block_height_to_save),
                  txes: txes
                }).then(() => {});

                // reset the "last block height to save" back to 0
                last_block_height_to_save = 0;
              } else if (last_block_height_to_save == 0) {
                // update the last known block height that should be saved
                last_block_height_to_save = block_height;
              }
            } else if (check_only == 1)
              console.log('Checking block ' + block_height + '...');

            lib.get_blockhash(block_height, function(blockhash) {
              if (blockhash) {
                lib.get_block(blockhash, function(block) {
                  if (block) {
                    let tx_counter = 0;
                    let txBatch = [];

                    // create a queue for batching txes for this block
                    const txBatchQueue = async.queue(function(tx, done) {
                      // add the tx to an array
                      txBatch.push(tx);

                      // check if the batch of txes should be saved
                      if (txBatch.length >= settings.sync.batch_size) {
                        // save the current batch of txes to the database now
                        flushTxBatch(done);
                      } else {
                        // continue without saving txes
                        done();
                      }
                    }, 1);

                    // add a function used to bulkWrite txes to the database
                    function flushTxBatch(txBatchCallback) {
                      // copy current batch of txes to a local variable
                      const localTxBatch = txBatch;

                      // clear the global array of batched txes
                      txBatch = [];

                      // check if there are actually any txes to save
                      if (!localTxBatch || localTxBatch.length === 0) {
                        // no txes to save
                        return txBatchCallback();
                      } else {
                        // get the transaction batch ready to bulk update
                        const bulkTxes = localTxBatch.map(tx => {
                          // convert tx to plain JS object
                          const plainTx = tx.toObject();

                          // remove the _id field to prevent issues with some blockchains that can reuse non-standard txids
                          delete plainTx._id;

                          return {
                            updateOne: {
                              filter: { txid: plainTx.txid },
                              update: [
                                {
                                  $replaceWith: {
                                    $cond: {
                                      if: { $gt: [ plainTx.blockindex, { $ifNull: ["$blockindex", -1] } ] },
                                      then: {
                                        $mergeObjects: [
                                          // if a doc exists, keep that _id
                                          { _id: "$_id" },
                                          // overwrite everything else with plainTx
                                          plainTx
                                        ]
                                      },
                                      else: "$$ROOT"
                                    }
                                  }
                                }
                              ],
                              upsert: true
                            }
                          };
                        });

                        try {
                          // write the transactions to the database
                          Tx.bulkWrite(bulkTxes, { ordered: false, writeConcern: { w: (settings.sync.wait_for_bulk_database_save ? 1 : 0) } }).then(() => {
                            return txBatchCallback();
                          }).catch((err) => {
                            console.log(err);
                            return txBatchCallback();
                          });
                        } catch(err) {
                          console.log(err);
                          return txBatchCallback();
                        }
                      }
                    }

                    // loop through all txes in this block
                    async.eachLimit(block.tx, parallel_tasks, function(txid, next_tx) {
                      // increment tx counter
                      tx_counter++;

                      Tx.findOne({txid: txid}).then((tx) => {
                        if (tx && check_only != 2) {
                          setTimeout(function() {
                            tx = null;
                            tx_counter--;

                            // check if the script is stopping
                            if ((stopSync && check_only != 2) || stackSizeErrorId) {
                              // stop the loop
                              next_tx({});
                            } else
                              next_tx();
                          }, timeout);
                        } else {
                          // check if the transaction exists but doesn't match the current block height
                          check_delete_tx(tx, block_height, timeout, function(updated_txes, tx_deleted) {
                            // update the running tx count
                            txes += updated_txes;

                            // check if this tx should be added to the local database
                            if (tx_deleted || !tx) {
                              // save the transaction to local database
                              module.exports.save_tx(txid, block_height, block, function(err, tx_has_vout, newTx) {
                                if (err) {
                                  // check the error code
                                  if (err.code == 'StackSizeError') {
                                    // ensure the process halts after stopping all sync threads
                                    stackSizeErrorId = txid;
                                  } else
                                    console.log(err);

                                  setTimeout(function() {
                                    tx = null;
                                    tx_counter--;

                                    // check if the script is stopping
                                    if ((stopSync && check_only != 2) || stackSizeErrorId) {
                                      // stop the loop
                                      next_tx({});
                                    } else
                                      next_tx();
                                  }, timeout);
                                } else {
                                  console.log('%s: %s', block_height, txid);

                                  if (tx_has_vout)
                                    txes++;

                                  // add the tx to a queue
                                  txBatchQueue.push(newTx, function(queue_err) {
                                    setTimeout(function() {
                                      tx = null;
                                      tx_counter--;

                                      // check if the script is stopping
                                      if ((stopSync && check_only != 2) || stackSizeErrorId) {
                                        // stop the loop
                                        next_tx({});
                                      } else
                                        next_tx();
                                    }, timeout);
                                  });
                                }
                              });
                            } else {
                              // skip adding the current tx
                              setTimeout(function() {
                                tx = null;
                                tx_counter--;

                                // check if the script is stopping
                                if ((stopSync && check_only != 2) || stackSizeErrorId) {
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
                          tx_counter--;

                          // check if the script is stopping
                          if ((stopSync && check_only != 2) || stackSizeErrorId) {
                            // stop the loop
                            next_tx({});
                          } else
                            next_tx();
                        }, timeout);
                      });
                    }, function() {
                      // set the retry limit to a value that will be reached in ~10 seconds based on the
                      // timeout value which should be more than enough time for all threads to finish
                      // processing their last tx in case of error or cancel/kill script
                      const retryLimit = (10000 / timeout);
                      let retryAttempts = 0;

                      // wait for all threads to finish before continuing
                      const handle = setInterval(() => {
                        // check if all threads have properly finished or else the retry limit has been reached
                        // NOTE: the retry limit should never need to be used but is put in place to prevent an
                        //       infinite loop just in case something goes very wrong
                        if (tx_counter === 0 || retryAttempts >= retryLimit) {
                          // stop waiting for all threads to finish
                          clearInterval(handle);

                          blockhash = null;
                          block = null;

                          // save the remaining txes for this block
                          flushTxBatch(function(batch_err) {
                            if (batch_err)
                              console.error(batch_err);

                            // reset the slot in the block array back to 0
                            block_numbers[slotIndex] = 0;

                            // check if the script is stopping
                            if ((stopSync && check_only != 2) || stackSizeErrorId) {
                              // stop the loop
                              finished_tasks++;
                              next_block({});
                            } else {
                              // check if the last block is finished or in process and increment the finished counter
                              if (processed_last_block)
                                finished_tasks++;

                              // proceed to next block
                              next_block();
                            }
                          });
                        }
                      }, timeout);
                    });
                  } else {
                    console.log('Block not found: %s', blockhash);

                    setTimeout(function() {
                      // reset the slot in the block array back to 0
                      block_numbers[slotIndex] = 0;

                      // check if the script is stopping
                      if ((stopSync && check_only != 2) || stackSizeErrorId) {
                        // stop the loop
                        finished_tasks++;
                        next_block({});
                      } else {
                        // check if the last block is finished or in process and increment the finished counter
                        if (processed_last_block)
                          finished_tasks++;

                        // proceed to next block
                        next_block();
                      }
                    }, timeout);
                  }
                });
              } else {
                setTimeout(function() {
                  // reset the slot in the block array back to 0
                  block_numbers[slotIndex] = 0;

                  // check if the script is stopping
                  if ((stopSync && check_only != 2) || stackSizeErrorId) {
                    // stop the loop
                    finished_tasks++;
                    next_block({});
                  } else {
                    // check if the last block is finished or in process and increment the finished counter
                    if (processed_last_block)
                      finished_tasks++;

                    // proceed to next block
                    next_block();
                  }
                }, timeout);
              }
            });
          },
        },
        () => {}
      );
    }, function() {
      // set the retry limit to a value that will be reached in ~10 seconds based on the
      // timeout value which should be more than enough time for all threads to finish
      // processing their last tx in case of error or cancel/kill script
      const retryLimit = (10000 / timeout);
      let retryAttempts = 0;

      // wait for all threads to finish before continuing
      const handle = setInterval(() => {
        // check if all threads have properly finished or else the retry limit has been reached
        // NOTE: the retry limit should never need to be used but is put in place to prevent an
        //       infinite loop just in case something goes very wrong
        if (finished_tasks === ((end - start + 1) >= parallel_tasks ? parallel_tasks : (end - start + 1)) || retryAttempts >= retryLimit) {
          // stop waiting for all threads to finish
          clearInterval(handle);

          // finish the update
          finalize_update_tx_db(coin, check_only, end, txes, function() {
            // check if the script should continue or respawn a new process
            if (!stackSizeErrorId) {
              // continue to end of process
              return cb(txes);
            } else {
              // reload the sync process
              module.exports.respawnSync();
            }
          });
        } else {
          // still waiting for threads to finish so increment the retry counter
          retryAttempts++;
        }
      }, timeout);
    });
  },

  delete_and_cleanup_tx: function(txid, block_height, timeout, cb) {
    let tx_count = 0;

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
          async.eachSeries(addressTxArray, function(addressTx, address_loop) {
             // fix the balance, sent and received data for the current address
            fix_address_data(addressTx, function() {
              setTimeout(function() {
                // move to the next address record
                address_loop();
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
  },

  setStopSync: function(value) {
    stopSync = value;
  },

  getStopSync: function() {
    return stopSync;
  },

  setStackSizeErrorId: function(value) {
    stackSizeErrorId = value;
  },

  getStackSizeErrorId: function() {
    return stackSizeErrorId;
  },

  respawnSync: function() {
    let extraArgument = '';

    // check if this is the benchmark script which must be handled slightly differently than a normal sync
    if (process.argv[1].endsWith('benchmark.js')) {
      // add the extra argument for benchmark syncing
      extraArgument = '1';
    }

    const stackSizeArg = process.execArgv.find(arg => arg.startsWith('--stack-size='));
    let stackSize = 4096;

    // check if the script was called with a stack size argument
    if (stackSizeArg) {
      // set the default stack size to the value that is currently being used
      stackSize = parseInt(stackSizeArg.split('=')[1]);
    }

    // increase stack size by the elastic amount
    stackSize += settings.sync.elastic_stack_size;

    // show an error msg
    console.log(`${settings.localization.ex_error}: Maximum call stack size exceeded while processing txid ${stackSizeErrorId}`);
    console.log(`Restarting sync process with increased stack size of ${stackSize}. ${settings.localization.please_wait}..`);

    // filter out any existing --stack-size from execArgv
    const execArgvWithoutStackSize = process.execArgv.filter(arg => !arg.startsWith('--stack-size='));

    // populate child process arguments
    const args = [
      ...execArgvWithoutStackSize,
      `--stack-size=${stackSize}`,
      ...process.argv.slice(1) // includes the path to the sync script and any user args
    ];

    // add the extra argument to resume the benchmark sync and skip the unlock step
    if (extraArgument != '')
      args.push(extraArgument);
    else {
      // remove lock
      lib.remove_lock(process.argv[2] == null || process.argv[2] == '' ? 'index' : process.argv[2]);
    }

    const { spawn } = require('child_process');

    // reload the sync process
    const child = spawn(process.execPath, args, {
      stdio: 'inherit'
    });

    // when the child process ends, exit this parent process with the same code
    child.on('exit', code => {
      process.exit(code ?? 1);
    });
  }
};