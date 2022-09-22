var mongoose = require('mongoose'),
    Stats = require('../models/stats'),
    Markets = require('../models/markets'),
    Masternode = require('../models/masternode'),
    Address = require('../models/address'),
    AddressTx = require('../models/addresstx'),
    Tx = require('../models/tx'),
    Richlist = require('../models/richlist'),
    Peers = require('../models/peers'),
    Heavy = require('../models/heavy'),
    NetworkHistory = require('../models/networkhistory'),
    lib = require('./explorer'),
    settings = require('./settings'),
    locale = require('./locale'),
    fs = require('fs'),
    coingecko = require('./apis/coingecko');

function find_address(hash, caseSensitive, cb) {
  if (caseSensitive) {
    // faster search but only matches exact string including case
    Address.findOne({a_id: hash}, function(err, address) {
      if (address)
        return cb(address);
      else
        return cb();
    });
  } else {
    // slower search but matches exact string ignoring case
    Address.findOne({a_id: {$regex: '^' + hash + '$', $options: 'i'}}, function(err, address) {
      if (address)
        return cb(address);
      else
        return cb();
    });
  }
}

function find_address_tx(address, hash, cb) {
  AddressTx.findOne({a_id: address, txid: hash}, function(err, address_tx) {
    if (address_tx)
      return cb(address_tx);
    else
      return cb();
  });
}

function find_richlist(coin, cb) {
  Richlist.findOne({coin: coin}, function(err, richlist) {
    if (richlist)
      return cb(richlist);
    else
      return cb();
  });
}

function update_address(hash, blockheight, txid, amount, type, cb) {
  var to_sent = false;
  var to_received = false;
  var addr_inc = {}

  if (hash == 'coinbase')
    addr_inc.sent = amount;
  else {
    if (type == 'vin') {
      addr_inc.sent = amount;
      addr_inc.balance = -amount;
    } else {
      addr_inc.received = amount;
      addr_inc.balance = amount;
    }
  }

  Address.findOneAndUpdate({a_id: hash}, {
    $inc: addr_inc
  }, {
    new: true,
    upsert: true
  }, function (err, address) {
    if (err)
      return cb(err);
    else {
      if (hash != 'coinbase') {
        AddressTx.findOneAndUpdate({a_id: hash, txid: txid}, {
          $inc: {
            amount: addr_inc.balance
          },
          $set: {
            a_id: hash,
            blockindex: blockheight,
            txid: txid
          }
        }, {
          new: true,
          upsert: true
        }, function (err,addresstx) {
          if (err)
            return cb(err);
          else
            return cb();
        });
      } else
        return cb();
    }
  });
}

function find_tx(txid, cb) {
  Tx.findOne({txid: txid}, function(err, tx) {
    if (tx)
      return cb(tx);
    else
      return cb(null);
  });
}

function get_market_data(market, coin_symbol, pair_symbol, cb) {
  if (fs.existsSync('./lib/markets/' + market + '.js')) {
    exMarket = require('./markets/' + market);

    exMarket.get_data({coin: coin_symbol, exchange: pair_symbol}, function(err, obj) {
      return cb(err, obj);
    });
  } else
    return cb(null);
}

function check_add_db_field(model_obj, field_name, default_value, cb) {
  // determine if a particular field exists in a db collection
  model_obj.findOne({[field_name]: {$exists: false}}, function(err, model_data) {
    // check if field exists
    if (model_data) {
      // add field to all documents in the collection
      model_obj.updateMany({}, {
        $set: { [field_name]: default_value }
      }, function() {
        return cb(true);
      });
    } else
      return cb(false);
  });
}

function check_rename_db_field(model_obj, old_field_name, new_field_name, cb) {
  // determine if a particular field exists in a db collection
  model_obj.findOne({[old_field_name]: {$exists: false}}, function(err, model_data) {
    // check if old field exists
    if (model_data) {
      // rename field
      model_obj.updateMany({}, {
        $rename: { [old_field_name]: new_field_name }
      }, { multi: true, strict: false }, function() {
        return cb(true);
      });
    } else
      return cb(false);
  });
}

