var mongoose = require('mongoose'),
    db = require('../lib/database'),
    Tx = require('../models/tx'),
    Address = require('../models/address'),
    settings = require('../lib/settings'),
    lib = require('../lib/explorer'),
    Stats = require('../models/stats'),
    async = require('async');

var COUNT = 5000; // number of blocks to index

function exit(exitCode) {
  mongoose.disconnect();
  process.exit(exitCode);
}

var dbString = 'mongodb://' + encodeURIComponent(settings.dbsettings.user);
dbString = dbString + ':' + encodeURIComponent(settings.dbsettings.password);
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + "/IQUIDUS-BENCHMARK";

mongoose.connect(dbString, function(err) {
  if (err) {
    console.log('Error: Unable to connect to database: %s', dbString);
    exit(999);
  }

  Tx.deleteMany({}, function(err) {
    Address.deleteMany({}, function(err2) {
      var s_timer = new Date().getTime();

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
                            next_tx();
                          }, timeout);
                        });
                      }
                    });
                  }, function() {
                    setTimeout( function() {
                      blockhash = null;
                      block = null;
                      next_block();
                    }, timeout);
                  });
                } else {
                  console.log('Block not found: %s', blockhash);

                  setTimeout( function() {
                    next_block();
                  }, timeout);
                }
              });
            } else {
              setTimeout( function() {
                next_block();
              }, timeout);
            }
          });
        }, function() {
          Stats.updateOne({coin: coin}, {
            last: end,
            txes: txes
          }, function() {
            return cb();
          });
        });
      }

      update_tx_db(settings.coin.name, 1, COUNT, 0, settings.sync.update_timeout, false, function() {
        var e_timer = new Date().getTime();

        Tx.countDocuments({}, function(txerr, txcount) {
          Address.countDocuments({}, function(aerr, acount) {
            var stats = {
              tx_count: txcount,
              address_count: acount,
              seconds: (e_timer - s_timer)/1000,
            };

            console.log(stats);
            exit(0);
          });
        });
      });
    });
  });
});