function hex_to_ascii(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function init_markets(cb) {
  // check if markets/exchanges feature is enabled
  if (settings.markets_page.enabled == true) {
    var marketCounter = 0;

    // loop through and test all exchanges defined in the settings.json file
    Object.keys(settings.markets_page.exchanges).forEach(function (key, index, map) {
      // check if market is enabled via settings
      if (settings.markets_page.exchanges[key].enabled == true) {
        // check if exchange is installed/supported
        if (module.exports.fs.existsSync('./lib/markets/' + key + '.js')) {
          var pairCounter = 0;

          // loop through all trading pairs
          settings.markets_page.exchanges[key].trading_pairs.forEach(function (pair_key, pair_index, pair_map) {
            // split the pair data
            var split_pair = pair_key.split('/');
            // check if this is a valid trading pair
            if (split_pair.length == 2) {
              // lookup the exchange in the market collection
              module.exports.check_market(key, split_pair[0], split_pair[1], function(market, exists) {
                // check if exchange trading pair exists in the market collection
                if (!exists) {
                  // exchange doesn't exist in the market collection so add a default definition now
                  console.log('No %s: %s entry found. Creating new entry now..', market, pair_key);
                  module.exports.create_market(split_pair[0], split_pair[1], market, function() {
                    pairCounter++;

                    // check if all pairs have been tested
                    if (pairCounter == settings.markets_page.exchanges[key].trading_pairs.length)
                      marketCounter++;

                    // check if all exchanges have been tested
                    if (marketCounter == Object.keys(settings.markets_page.exchanges).length) {
                      // finished initializing markets
                      return cb();
                    }
                  });
                } else {
                  pairCounter++;

                  // check if all pairs have been tested
                  if (pairCounter == settings.markets_page.exchanges[key].trading_pairs.length)
                    marketCounter++;
                }

                // check if all exchanges have been tested
                if (marketCounter == Object.keys(settings.markets_page.exchanges).length) {
                  // finished initializing markets
                  return cb();
                }
              });
            } else {
              pairCounter++;

              // check if all pairs have been tested
              if (pairCounter == settings.markets_page.exchanges[key].trading_pairs.length)
                marketCounter++;
            }
          });
        } else
          marketCounter++;
      } else
        marketCounter++;
    });

    // check if all exchanges have been tested
    if (marketCounter == Object.keys(settings.markets_page.exchanges).length) {
      // finished initializing markets
      return cb();
    }
  } else
    return cb();
}

function init_heavy(cb) {
  if (settings.blockchain_specific.heavycoin.enabled == true) {
    module.exports.check_heavy(settings.coin.name, function(exists) {
      if (exists == false) {
        console.log('No heavycoin entry found. Creating new entry now..');
        module.exports.create_heavy(settings.coin.name, function() {
          return cb();
        });
      } else
        return cb();
    });
  } else
    return cb();
}

module.exports = {
  // initialize DB
  connect: function(database, cb) {
    mongoose.connect(database, function(err) {
      if (err) {
        console.log('Error: Unable to connect to database: %s', database);
        process.exit(999);
      }

      return cb();
    });
  },

  check_show_sync_message: function() {
    return fs.existsSync('./tmp/show_sync_message.tmp');
  },

  update_label: function(hash, claim_name, cb) {
    find_address(hash, false, function(address) {
      if (address) {
        Address.updateOne({a_id: hash}, {
          name: claim_name
        }, function() {
          // update claim name in richlist
          module.exports.update_richlist_claim_name(hash, claim_name, function() {
            // update claim name in masternode list
            module.exports.update_masternode_claim_name(hash, claim_name, function() {
              return cb('');
            });
          });
        });
      } else {
        // address is not valid or does not have any transactions
        return cb('no_address');
      }
    });
  },

  update_richlist_claim_name: function(hash, claim_name, cb) {
    // check if the richlist is enabled
    if (settings.richlist_page.enabled == true) {
      // ensure that if this address exists in the richlist that it displays the new alias
      module.exports.get_richlist(settings.coin.name, function(richlist) {
        var updated = false;

        // loop through received addresses
        for (r = 0; r < richlist.received.length; r++) {
          // check if this is the correct address
          if (richlist.received[r].a_id == hash) {
            // update the claim name
            richlist.received[r]['name'] = claim_name;
            // mark as updated
            updated = true;
          }
        }

        // loop through balance addresses
        for (b = 0; b < richlist.balance.length; b++) {
          // check if this is the correct address
          if (richlist.balance[b].a_id == hash) {
            // update the claim name
            richlist.balance[b]['name'] = claim_name;
            // mark as updated
            updated = true;
          }
        }

        // check if the address was updated in the richlist
        if (updated) {
          // save the richlist back to collection
          Richlist.updateOne({coin: settings.coin.name}, {
            received: richlist.received,
            balance: richlist.balance
          }, function() {
            // finished updating the claim label
            return cb('');
          });
        } else {
          // finished updating the claim label
          return cb('');
        }
      });
    } else {
      // richlist is not enabled so nothing to update
      return cb('');
    }
  },

  update_masternode_claim_name: function(hash, claim_name, cb) {
    // check if the masternode list is enabled
    if (settings.masternodes_page.enabled == true) {
      // ensure that if this address exists in the masternode that it displays the new alias
      module.exports.get_masternodes(function(masternodes) {
        var updated = false;

        // loop through masternode addresses
        for (m = 0; m < masternodes.length; m++) {
          // check if this is the correct address
          if ((masternodes[m].proTxHash != null ? masternodes[m].payee : masternodes[m].addr) == hash) {
            // update the claim name
            masternodes[m]['claim_name'] = claim_name;
            // mark as updated
            updated = true;
          }
        }

        // check if the address was updated in the masternode list
        if (updated) {
          // save the updated masternode back to collection
          Masternode.updateOne({addr: hash}, {
            claim_name: claim_name
          }, function() {
            // finished updating the claim label
            return cb('');
          });
        } else {
          // finished updating the claim label
          return cb('');
        }
      });
    } else {
      // masternode list is not enabled so nothing to update
      return cb('');
    }
  },

  check_txes: function(cb) {
    Tx.findOne({}, function(err, tx) {
      if (tx) {
        // collection has data
        // determine if tx_type field exists
        check_add_db_field(Tx, 'tx_type', null, function(exists) {
          // determine if op_return field exists
          check_add_db_field(Tx, 'op_return', null, function(exists) {
            return cb(true);
          });
        });
      } else
        return cb(false);
    });
  },

  check_stats: function(coin, cb) {
    Stats.findOne({coin: coin}, function(err, stats) {
      if (stats) {
        // collection has data
        // determine if last_usd_price field exists
        check_add_db_field(Stats, 'last_usd_price', 0, function(exists) {
          return cb(true);
        });
      } else
        return cb(false);
    });
  },

  get_stats: function(coin, cb) {
    Stats.findOne({coin: coin}, function(err, stats) {
      if (stats)
        return cb(stats);
      else
        return cb(null);
    });
  },

  create_stats: function(coin, skip, cb) {
    // check if stats need to be created
    if (!skip) {
      var newStats = new Stats({
        coin: coin,
        last: 0
      });

      newStats.save(function(err) {
        if (err) {
          console.log(err);
          return cb();
        } else {
          console.log("Initial stats entry created for %s", coin);
          return cb();
        }
      });
    } else
      return cb();
  },

  get_address: function(hash, caseSensitive, cb) {
    find_address(hash, caseSensitive, function(address) {
      return cb(address);
    });
  },

  get_richlist: function(coin, cb) {
    find_richlist(coin, function(richlist) {
      return cb(richlist);
    });
  },

  // 'list' variable can be either 'received' or 'balance'
  update_richlist: function(list, cb) {
    // number of addresses to lookup
    var total_addresses = 100;
    // create the burn address array so that we omit burned coins from the rich list
    var burn_addresses = settings.richlist_page.burned_coins.addresses;

    // always omit special addresses used by the explorer from the richlist (coinbase, hidden address and unknown address)
    burn_addresses.push('coinbase');
    burn_addresses.push('hidden_address');
    burn_addresses.push('unknown_address');

    if (list == 'received') {
      // update 'received' richlist data
      Address.find({a_id: { $nin: burn_addresses }}, 'a_id name balance received').sort({received: 'desc'}).limit(total_addresses).exec(function(err, addresses) {
        Richlist.updateOne({coin: settings.coin.name}, {
          received: addresses
        }, function() {
          return cb();
        });
      });
    } else {
      // update 'balance' richlist data
      // check if burned addresses are in use and if it is necessary to track burned balances
      if (settings.richlist_page.burned_coins.addresses == null || settings.richlist_page.burned_coins.addresses.length == 0 || !settings.richlist_page.burned_coins.include_burned_coins_in_distribution) {
        // update 'balance' richlist data by filtering burned coin addresses immidiately
        Address.find({a_id: { $nin: burn_addresses }}, 'a_id name balance received').sort({balance: 'desc'}).limit(total_addresses).exec(function(err, addresses) {
          Richlist.updateOne({coin: settings.coin.name}, {
            balance: addresses
          }, function() {
            return cb();
          });
        });
      } else {
        // do not omit burned addresses from database query. instead, increase the limit of returned addresses and manually remove each burned address that made it into the rich list after recording the burned balance
        Address.find({}, 'a_id name balance received').sort({balance: 'desc'}).limit(total_addresses + burn_addresses.length).exec(function(err, addresses) {
          var return_addresses = [];
          var burned_balance = 0.0;

          // loop through all richlist addresses
          addresses.forEach(function (address) {
            // check if this is a burned coin address
            if (burn_addresses.findIndex(p => p.toLowerCase() == address.a_id.toLowerCase()) > -1) {
              // this is a burned coin address so save the balance, not the address
              burned_balance += address.balance;
            } else if (return_addresses.length < total_addresses) {
              // this is not a burned address so add it to the return list
              return_addresses.push(address);
            }
          });

          // update the rich list collection
          Richlist.updateOne({coin: settings.coin.name}, {
            balance: return_addresses,
            burned: burned_balance
          }, function() {
            return cb();
          });
        });
      }
    }
  },

  get_tx: function(txid, cb) {
    find_tx(txid, function(tx) {
      return cb(tx);
    });
  },

  get_txs: function(block, cb) {
    var txs = [];

    lib.syncLoop(block.tx.length, function (loop) {
      var i = loop.iteration();

      find_tx(block.tx[i], function(tx) {
        if (tx) {
          txs.push(tx);
          loop.next();
        } else
          loop.next();
      });
    }, function() {
      return cb(txs);
    });
  },

  get_last_txs: function(start, length, min, internal, cb) {
    this.get_last_txs_ajax(start, length, min, function(txs, count) {
      var data = [];

      for (i = 0; i < txs.length; i++) {
        if (internal) {
          var row = [];

          row.push(txs[i].blockindex);
          row.push(txs[i].blockhash);
          row.push(txs[i].txid);
          row.push(txs[i].vout.length);
          row.push((txs[i].total / 100000000));
          row.push(txs[i].timestamp);

          data.push(row);
        } else {
          data.push({
            blockindex: txs[i].blockindex,
            blockhash: txs[i].blockhash,
            txid: txs[i].txid,
            recipients: txs[i].vout.length,
            amount: (txs[i].total / 100000000),
            timestamp: txs[i].timestamp
          });
        }
      }

      return cb(data, count);
    });
  },

  get_last_txs_ajax: function(start, length, min, cb) {
    // check if min is greater than zero
    if (min > 0) {
      // min is greater than zero which means we must pull record count from the txes collection
      Tx.find({'total': {$gte: min}}).countDocuments(function(err, count) {
        // get last transactions where there is at least 1 vout
        Tx.find({'total': {$gte: min}, 'vout': { $gte: { $size: 1 }}}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec(function(err, txs) {
          if (err)
            return cb(err);
          else
            return cb(txs, count);
        });
      });
    } else {
      // min is zero (shouldn't ever be negative) which means we must pull record count from the coinstats collection (pulling from txes could potentially take a long time because it would include coinbase txes)
      Stats.findOne({coin: settings.coin.name}, function(err, stats) {
        // Get last transactions where there is at least 1 vout
        Tx.find({'total': {$gte: min}, 'vout': { $gte: { $size: 1 }}}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec(function(err, txs) {
          if (err)
            return cb(err);
          else
            return cb(txs, stats.txes);
        });
      });
    }
  },

  get_address_txs_ajax: function(hash, start, length, cb) {
    var totalCount = 0;

    AddressTx.find({a_id: hash}).countDocuments(function(err, count) {
      if (err)
        return cb(err);
      else {
        totalCount = count;

        AddressTx.aggregate([
          { $match: { a_id: hash } },
          { $sort: {blockindex: -1} },
          { $skip: Number(start) },
          {
            $group: {
              _id: '',
              balance: { $sum: '$amount' }
            }
          },
          {
            $project: {
              _id: 0,
              balance: '$balance'
            }
          },
          { $sort: {blockindex: -1} }
        ], function (err,balance_sum) {
          if (err)
            return cb(err);
          else {
            AddressTx.find({a_id: hash}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec(function (err, address_tx) {
              if (err)
                return cb(err);
              else {
                var txs = [];
                var count = address_tx.length;
                var running_balance = balance_sum.length > 0 ? balance_sum[0].balance : 0;
                var txs = [];

                lib.syncLoop(count, function (loop) {
                  var i = loop.iteration();

                  find_tx(address_tx[i].txid, function (tx) {
                    if (tx && !txs.includes(tx)) {
                      tx.balance = running_balance;
                      txs.push(tx);
                      loop.next();
                    } else if (!txs.includes(tx)) {
                      txs.push("1. Not found");
                      loop.next();
                    } else
                      loop.next();

                    running_balance = running_balance - address_tx[i].amount;
                  });
                }, function () {
                  return cb(txs, totalCount);
                });
              }
            });
          }
        });
      }
    });
  },

  create_market: function(coin_symbol, pair_symbol, market, cb) {
    var newMarkets = new Markets({
      market: market,
      coin_symbol: coin_symbol,
      pair_symbol: pair_symbol
    });

    newMarkets.save(function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else {
        console.log("Initial market entry created for %s: %s", market, coin_symbol +'/' + pair_symbol);
        return cb();
      }
    });
  },

  // check if market data exists for a given market and trading pair
  check_market: function(market, coin_symbol, pair_symbol, cb) {
    Markets.findOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}, function(err, exists) {
      return cb(market, exists);
    });
  },

  // gets market data for given market and trading pair
  get_market: function(market, coin_symbol, pair_symbol, cb) {
    Markets.findOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}, function(err, data) {
      if (data)
        return cb(data);
      else
        return cb(null);
    });
  },

  // creates initial richlist entry in database; called on first launch of explorer + after restore or delete database
  create_richlist: function(coin, skip, cb) {
    // check if stats need to be created
    if (!skip) {
      var newRichlist = new Richlist({
        coin: coin
      });

      newRichlist.save(function(err) {
        if (err) {
          console.log(err);
          return cb();
        } else {
          console.log("Initial richlist entry created for %s", coin);
          return cb();
        }
      });
    } else
      return cb();
  },

  // drops richlist data for given coin
  delete_richlist: function(coin, cb) {
    Richlist.findOneAndRemove({coin: coin}, function(err, exists) {
      if (exists)
        return cb(true);
      else
        return cb(false);
    });
  },

  // checks richlist data exists for given coin
  check_richlist: function(coin, cb) {
    Richlist.findOne({coin: coin}, function(err, exists) {
      if (exists)
        return cb(true);
      else
        return cb(false);
    });
  },

  create_heavy: function(coin, cb) {
    var newHeavy = new Heavy({
      coin: coin
    });

    newHeavy.save(function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else {
        console.log("Initial heavycoin entry created for %s", coin);
        return cb();
      }
    });
  },

  check_heavy: function(coin, cb) {
    Heavy.findOne({coin: coin}, function(err, exists) {
      if (exists)
        return cb(true);
      else
        return cb(false);
    });
  },

  get_heavy: function(coin, cb) {
    Heavy.findOne({coin: coin}, function(err, heavy) {
      if (heavy)
        return cb(heavy);
      else
        return cb(null);
    });
  },

  get_distribution: function(richlist, stats, cb) {
    var distribution = {
      supply: stats.supply,
      t_1_25: {percent: 0, total: 0 },
      t_26_50: {percent: 0, total: 0 },
      t_51_75: {percent: 0, total: 0 },
      t_76_100: {percent: 0, total: 0 },
      t_101plus: {percent: 0, total: 0 }
    };

    lib.syncLoop(richlist.balance.length, function (loop) {
      var i = loop.iteration();
      var count = i + 1;
      var percentage = ((richlist.balance[i].balance / 100000000) / stats.supply) * 100;

      if (count <= 25 ) {
        distribution.t_1_25.percent = distribution.t_1_25.percent + percentage;
        distribution.t_1_25.total = distribution.t_1_25.total + (richlist.balance[i].balance / 100000000);
      }

      if (count <= 50 && count > 25) {
        distribution.t_26_50.percent = distribution.t_26_50.percent + percentage;
        distribution.t_26_50.total = distribution.t_26_50.total + (richlist.balance[i].balance / 100000000);
      }

      if (count <= 75 && count > 50) {
        distribution.t_51_75.percent = distribution.t_51_75.percent + percentage;
        distribution.t_51_75.total = distribution.t_51_75.total + (richlist.balance[i].balance / 100000000);
      }

      if (count <= 100 && count > 75) {
        distribution.t_76_100.percent = distribution.t_76_100.percent + percentage;
        distribution.t_76_100.total = distribution.t_76_100.total + (richlist.balance[i].balance / 100000000);
      }

      loop.next();
    }, function() {
      distribution.t_101plus.percent = parseFloat(100 - distribution.t_76_100.percent - distribution.t_51_75.percent - distribution.t_26_50.percent - distribution.t_1_25.percent - (settings.richlist_page.burned_coins.include_burned_coins_in_distribution == true && richlist.burned > 0 ? ((richlist.burned / 100000000) / stats.supply) * 100 : 0)).toFixed(2);
      distribution.t_101plus.total = parseFloat(distribution.supply - distribution.t_76_100.total - distribution.t_51_75.total - distribution.t_26_50.total - distribution.t_1_25.total - (settings.richlist_page.burned_coins.include_burned_coins_in_distribution == true && richlist.burned > 0 ? (richlist.burned / 100000000) : 0)).toFixed(8);
      distribution.t_1_25.percent = parseFloat(distribution.t_1_25.percent).toFixed(2);
      distribution.t_1_25.total = parseFloat(distribution.t_1_25.total).toFixed(8);
      distribution.t_26_50.percent = parseFloat(distribution.t_26_50.percent).toFixed(2);
      distribution.t_26_50.total = parseFloat(distribution.t_26_50.total).toFixed(8);
      distribution.t_51_75.percent = parseFloat(distribution.t_51_75.percent).toFixed(2);
      distribution.t_51_75.total = parseFloat(distribution.t_51_75.total).toFixed(8);
      distribution.t_76_100.percent = parseFloat(distribution.t_76_100.percent).toFixed(2);
      distribution.t_76_100.total = parseFloat(distribution.t_76_100.total).toFixed(8);

      return cb(distribution);
    });
  },

  // updates heavycoin stats
  // height: current block height, count: amount of votes to store
  update_heavy: function(coin, height, count, cb) {
    var newVotes = [];

    lib.get_maxmoney( function (maxmoney) {
      lib.get_maxvote( function (maxvote) {
        lib.get_vote( function (vote) {
          lib.get_phase( function (phase) {
            lib.get_reward( function (reward) {
              module.exports.get_stats(settings.coin.name, function (stats) {
                lib.get_estnext( function (estnext) {
                  lib.get_nextin( function (nextin) {
                    lib.syncLoop(count, function (loop) {
                      var i = loop.iteration();

                      lib.get_blockhash(height - i, function (hash) {
                        lib.get_block(hash, function (block) {
                          newVotes.push({ count: height - i, reward: block.reward, vote: (block && block.vote ? block.vote : 0) });
                          loop.next();
                        });
                      });
                    }, function() {
                      Heavy.updateOne({coin: coin}, {
                        lvote: (vote ? vote : 0),
                        reward: (reward ? reward : 0),
                        supply: (stats && stats.supply ? stats.supply : 0),
                        cap: (maxmoney ? maxmoney : 0),
                        estnext: (estnext ? estnext : 0),
                        phase: (phase ? phase : 'N/A'),
                        maxvote: (maxvote ? maxvote : 0),
                        nextin: (nextin ? nextin : 'N/A'),
                        votes: newVotes
                      }, function() {
                        // update reward_last_updated value
                        module.exports.update_last_updated_stats(settings.coin.name, { reward_last_updated: Math.floor(new Date() / 1000) }, function (new_cb) {
                          console.log('Heavycoin update complete');
                          return cb();
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
    });
  },

  // updates network history (nethash and difficulty) data
  // height: current block height
  update_network_history: function(height, cb) {
    // lookup network history data for this block height
    NetworkHistory.findOne({blockindex: height}, function(err, network_hist) {
      // check if there is already network history data for this block height
      if (!network_hist) {
        // lookup network hashrate
        lib.get_hashrate(function(hashrate) {
          // lookup network difficulty
          lib.get_difficulty(function(difficulty) {
            var difficultyPOW = 0;
            var difficultyPOS = 0;

            if (difficulty && difficulty['proof-of-work']) {
              if (settings.shared_pages.difficulty == 'Hybrid') {
                difficultyPOS = difficulty['proof-of-stake'];
                difficultyPOW = difficulty['proof-of-work'];
              } else if (settings.shared_pages.difficulty == 'POW')
                difficultyPOW = difficulty['proof-of-work'];
              else
                difficultyPOS = difficulty['proof-of-stake'];
            } else if (settings.shared_pages.difficulty == 'POW')
              difficultyPOW = difficulty;
            else
              difficultyPOS = difficulty;

            // create a new network history record
            var newNetworkHistory = new NetworkHistory({
              blockindex: height,
              nethash: (hashrate == null || hashrate == '-' ? 0 : hashrate),
              difficulty_pow: difficultyPOW,
              difficulty_pos: difficultyPOS,
            });

            // save the new network history record
            newNetworkHistory.save(function(err) {
              // check for errors
              if (err) {
                console.log('Error updating network history: ' + err);
                return cb();
              } else {
                // get the count of network history records
                NetworkHistory.find({}).countDocuments(function(err, count) {
                  // read maximum allowed records from settings
                  let max_records = settings.network_history.max_saved_records;

                  // check if the current count of records is greater than the maximum allowed
                  if (count > max_records) {
                    // prune network history records to keep collection small and quick to access
                    NetworkHistory.find().select('blockindex').sort({blockindex: 1}).limit(count - max_records).exec(function(err, records) {
                      // create a list of the oldest network history ids that will be deleted
                      const ids = records.map((doc) => doc.blockindex);

                      // delete old network history records
                      NetworkHistory.deleteMany({blockindex: {$in: ids}}, function(err) {
                        console.log('Network history update complete');
                        return cb();
                      });
                    });
                  } else {
                    console.log('Network history update complete');
                    return cb();
                  }
                });
              }
            });
          });
        });
      } else {
        // skip saving network history data when the block hasn't moved since saving last time
        return cb();
      }
    });
  },

  // updates market data for given market; called by sync.js
  update_markets_db: function(market, coin_symbol, pair_symbol, cb) {
    // check if market exists
    if (fs.existsSync('./lib/markets/' + market + '.js')) {
      get_market_data(market, coin_symbol, pair_symbol, function (err, obj) {
        // check if there was an error with getting market data
        if (err == null) {
          // update the market collection for the current market and trading pair combination
          Markets.updateOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}, {
            chartdata: JSON.stringify(obj.chartdata),
            buys: obj.buys,
            sells: obj.sells,
            history: obj.trades,
            summary: obj.stats
          }, function() {
            // check if this is the default market and trading pair
            if (market == settings.markets_page.default_exchange.exchange_name && settings.markets_page.default_exchange.trading_pair.toUpperCase() == coin_symbol.toUpperCase() + '/' + pair_symbol.toUpperCase()) {
              // this is the default market so update the last price stats
              Stats.updateOne({coin: settings.coin.name}, {
                last_price: obj.stats.last
              }, function() {
                // finished updating market data
                return cb(null);
              });
            } else {
              // this is not the default market so we are finished updating market data
              return cb(null);
            }
          });
        } else {
          // an error occurred with getting market data so return the error msg
          return cb(err);
        }
      });
    } else {
      // market does not exist
      return cb('market is not installed');
    }
  },

  get_last_usd_price: function(cb) {
    // check if the default market is enabled
    if (settings.markets_page.exchanges[settings.markets_page.default_exchange.exchange_name].enabled == true) {
      // get the list of coins from coingecko
      coingecko.get_coin_data(function (err, coin_list) {
        // check for errors
        if (err == null) {
          var symbol = settings.markets_page.default_exchange.trading_pair.split('/')[1];
          var index = coin_list.findIndex(p => p.symbol.toLowerCase() == symbol.toLowerCase());

          // check if the default market pair is found in the coin list
          if (index > -1) {
            // get the usd value of the default market pair from coingecko
            coingecko.get_data(coin_list[index].id,  function (err, last_usd) {
              // check for errors
              if (err == null) {
                // get current stats
                Stats.findOne({coin: settings.coin.name}, function(err, stats) {
                  // update the last usd price
                  Stats.updateOne({coin: settings.coin.name}, {
                    last_usd_price: (last_usd * stats.last_price)
                  }, function() {
                    // last usd price updated successfully
                    return cb(null);
                  });
                });
              } else {
                // return error msg
                return cb(err);
              }
            });
          } else {
            // return error msg
            return cb('cannot find symbol ' + symbol + ' in the coingecko api');
          }
        } else {
          // return error msg
          return cb(err);
        }
      });
    } else {
      // default exchange is not enabled so just exit without updating last price for now
      return cb(null);
    }
  },

  // updates stats data for given coin; called by sync.js
  update_db: function(coin, cb) {
    lib.get_blockcount( function (count) {
      // check to ensure count is a positive number
      if (!count || (count != null && typeof count === 'number' && count < 0)) {
        console.log('Error: Unable to connect to explorer API');

        return cb(false);
      }

      lib.get_supply(function (supply) {
        lib.get_connectioncount(function (connections) {
          Stats.findOne({coin: coin}, function(err, stats) {
            if (stats) {
              Stats.updateOne({coin: coin}, {
                coin: coin,
                count : count,
                supply: (supply ? supply : 0),
                connections: (connections ? connections : 0)
              }, function(err) {
                if (err)
                  console.log("Error during stats update: %s", err);

                return cb({
                  coin: coin,
                  count : count,
                  supply: (supply ? supply : 0),
                  connections: (connections ? connections : 0),
                  last: (stats.last ? stats.last : 0),
                  txes: (stats.txes ? stats.txes : 0)
                });
              });
            } else {
              console.log("Error during stats update: %s", (err ? err : 'Cannot find stats collection'));
              return cb(false);
            }
          });
        });
      });
    });
  },

  create_peer: function(params, cb) {
    var newPeer = new Peers(params);

    newPeer.save(function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else
        return cb();
    });
  },

  find_peer: function(address, port, cb) {
    Peers.findOne({address: address, port: port}, function(err, peer) {
      if (err)
        return cb(null);
      else {
        if (peer)
          return cb(peer);
        else
          return cb (null)
      }
    });
  },

  drop_peer: function(address, port, cb) {
    Peers.deleteOne({address: address, port: port}, function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else
        return cb();
    });
  },

  drop_peers: function(cb) {
    Peers.deleteMany({}, function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else
        return cb();
    });
  },

  get_peers: function(cb) {
    Peers.find().sort({address: 1, protocol: -1, port: 1}).exec(function (err, peers) {
      if (err)
        return cb([]);
      else
        return cb(peers);
    });
  },

  check_masternodes: function(cb) {
    Masternode.findOne({}, function(err, masternode) {
      if (masternode) {
        // collection has data
        // determine if ip_address field exists
        check_add_db_field(Masternode, 'ip_address', null, function(exists) {
          // determine if last_paid_block field exists
          check_add_db_field(Masternode, 'last_paid_block', null, function(exists) {
            return cb(true);
          });
        });
      } else
        return cb(false);
    });
  },

  // determine if masternode exists and save masternode to collection
  save_masternode: function (raw_masternode, cb) {
    // lookup masternode in local collection
    module.exports.find_masternode((raw_masternode.proTxHash != null ? raw_masternode.proTxHash : raw_masternode.txhash), function (masternode) {
      // determine if the claim address feature is enabled
      if (settings.claim_address_page.enabled == true) {
        // claim address is enabled so lookup the address claim name
        find_address((raw_masternode.proTxHash != null ? raw_masternode.payee : raw_masternode.addr), false, function(address) {
          if (address) {
            // save claim name to masternode obejct
            raw_masternode.claim_name = address.name;
          } else {
            // save blank claim name to masternode obejct
            raw_masternode.claim_name = '';
          }

          // add/update the masternode
          module.exports.add_update_masternode(raw_masternode, (masternode == null), function(success) {
            return cb(success);
          });
        });
      } else {
        // claim address is disabled so add/update the masternode
        module.exports.add_update_masternode(raw_masternode, (masternode == null), function(success) {
          return cb(success);
        });
      }
    });
  },

  // add or update a single masternode
  add_update_masternode(masternode, add, cb) {
    if (masternode.proTxHash == null && masternode.txhash == null) {
      console.log('Masternode update error: Tx Hash is missing');

      return cb(false);
    } else {
      // Check if this older or newer Dash masternode format
      if (masternode.proTxHash != null) {
        // This is the newer Dash format
        var mn = new Masternode({
          txhash: masternode.proTxHash,
          status: masternode.status,
          addr: masternode.payee,
          lastpaid: masternode.lastpaidtime,
          ip_address: masternode.address,
          last_paid_block: masternode.lastpaidblock,
          lastseen: Math.floor(Date.now() / 1000),
          claim_name: (masternode.claim_name == null ? '' : masternode.claim_name)
        });
      } else {
        // This is the older Dash format, or an unknown format
        var mn = new Masternode({
          rank: masternode.rank,
          network: masternode.network,
          txhash: masternode.txhash,
          outidx: masternode.outidx,
          status: masternode.status,
          addr: masternode.addr,
          version: masternode.version,
          lastseen: masternode.lastseen,
          activetime: masternode.activetime,
          lastpaid: masternode.lastpaid,
          claim_name: (masternode.claim_name == null ? '' : masternode.claim_name)
        });
      }

      if (add) {
        // add new masternode to collection
        mn.save(function (err) {
          if (err) {
            console.log(err);
            return cb(false);
          } else
            return cb(true);
        });
      } else {
        // update existing masternode in local collection
        Masternode.updateOne({ txhash: (masternode.proTxHash != null ? masternode.proTxHash : masternode.txhash) }, masternode, function (err) {
          if (err) {
            console.log(err);
            return cb(false);
          } else
            return cb(true);
        });
      }
    }
  },

  // find masternode by txid
  find_masternode: function (txhash, cb) {
    Masternode.findOne({ txhash: txhash }, function (err, masternode) {
      if (err)
        return cb(null);
      else {
        if (masternode)
          return cb(masternode);
        else
          return cb(null);
      }
    });
  },

  // remove masternodes older than 24 hours
  remove_old_masternodes: function (cb) {
    Masternode.deleteMany({ lastseen: { $lte: (Math.floor(Date.now() / 1000) - 86400) } }, function (err) {
      if (err) {
        console.log(err);
        return cb();
      } else
        return cb();
    });
  },

  // get the list of masternodes from local collection
  get_masternodes: function (cb) {
    Masternode.find({}, function (err, masternodes) {
      if (err)
        return cb([]);
      else
        return cb(masternodes);
    });
  },

  get_masternode_rewards: function(mnPayees, since, cb) {
    Tx.aggregate([
      { $match: {
        "blockindex": { $gt: Number(since) },
        "vin": []
      }},
      { "$unwind": "$vout" },
      { $match: {
        "vout.addresses": { $in: [mnPayees] }
      }}
    ], function(err, data) {
      if (err) {
        console.log(err);
        return cb(null);
      } else
        return cb(data);
    });
  },

  get_masternode_rewards_totals: function(mnPayees, since, cb) {
    Tx.aggregate([
      { $match: {
        "blockindex": { $gt: Number(since) },
        "vin": []
      }},
      { "$unwind": "$vout" },
      { $match: {
        "vout.addresses": { $in: [mnPayees] }
      }},
      { $group: { _id: null, total: { $sum: "$vout.amount" } } }
    ], function(err, data) {
      if (err) {
        console.log(err);
        return cb(null);
      } else
        return cb((data.length > 0 ? data[0].total / 100000000 : 0));
    });
  },

  // updates last_updated stats; called by sync.js
  update_last_updated_stats: function (coin, param, cb) {
    if (param.blockchain_last_updated) {
      // update blockchain last updated date
      Stats.updateOne({ coin: coin }, {
        blockchain_last_updated: param.blockchain_last_updated
      }, function () {
        return cb(true);
      });
    } else if (param.reward_last_updated) {
      // update reward last updated date
      Stats.updateOne({ coin: coin }, {
        reward_last_updated: param.reward_last_updated
      }, function () {
        return cb(true);
      });
    } else if (param.masternodes_last_updated) {
      // update masternode last updated date
      Stats.updateOne({ coin: coin }, {
        masternodes_last_updated: param.masternodes_last_updated
      }, function () {
        return cb(true);
      });
    } else if (param.network_last_updated) {
      // update network last updated date
      Stats.updateOne({ coin: coin }, {
        network_last_updated: param.network_last_updated
      }, function () {
        return cb(true);
      });
    } else if (param.richlist_last_updated) {
      // update richlist last updated date
      Stats.updateOne({ coin: coin }, {
        richlist_last_updated: param.richlist_last_updated
      }, function () {
        return cb(true);
      });
    } else if (param.markets_last_updated) {
      // update markets last updated date
      Stats.updateOne({ coin: coin }, {
        markets_last_updated: param.markets_last_updated
      }, function () {
        return cb(true);
      });
    } else {
      // invalid option
      return cb(false);
    }
  },

  populate_claim_address_names: function(tx, cb) {
    var addresses = [];

    // loop through vin addresses
    tx.vin.forEach(function (vin) {
      // check if this address already exists
      if (addresses.indexOf(vin.addresses) == -1) {
        // add address to array
        addresses.push(vin.addresses);
      }
    });

    // loop through vout addresses
    tx.vout.forEach(function (vout) {
      // check if this address already exists
      if (addresses.indexOf(vout.addresses) == -1) {
        // add address to array
        addresses.push(vout.addresses);
      }
    });

    // loop through address array
    lib.syncLoop(addresses.length, function (loop) {
      var a = loop.iteration();

      module.exports.get_address(addresses[a], false, function(address) {
        if (address && address.name != null && address.name != '') {
          // look for address in vin
          for (v = 0; v < tx.vin.length; v++) {
            // check if this is the correct address
            if (tx.vin[v].addresses == address.a_id) {
              // add claim name to array
              tx.vin[v]['claim_name'] = address.name;
            }
          }

          // look for address in vout
          for (v = 0; v < tx.vout.length; v++) {
            // check if this is the correct address
            if (tx.vout[v].addresses == address.a_id) {
              // add claim name to array
              tx.vout[v]['claim_name'] = address.name;
            }
          }
        }

        loop.next();
      });
    }, function() {
      // return modified tx object
      return cb(tx);
    });
  },

  get_network_chart_data: function(cb) {
    // lookup all network history data for populating network charts
    NetworkHistory.find().sort({blockindex: 1}).exec(function (err, data) {
      return cb(data);
    });
  },

  check_networkhistory: function(cb) {
    NetworkHistory.findOne({}, function(err, networkhistory) {
      if (networkhistory) {
        // collection has data
        // determine if the difficulty field exists
        check_rename_db_field(NetworkHistory, 'difficulty', 'difficulty_pow', function(renamed) {
          // determine if difficulty_pos field exists
          check_add_db_field(NetworkHistory, 'difficulty_pos', 0, function(exists) {
            return cb(true);
          });
        });
      } else
        return cb(false);
    });
  },

  initialize_data_startup: function(cb) {
    console.log('Initializing database.. Please wait...');

    // check if stats collection is initialized
    module.exports.check_stats(settings.coin.name, function(stats_exists) {
      var skip = true;

      // determine if stats collection already exists
      if (stats_exists == false) {
        console.log('No stats entry found. Creating new entry now..');
        skip = false;
      }

      // initialize the stats collection
      module.exports.create_stats(settings.coin.name, skip, function() {
        // check and initialize the markets collection
        init_markets(function() {
          // add new field(s) to tx collection if missing
          module.exports.check_txes(function(txes_exists) {
            // add new field(s) to masternode collection if missing
            module.exports.check_masternodes(function(masternodes_exists) {
              // add new field(s) and/or rename old field(s) in networkhistory collection if applicable
              module.exports.check_networkhistory(function(networkhistory_exists) {
                // check if richlist collection is initialized
                module.exports.check_richlist(settings.coin.name, function(richlist_exists) {
                  skip = true;

                  // determine if richlist collection already exists
                  if (richlist_exists == false) {
                    console.log('No richlist entry found. Creating new entry now..');
                    skip = false;
                  }

                  // initialize the richlist collection
                  module.exports.create_richlist(settings.coin.name, skip, function() {
                    // check and initialize the heavycoin collection
                    init_heavy(function() {
                      // finished initializing startup data
                      console.log('Database initialization complete');
                      return cb();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  },

  remove_sync_message: function() {
    var filePath = './tmp/show_sync_message.tmp';

    // Check if the show sync stub file exists
    if (fs.existsSync(filePath)) {
      // File exists, so delete it now
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.log(err);
      }
    }
  },

  save_tx: function(txid, blockheight, cb) {
    lib.get_rawtransaction(txid, function(tx) {
      if (tx && tx != 'There was an error. Check your console.') {
        lib.prepare_vin(tx, function(vin, tx_type_vin) {
          lib.prepare_vout(tx.vout, txid, vin, ((!settings.blockchain_specific.zksnarks.enabled || typeof tx.vjoinsplit === 'undefined' || tx.vjoinsplit == null) ? [] : tx.vjoinsplit), function(vout, nvin, tx_type_vout) {
            lib.syncLoop(vin.length, function (loop) {
              var i = loop.iteration();

              // check if address is inside an array
              if (Array.isArray(nvin[i].addresses)) {
                // extract the address
                nvin[i].addresses = nvin[i].addresses[0];
              }

              update_address(nvin[i].addresses, blockheight, txid, nvin[i].amount, 'vin', function() {
                loop.next();
              });
            }, function() {
              lib.syncLoop(vout.length, function (subloop) {
                var t = subloop.iteration();

                // check if address is inside an array
                if (Array.isArray(vout[t].addresses)) {
                  // extract the address
                  vout[t].addresses = vout[t].addresses[0];
                }

                if (vout[t].addresses) {
                  update_address(vout[t].addresses, blockheight, txid, vout[t].amount, 'vout', function() {
                    subloop.next();
                  });
                } else
                  subloop.next();
              }, function() {
                lib.calculate_total(vout, function(total) {
                  var op_return = null;
                  // check if the op_return value should be decoded and saved
                  if (settings.transaction_page.show_op_return) {
                    // loop through vout to find the op_return value
                    tx.vout.forEach(function (vout_data) {
                      // check if the op_return value exists
                      if (vout_data.scriptPubKey != null && vout_data.scriptPubKey.asm != null && vout_data.scriptPubKey.asm.indexOf('OP_RETURN') > -1) {
                        // decode the op_return value
                        op_return = hex_to_ascii(vout_data.scriptPubKey.asm.replace('OP_RETURN', '').trim());
                      }
                    });
                  }

                  var newTx = new Tx({
                    txid: tx.txid,
                    vin: nvin,
                    vout: vout,
                    total: total.toFixed(8),
                    timestamp: tx.time,
                    blockhash: tx.blockhash,
                    blockindex: blockheight,
                    tx_type: (tx_type_vout == null ? tx_type_vin : tx_type_vout),
                    op_return: op_return
                  });

                  newTx.save(function(err) {
                    if (err)
                      return cb(err, false);
                    else
                      return cb(null, vout.length > 0);
                  });
                });
              });
            });
          });
        });
      } else
        return cb('tx not found: ' + txid, false);
    });
  },

  fs: fs
};