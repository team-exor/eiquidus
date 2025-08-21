const mongoose = require('mongoose');
const Stats = require('../models/stats');
const Markets = require('../models/markets');
const Masternode = require('../models/masternode');
const Address = require('../models/address');
const AddressTx = require('../models/addresstx');
const Tx = require('../models/tx');
const Orphans = require('../models/orphans');
const Richlist = require('../models/richlist');
const Peers = require('../models/peers');
const Heavy = require('../models/heavy');
const NetworkHistory = require('../models/networkhistory');
const ClaimAddress = require('../models/claimaddress');
const lib = require('./explorer');
const settings = require('./settings');
const fs = require('fs');
const async = require('async');

function find_address(hash, caseSensitive, cb) {
  if (caseSensitive) {
    // faster search but only matches exact string including case
    Address.findOne({a_id: hash}).then((address) => {
      if (address)
        return cb(address);
      else
        return cb();
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  } else {
    // slower search but matches exact string ignoring case
    Address.findOne({a_id: {$regex: '^' + hash + '$', $options: 'i'}}).then((address) => {
      if (address)
        return cb(address);
      else
        return cb();
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  }
}

function find_claim_name(hash, cb) {
  ClaimAddress.findOne({a_id: hash}).then((claim_address) => {
    if (claim_address)
      return cb(claim_address.claim_name);
    else
      return cb();
  }).catch((err) => {
    console.log(err);
    return cb();
  });
}

function find_richlist(coin, cb) {
  Richlist.findOne({coin: coin}).then((richlist) => {
    if (richlist)
      return cb(richlist);
    else
      return cb();
  }).catch((err) => {
    console.log(err);
    return cb();
  });
}

function find_tx(txid, cb) {
  Tx.findOne({txid: txid}).then((tx) => {
    if (tx)
      return cb(tx);
    else
      return cb(null);
  }).catch((err) => {
    console.log(err);
    return cb(null);
  });
}

function get_market_data(market, coin_symbol, pair_symbol, cb) {
  if (fs.existsSync('./lib/markets/' + market + '.js')) {
    exMarket = require('./markets/' + market);

    exMarket.get_data({coin: coin_symbol, exchange: pair_symbol, api_error_msg: settings.localization.mkt_unexpected_api_data}, function(err, obj) {
      return cb(err, obj);
    });
  } else
    return cb(null);
}

function check_add_db_field(model_obj, field_name, default_value, cb) {
  // determine if a particular field exists in a db collection
  model_obj.findOne({[field_name]: {$exists: false}}).then((model_data) => {
    // check if field exists
    if (model_data) {
      // add field to all documents in the collection
      model_obj.updateMany({}, {
        $set: { [field_name]: default_value }
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else
      return cb(false);
  }).catch((err) => {
    console.log(err);
    return cb(false);
  });
}

function check_rename_db_field(model_obj, old_field_name, new_field_name, cb) {
  // determine if a particular field exists in a db collection
  model_obj.findOne({[old_field_name]: {$exists: false}}).then((model_data) => {
    // check if old field exists
    if (model_data) {
      // rename field
      model_obj.updateMany({}, {
        $rename: { [old_field_name]: new_field_name }
      }, { multi: true, strict: false }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else
      return cb(false);
  }).catch((err) => {
    console.log(err);
    return cb(false);
  });
}

function check_remove_db_field(model_obj, field_name, cb) {
  // determine if a particular field exists in a db collection
  model_obj.findOne({[field_name]: {$exists: true}}).then((model_data) => {
    // check if field exists
    if (model_data) {
      // remove field
      model_obj.updateMany({}, {
        $unset: { [field_name]: 1 }
      }, { multi: true, strict: false }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else
      return cb(false);
  }).catch((err) => {
    console.log(err);
    return cb(false);
  });
}

function init_markets(cb) {
  let installed_markets = [];

  // check if markets/exchanges feature is enabled
  if (settings.markets_page.enabled == true) {
    let marketCounter = 0;

    // loop through and test all exchanges defined in the settings.json file
    Object.keys(settings.markets_page.exchanges).forEach(function (key, index, map) {
      // check if market is enabled via settings
      if (settings.markets_page.exchanges[key].enabled == true) {
        // check if exchange is installed/supported
        if (module.exports.fs.existsSync('./lib/markets/' + key + '.js')) {
          // check if there are any trading pairs
          if (settings.markets_page.exchanges[key].trading_pairs.length > 0) {
            let pairCounter = 0;

            // loop through all trading pairs
            settings.markets_page.exchanges[key].trading_pairs.forEach(function (pair_key, pair_index, pair_map) {
              // split the pair data
              let split_pair = pair_key.toUpperCase().split('/');

              // check if this is a valid trading pair
              if (split_pair.length == 2) {
                // add this pair to the list of installed markets
                installed_markets.push({
                  market: key,
                  coin_symbol: split_pair[0],
                  pair_symbol: split_pair[1]
                });

                // lookup the exchange in the market collection
                module.exports.check_market(key, split_pair[0], split_pair[1], function(market, exists) {
                  // check if exchange trading pair exists in the market collection
                  if (!exists) {
                    // exchange doesn't exist in the market collection so add a default definition now
                    console.log(`${settings.localization.creating_initial_entry.replace('{1}', `${market}[${split_pair[0]}/${split_pair[1]}]`)}.. ${settings.localization.please_wait}..`);

                    module.exports.create_market(split_pair[0], split_pair[1], market, function() {
                      pairCounter++;

                      // check if all pairs have been tested
                      if (pairCounter == settings.markets_page.exchanges[key].trading_pairs.length)
                        marketCounter++;

                      // check if all exchanges have been tested
                      if (marketCounter == Object.keys(settings.markets_page.exchanges).length) {
                        // finished initializing markets
                        return cb(installed_markets);
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
                    return cb(installed_markets);
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
      } else
        marketCounter++;
    });

    // check if all exchanges have been tested
    if (marketCounter == Object.keys(settings.markets_page.exchanges).length) {
      // finished initializing markets
      return cb(installed_markets);
    }
  } else
    return cb(installed_markets);
}

function remove_inactive_markets(installed_markets, cb) {
  // lookup the list of markets in the database collection
  Markets.find({}).then((db_markets) => {
    // check if the database has any markets installed
    if (db_markets != null && db_markets.length > 0) {
      // loop through the list of markets in the database
      async.eachSeries(db_markets, function(current_market, market_loop) {
        // check if this market is installed
        if (installed_markets.findIndex(x => x.market.toUpperCase() == current_market.market.toUpperCase() && x.coin_symbol.toUpperCase() == current_market.coin_symbol.toUpperCase() && x.pair_symbol.toUpperCase() == current_market.pair_symbol.toUpperCase()) == -1) {
          // remove this market from the database because it is not installed or active
          Markets.deleteOne({market: current_market.market, coin_symbol: current_market.coin_symbol, pair_symbol: current_market.pair_symbol}).then(() => {
            // move to the next market record
            market_loop();
          }).catch((err) => {
            console.log(err);

            // move to the next market record
            market_loop();
          });
        } else {
          // move to the next market record
          market_loop();
        }
      }, function() {
        // finished removing inactive markets
        return cb();
      });
    } else
      return cb();
  }).catch((err) => {
    console.log(err);
    return cb();
  });
}

function init_heavy(cb) {
  if (settings.blockchain_specific.heavycoin.enabled == true) {
    module.exports.check_heavy(settings.coin.name, function(exists) {
      if (exists == false) {
        console.log(`${settings.localization.creating_initial_entry.replace('{1}', 'heavycoin')}.. ${settings.localization.please_wait}..`);
        module.exports.create_heavy(settings.coin.name, function() {
          return cb();
        });
      } else
        return cb();
    });
  } else
    return cb();
}

function init_claimaddress(coin, cb) {
  // first, get the stats data
  Stats.findOne({coin: coin}).then((stats) => {
    let newer_claim_address = false;

    // check if stats were found and the claim address data was already moved to the new collection
    if (stats && stats.newer_claim_address != null && stats.newer_claim_address == true)
      newer_claim_address = true;

    // check if the claim address data should be moved to a new collection
    if (!newer_claim_address) {
      // find all addresses with a custom claim address name
      Address.find({$and: [{'name': {$ne: ''}}, {'name': {$ne: null}}]}).exec().then((addresses) => {
        // loop through the claimed addresses
        async.eachSeries(addresses, function(current_address, address_loop) {
          // create a new claimaddress record
          const claim_address = new ClaimAddress({
            a_id: current_address.a_id,
            claim_name: current_address.name
          });

          // add new claim address to collection
          claim_address.save().then(() => {
            address_loop();
          }).catch((err) => {
            console.log(err);
            address_loop();
          });
        }, function() {
          // finished moving all claimed address data to the new collection
          // remove the name field from the address collection to reclaim disk space
          check_remove_db_field(Address, 'name', function(removed) {
            // update the stats data to prevent this one-time process from happening again in the future
            Stats.updateOne({coin: coin}, {newer_claim_address: true}).then(() => {
              return cb(true);
            }).catch((err) => {
              console.log(err);
              return cb(false);
            });
          });
        });
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else
      return cb(true);
  }).catch((err) => {
    console.log(err);
    return cb(false);
  });
}

function init_plugins(coin, cb) {
  // check if there are any defined plugins in the settings
  if (settings.plugins.allowed_plugins != null && settings.plugins.allowed_plugins.length > 0) {
    let checkedPlugins = 0;

    // loop through all plugins defined in the settings
    settings.plugins.allowed_plugins.forEach(function (plugin) {
      // check if this plugin is enabled
      if (!plugin.enabled) {
        checkedPlugins++;

        if (checkedPlugins == settings.plugins.allowed_plugins.length)
          return cb();
      } else {
        const pluginName = (plugin.plugin_name == null ? '' : plugin.plugin_name);

        // check if the plugin exists in the plugins directory
        if (!fs.existsSync(`./plugins/${pluginName}`)) {
          console.log(`WARNING: Plugin '${pluginName}' is not installed in the plugins directory`);

          checkedPlugins++;

          if (checkedPlugins == settings.plugins.allowed_plugins.length)
            return cb();
        } else {
          // check if the plugin's server_functions file exists
          if (!fs.existsSync(`./plugins/${pluginName}/lib/server_functions.js`)) {
            console.log(`WARNING: Plugin '${pluginName}' is missing the /lib/server_functions.js file`);

            checkedPlugins++;

            if (checkedPlugins == settings.plugins.allowed_plugins.length)
              return cb();
          } else {
            // load the server_functions.js file from the plugin
            const serverFunctions = require(`../plugins/${pluginName}/lib/server_functions`);

            // check if the plugin_load function exists
            if (typeof serverFunctions.plugin_load !== 'function') {
              console.log(`WARNING: Plugin '${pluginName}' is missing the plugin_load function`);

              checkedPlugins++;

              if (checkedPlugins == settings.plugins.allowed_plugins.length)
                return cb();
            } else {
              // call the plugin_load function to initialize the plugin
              serverFunctions.plugin_load(coin, function() {
                checkedPlugins++;

                if (checkedPlugins == settings.plugins.allowed_plugins.length)
                  return cb();
              });
            }
          }
        }
      }
    });
  } else
    return cb();
}

// find masternode by txid and 
function find_masternode(txhash, addr, cb) {
  Masternode.findOne({ txhash: txhash, addr: addr }).then((masternode) => {
    if (masternode)
      return cb(masternode);
    else
      return cb(null);
  }).catch((err) => {
    console.log(err);
    return cb(null);
  });
}

function after_update_claim_name(hash, claim_name, cb) {
  // update claim name in richlist
  module.exports.update_richlist_claim_name(hash, claim_name, function() {
    // update claim name in masternode list
    module.exports.update_masternode_claim_name(hash, claim_name, function() {
      return cb();
    });
  });
}

function get_extracted_by_addresses(show_extracted_by, internal, tx, cb) {
  // check if the extracted by addresses should be found
  if (show_extracted_by == true) {
    // check if this is a coinbase tx
    if (
      tx != null &&
      tx.vout != null &&
      (
        tx.vin == null ||
        tx.vin.length === 0 ||
        (
          tx.vin.length === 1 &&
          tx.vin[0].addresses === 'coinbase' &&
          tx.vin[0].amount != 0
        )
      )
    ) {
      // get a list of all the block reward addresses
      const extracted_by_addresses = tx.vout.map(v => v.addresses);

      // check if this is an internal call which requires an additional lookup on claim names
      if (internal) {
        // add claim name data to the array
        module.exports.get_extracted_by_claim_names(extracted_by_addresses, function(updated_extracted_by_addresses) {
          return cb(updated_extracted_by_addresses);
        });
      } else {
        // return the extracted by addresses without looking up claim name data
        return cb(extracted_by_addresses);
      }
    } else {
      // no extracted by addresses for this tx
      return cb([]);
    }
  } else {
    // extracted by addresses are not enabled
    return cb([]);
  }
}

module.exports = {
  // initialize DB
  connect: function(database, cb) {
    mongoose.set('strictQuery', true);

    if (database == null)
      database = 'mongodb://' + encodeURIComponent(settings.dbsettings.user) +
        ':' + encodeURIComponent(settings.dbsettings.password) +
        '@' + settings.dbsettings.address +
        ':' + settings.dbsettings.port +
        '/' + settings.dbsettings.database;

    mongoose.connect(database).then(() => {
      return cb();
    }).catch((err) => {
      console.log('Error: Unable to connect to database: %s', err);
      process.exit(999);
    });
  },

  check_show_sync_message: function() {
    return fs.existsSync('./tmp/show_sync_message.tmp');
  },

  update_claim_name: function(hash, claim_name, cb) {
    // check if the address has received coins before by looking up the address in the local database
    module.exports.get_address(hash, false, function(address) {
      // check if the address was found in the local database
      if (address) {
        // check if the claim name is being removed
        if (claim_name == null || claim_name == '') {
          // remove the claim name
          ClaimAddress.findOneAndDelete({a_id: hash}).then(() => {
            // run processes after the claim name has been updated
            after_update_claim_name(hash, claim_name, function() {
              return cb('');
            });
          }).catch((err) => {
            console.log(err);
            return cb(err);
          });
        } else {
          // add or update the claim name
          ClaimAddress.updateOne({a_id: hash}, {
            a_id: hash,
            claim_name: claim_name
          }, {
            upsert: true
          }).then(() => {
            // run processes after the claim name has been updated
            after_update_claim_name(hash, claim_name, function() {
              return cb('');
            });
          }).catch((err) => {
            console.log(err);
            return cb(err);
          });
        }
      } else
        return cb('no_address');
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
          }).then(() => {
            // finished updating the claim label
            return cb('');
          }).catch((err) => {
            console.log(err);
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
          if (masternodes[m].addr == hash) {
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
          }).then(() => {
            // finished updating the claim label
            return cb('');
          }).catch((err) => {
            console.log(err);
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
    Tx.findOne({}).then((tx) => {
      if (tx) {
        // collection has data
        // determine if tx_type field exists
        check_add_db_field(Tx, 'tx_type', null, function() {
          // determine if op_return field exists
          check_add_db_field(Tx, 'op_return', null, function() {
            // determine if algo field exists
            check_add_db_field(Tx, 'algo', null, function() {
              return cb(true);
            });
          });
        });
      } else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  check_stats: function(coin, cb) {
    Stats.findOne({coin: coin}).then((stats) => {
      if (stats) {
        // collection has data
        // determine if last_usd_price field exists
        check_add_db_field(Stats, 'last_usd_price', 0, function(exists) {
          // determine if orphan_index field exists
          check_add_db_field(Stats, 'orphan_index', 0, function(exists) {
            // determine if orphan_current field exists
            check_add_db_field(Stats, 'orphan_current', 0, function(exists) {
              // determine if orphan_current field exists
              check_add_db_field(Stats, 'address_count', 0, function(exists) {
                return cb(true);
              });
            });
          });
        });
      } else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  get_stats: function(coin, cb) {
    Stats.findOne({coin: coin}).then((stats) => {
      if (stats)
        return cb(stats);
      else
        return cb(null);
    }).catch((err) => {
      console.log(err);
      return cb(null);
    });
  },

  create_stats: function(coin, skip, cb) {
    // check if stats need to be created
    if (!skip) {
      var newStats = new Stats({
        coin: coin,
        last: 0,
        orphan_index: 0,
        orphan_current: 0,
        newer_claim_address: true
      });

      newStats.save().then(() => {
        console.log(`${settings.localization.entry_created_successfully.replace('{1}', 'stats').replace('{2}', coin)}`);
        return cb();
      }).catch((err) => {
        console.log(err);
        return cb();
      });
    } else
      return cb();
  },

  get_address: function(hash, caseSensitive, cb) {
    find_address(hash, caseSensitive, function(address) {
      return cb(address);
    });
  },

  get_claim_name: function(hash, cb) {
    find_claim_name(hash, function(claim_name) {
      return cb(claim_name);
    });
  },

  get_claim_names: function(hash_array, cb) {
    ClaimAddress.find({ a_id: { $in: hash_array } }).exec().then((claim_records) => {
      return cb(claim_records);
    }).catch((err) => {
      console.log(err);
      return cb([]);
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
      Address.aggregate([
        { $match: {
          a_id: { $nin: burn_addresses }
        }},
        { $sort: {received: -1} },
        { $limit: total_addresses },
        { $lookup:
          {
            from: "claimaddresses",
            localField: "a_id",
            foreignField: "a_id",
            as: "claim_name"
          }
        },
        { $unwind: { path: "$claim_name", preserveNullAndEmptyArrays: true } },
        {
          $addFields:
          {
            'claim_name': '$claim_name.claim_name'
          }
        },
        {
          $project:
          {
            "_id": 0,
            "__v": 0,
            "sent": 0
          }
        }
      ]).then((addresses) => {
        Richlist.updateOne({coin: settings.coin.name}, {
          received: addresses
        }).then(() => {
          return cb();
        }).catch((err) => {
          console.log(err);
          return cb();
        });
      }).catch((err) => {
        console.log(err);
        return cb();
      });
    } else {
      // update 'balance' richlist data
      // check if burned addresses are in use and if it is necessary to track burned balances
      if (settings.richlist_page.burned_coins.addresses == null || settings.richlist_page.burned_coins.addresses.length == 0 || !settings.richlist_page.burned_coins.include_burned_coins_in_distribution) {
        // update 'balance' richlist data by filtering burned coin addresses immidiately
        Address.aggregate([
          { $match: {
            a_id: { $nin: burn_addresses }
          }},
          { $sort: {balance: -1} },
          { $limit: total_addresses },
          { $lookup:
            {
              from: "claimaddresses",
              localField: "a_id",
              foreignField: "a_id",
              as: "claim_name"
            }
          },
          { $unwind: { path: "$claim_name", preserveNullAndEmptyArrays: true } },
          {
            $addFields:
            {
              'claim_name': '$claim_name.claim_name'
            }
          },
          {
            $project:
            {
              "_id": 0,
              "__v": 0,
              "sent": 0
            }
          }
        ]).then((addresses) => {
          Richlist.updateOne({coin: settings.coin.name}, {
            balance: addresses
          }).then(() => {
            return cb();
          }).catch((err) => {
            console.log(err);
            return cb();
          });
        }).catch((err) => {
          console.log(err);
          return cb();
        });
      } else {
        // do not omit burned addresses from database query. instead, increase the limit of returned addresses and manually remove each burned address that made it into the rich list after recording the burned balance
        Address.aggregate([
          { $sort: {balance: -1} },
          { $limit: total_addresses + burn_addresses.length },
          { $lookup:
            {
              from: "claimaddresses",
              localField: "a_id",
              foreignField: "a_id",
              as: "claim_name"
            }
          },
          { $unwind: { path: "$claim_name", preserveNullAndEmptyArrays: true } },
          {
            $addFields:
            {
              'claim_name': '$claim_name.claim_name'
            }
          },
          {
            $project:
            {
              "_id": 0,
              "__v": 0,
              "sent": 0
            }
          }
        ]).then((addresses) => {
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
          }).then(() => {
            return cb();
          }).catch((err) => {
            console.log(err);
            return cb();
          });
        }).catch((err) => {
          console.log(err);
          return cb();
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
    let txs = [];

    async.eachSeries(block.tx, function(current_tx, loop) {
      find_tx(current_tx, function(tx) {
        if (tx) {
          // add tx to the list
          txs.push(tx);
        }

        // move to next tx
        loop();
      });
    }, function() {
      return cb(txs);
    });
  },

  get_last_txs: function(start, length, min, internal, cb) {
    this.get_last_txs_ajax(start, length, min, function(txs, count) {
      const show_extracted_by = (internal ? settings.index_page.show_extracted_by : settings.api_page.public_apis.ext.getlasttxs.show_extracted_by);
      let data = [];

      async.timesSeries(txs.length, function(i, loop) {
        // get the extracted by address data for this tx
        get_extracted_by_addresses(show_extracted_by, internal, txs[i], function(extracted_by_addresses) {
          if (internal) {
            let row = [];

            row.push(txs[i].blockindex);
            row.push(txs[i].blockhash);
            row.push(txs[i].txid);
            row.push(txs[i].vout.length);
            row.push((txs[i].total / 100000000));
            row.push(txs[i].timestamp);

            if (settings.block_page.multi_algorithm.show_algo == true)
              row.push('algo:' + (txs[i].algo == null ? '' : txs[i].algo));

            if (show_extracted_by == true)
              row.push('extracted_by:' + JSON.stringify(extracted_by_addresses));
            
            data.push(row);
            loop();
          } else {
            let data_entry = {
              blockindex: txs[i].blockindex,
              blockhash: txs[i].blockhash,
              txid: txs[i].txid,
              recipients: txs[i].vout.length,
              amount: (txs[i].total / 100000000),
              timestamp: txs[i].timestamp
            };

            if (settings.block_page.multi_algorithm.show_algo == true)
              data_entry.algo = (txs[i].algo == null ? '' : txs[i].algo);

            if (show_extracted_by == true)
              data_entry.extracted_by = extracted_by_addresses;

            data.push(data_entry);
            loop();
          }
        });
      }, function() {
        return cb(data, count);
      });
    });
  },

  get_last_txs_ajax: function(start, length, min, cb) {
    // check if min is greater than zero
    if (min > 0) {
      // min is greater than zero which means we must pull record count from the txes collection
      Tx.find({'total': {$gte: min}}).countDocuments().then((count) => {
        // get last transactions where there is at least 1 vout
        Tx.find({'total': {$gte: min}, 'vout': { $gte: { $size: 1 }}}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec().then((txs) => {
          return cb(txs, count);
        }).catch((err) => {
          return cb(err);
        });
      }).catch((err) => {
        return cb(err);
      });
    } else {
      // min is zero (shouldn't ever be negative) which means we must pull record count from the coinstats collection (pulling from txes could potentially take a long time because it would include coinbase txes)
      Stats.findOne({coin: settings.coin.name}).then((stats) => {
        // Get last transactions where there is at least 1 vout
        Tx.find({'total': {$gte: min}, 'vout': { $gte: { $size: 1 }}}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec().then((txs) => {
          return cb(txs, stats.txes);
        }).catch((err) => {
          return cb(err);
        });
      }).catch((err) => {
        return cb(err);
      });
    }
  },

  get_address_txs_ajax: function(hash, start, length, cb) {
    AddressTx.find({a_id: hash}).countDocuments().then((totalCount) => {
      AddressTx.aggregate([
        { $match: { a_id: hash } },
        { $sort: { blockindex: -1 } },
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
        { $sort: { blockindex: -1 } }
      ]).then((balance_sum) => {
        AddressTx.find({a_id: hash}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec().then((address_tx) => {
          let txs = [];
          let running_balance = (balance_sum.length > 0 ? balance_sum[0].balance : 0);

          async.eachSeries(address_tx, function(current_addresstx, loop) {
            find_tx(current_addresstx.txid, function(tx) {
              if (tx) {
                // set the balance for this tx
                tx.balance = running_balance;

                // add tx to list of txes
                txs.push(tx);

                // subtract from the running balance
                running_balance -= current_addresstx.amount;
              }

              // move to next address tx
              loop();
            });
          }, function () {
            return cb(txs, totalCount);
          });
        }).catch((err) => {
          return cb(err);
        });
      }).catch((err) => {
        return cb(err);
      });
    }).catch((err) => {
      return cb(err);
    });
  },

  create_market: function(coin_symbol, pair_symbol, market, cb) {
    var newMarkets = new Markets({
      market: market,
      coin_symbol: coin_symbol,
      pair_symbol: pair_symbol
    });

    newMarkets.save().then(() => {
      console.log(`${settings.localization.entry_created_successfully.replace('{1}', 'market').replace('{2}', `${market}[${coin_symbol}/${pair_symbol}]`)}`);
      return cb();
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  },

  // check if market data exists for a given market and trading pair
  check_market: function(market, coin_symbol, pair_symbol, cb) {
    Markets.findOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}).then((exists) => {
      return cb(market, exists);
    }).catch((err) => {
      console.log(err);
      return cb(market, false);
    });
  },

  // gets market data for given market and trading pair
  get_market: function(market, coin_symbol, pair_symbol, cb) {
    Markets.findOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}).then((data) => {
      if (data)
        return cb(data);
      else
        return cb(null);
    }).catch((err) => {
      console.log(err);
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

      newRichlist.save().then(() => {
        console.log(`${settings.localization.entry_created_successfully.replace('{1}', 'richlist').replace('{2}', coin)}`);
        return cb();
      }).catch((err) => {
        console.log(err);
        return cb();
      });
    } else
      return cb();
  },

  // drops richlist data for given coin
  delete_richlist: function(coin, cb) {
    Richlist.findOneAndDelete({coin: coin}).then((exists) => {
      if (exists)
        return cb(true);
      else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  // checks richlist data exists for given coin
  check_richlist: function(coin, cb) {
    Richlist.findOne({coin: coin}).then((exists) => {
      if (exists)
        return cb(true);
      else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  create_heavy: function(coin, cb) {
    var newHeavy = new Heavy({
      coin: coin
    });

    newHeavy.save().then(() => {
      console.log(`${settings.localization.entry_created_successfully.replace('{1}', 'heavycoin').replace('{2}', coin)}`);
      return cb();
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  },

  check_heavy: function(coin, cb) {
    Heavy.findOne({coin: coin}).then((exists) => {
      if (exists)
        return cb(true);
      else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  get_heavy: function(coin, cb) {
    Heavy.findOne({coin: coin}).then((heavy) => {
      if (heavy)
        return cb(heavy);
      else
        return cb(null);
    }).catch((err) => {
      console.log(err);
      return cb(null);
    });
  },

  get_distribution: function(richlist, stats, cb) {
    const distribution = {
      supply: stats.supply,
      t_1_25: {percent: 0, total: 0 },
      t_26_50: {percent: 0, total: 0 },
      t_51_75: {percent: 0, total: 0 },
      t_76_100: {percent: 0, total: 0 },
      t_101plus: {percent: 0, total: 0 }
    };

    async.timesSeries(richlist.balance.length, function(i, loop) {
      const percentage = ((richlist.balance[i].balance / 100000000) / stats.supply) * 100;

      if ((i + 1) <= 25) {
        distribution.t_1_25.percent = distribution.t_1_25.percent + percentage;
        distribution.t_1_25.total = distribution.t_1_25.total + (richlist.balance[i].balance / 100000000);
      }

      if ((i + 1) <= 50 && (i + 1) > 25) {
        distribution.t_26_50.percent = distribution.t_26_50.percent + percentage;
        distribution.t_26_50.total = distribution.t_26_50.total + (richlist.balance[i].balance / 100000000);
      }

      if ((i + 1) <= 75 && (i + 1) > 50) {
        distribution.t_51_75.percent = distribution.t_51_75.percent + percentage;
        distribution.t_51_75.total = distribution.t_51_75.total + (richlist.balance[i].balance / 100000000);
      }

      if ((i + 1) <= 100 && (i + 1) > 75) {
        distribution.t_76_100.percent = distribution.t_76_100.percent + percentage;
        distribution.t_76_100.total = distribution.t_76_100.total + (richlist.balance[i].balance / 100000000);
      }

      loop();
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
    lib.get_maxmoney(function(maxmoney) {
      lib.get_maxvote(function(maxvote) {
        lib.get_vote(function(vote) {
          lib.get_phase(function(phase) {
            lib.get_reward(function(reward) {
              module.exports.get_stats(settings.coin.name, function(stats) {
                lib.get_estnext(function(estnext) {
                  lib.get_nextin(function(nextin) {
                    let newVotes = [];

                    async.timesSeries(count, function(i, loop) {
                      lib.get_blockhash(height - i, function(hash) {
                        lib.get_block(hash, function(block) {
                          newVotes.push({ count: height - i, reward: block.reward, vote: (block && block.vote ? block.vote : 0) });
                          loop();
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
                      }).then(() => {
                        // update reward_last_updated value
                        module.exports.update_last_updated_stats(settings.coin.name, { reward_last_updated: Math.floor(new Date() / 1000) }, function (update_success) {
                          console.log('Heavycoin update complete');
                          return cb();
                        });
                      }).catch((err) => {
                        console.log(err);
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
  },

  // updates network history (nethash and difficulty) data
  // height: current block height
  update_network_history: function(height, cb) {
    // lookup network history data for this block height
    NetworkHistory.findOne({blockindex: height}).then((network_hist) => {
      // check if there is already network history data for this block height
      if (!network_hist) {
        // lookup network hashrate
        lib.get_hashrate(function(hashrate) {
          // lookup network difficulty
          lib.get_difficulty(function(difficulty) {
            // lookup the block hash
            lib.get_blockhash(height, function(blockhash) {
              if (blockhash) {
                // lookup block data
                lib.get_block(blockhash, function(block) {
                  if (block) {
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
                      timestamp: block.time
                    });

                    // save the new network history record
                    newNetworkHistory.save().then(() => {
                      // read maximum allowed records from settings
                      const max_records = settings.network_history.max_saved_records;

                      // check if the max allowed records is set
                      if (max_records == 0) {
                        // read maximum hours from settings
                        const max_hours = settings.network_history.max_hours;

                        // calculate the cutoff timestamp value
                        const timestampThreshold = Math.floor(Date.now() / 1000) - max_hours * 60 * 60;

                        // delete all network history records that are older than the max hours setting
                        NetworkHistory.deleteMany({ timestamp: { $lt: timestampThreshold } }).then(delete_result => {
                          console.log('Network history update complete');
                          return cb();
                        }).catch(err => {
                          console.log(err);
                          return cb();
                        });
                      } else {
                        // prune network history records to keep collection small and quick to access
                        NetworkHistory.find().sort({ blockindex: -1 }).skip(max_records).select('blockindex').exec().then((records) => {
                          // check if any records need to be deleted
                          if (records.length > 0) {
                            // create a list of the oldest network history ids that will be deleted
                            const ids = records.map((doc) => doc.blockindex);

                            // delete old network history records
                            NetworkHistory.deleteMany({blockindex: {$in: ids}}).then(() => {
                              console.log('Network history update complete');
                              return cb();
                            }).catch((err) => {
                              console.log(err);
                              return cb();
                            });
                          } else {
                            // no records need to be deleted
                            console.log('Network history update complete');
                            return cb();
                          }
                        }).catch((err) => {
                          console.log(err);
                          return cb();
                        });
                      }
                    }).catch((err) => {
                      console.log('Error updating network history: ' + err);
                      return cb();
                    });
                  } else {
                    console.log(`Error updating network history: Cannot find block with hash ${blockhash}`);
                    return cb();
                  }
                });
              } else {
                console.log(`Error updating network history: Cannot find block hash with height ${height}`);
                return cb();
              }
            });
          });
        });
      } else {
        // skip saving network history data when the block hasn't moved since saving last time
        return cb();
      }
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  },

  // updates market data for given market; called by sync.js
  update_markets_db: function(market, coin_symbol, pair_symbol, cb) {
    // check if market exists
    if (fs.existsSync('./lib/markets/' + market + '.js')) {
      get_market_data(market, coin_symbol, pair_symbol, function (market_err, obj) {
        // check if there was an error with getting market data
        if (market_err == null) {
          // update the market collection for the current market and trading pair combination
          Markets.updateOne({market: market, coin_symbol: coin_symbol, pair_symbol: pair_symbol}, {
            chartdata: JSON.stringify(obj.chartdata),
            buys: obj.buys,
            sells: obj.sells,
            history: obj.trades,
            summary: obj.stats
          }).then(() => {
            // finished updating market data
            return cb(null, obj.stats.last);
          }).catch((err) => {
            return cb(err, null);
          });
        } else {
          // an error occurred with getting market data so return the error msg
          return cb(market_err, null);
        }
      });
    } else {
      // market does not exist
      return cb('market is not installed', null);
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
          Stats.findOne({coin: coin}).then((stats) => {
            if (stats) {
              Stats.updateOne({coin: coin}, {
                coin: coin,
                count : count,
                supply: (supply ? supply : 0),
                connections: (connections ? connections : 0)
              }).then(() => {
                return cb({
                  coin: coin,
                  count : count,
                  supply: (supply ? supply : 0),
                  connections: (connections ? connections : 0),
                  last: (stats.last ? stats.last : 0),
                  txes: (stats.txes ? stats.txes : 0),
                  orphan_index: (stats.orphan_index ? stats.orphan_index : 0),
                  orphan_current: (stats.orphan_current ? stats.orphan_current : 0)
                });
              }).catch((err) => {
                console.log("Error during stats update: %s", err);
                return cb(false);
              });
            } else {
              console.log("Error during stats update: %s", (err ? err : 'Cannot find stats collection'));
              return cb(false);
            }
          }).catch((err) => {
            console.log(err);
            return cb(false);
          });
        });
      });
    });
  },

  find_peer: function(address, port, cb) {
    Peers.findOne({address: address, port: port}).then((peer) => {
      if (peer)
        return cb(peer);
      else
        return cb (null)
    }).catch((err) => {
      console.log(err);
      return cb(null);
    });
  },

  get_peers: function(connectionPeersOnly, cb) {
    const conPromise = settings.network_page.connections_table.enabled
      ? Peers.find({ table_type: 'C' })
             .select('-_id -__v')
             .sort({ ipv6: 1, address: 1, protocol: -1, port: 1 })
             .lean()
             .exec()
      : Promise.resolve([]);

    const addPromise = settings.network_page.addnodes_table.enabled && !connectionPeersOnly
      ? Peers.find({ table_type: 'A' })
             .select('-_id -__v')
             .sort({ ipv6: 1, address: 1, protocol: -1, port: 1 })
             .lean()
             .exec()
      : Promise.resolve([]);

    const onePromise = settings.network_page.onetry_table.enabled && !connectionPeersOnly
      ? Peers.find({ table_type: 'O' })
             .select('-_id -__v')
             .sort({ ipv6: 1, address: 1, protocol: -1, port: 1 })
             .lean()
             .exec()
      : Promise.resolve([]);

    Promise.all([conPromise, addPromise, onePromise])
      .then(([connection_peers, addnode_peers, onetry_peers]) => {
        return cb(connection_peers, addnode_peers, onetry_peers);
      })
      .catch(err => {
        console.log(err);
        return cb([], [], []);
      });
  },

  check_peers: function(cb) {
    Peers.findOne({}).then((peer) => {
      if (peer) {
        // collection has data
        // determine if table_type field exists
        check_add_db_field(Peers, 'table_type', 'C', function(table_type_exists) {
          // determine if ipv6 field exists
          check_add_db_field(Peers, 'ipv6', false, function(ipv6_exists) {
            // check if table_type or ipv6 were just added
            if (table_type_exists || ipv6_exists) {
              const filter = {
                $expr: {
                  $gt: [
                    { $strLenCP: '$address' }, // compute the length of address
                    15                         // compare > 15
                  ]
                }
              };

              // update peer records to set ipv6 properly for existing data
              Peers.updateMany(filter, { $set: { ipv6: true } }).then(() => {
                // ensure that peer indexes are created
                Peers.createIndexes().then(() => {
                  return cb(true);
                }).catch((err) => {
                  console.log(err);
                  return cb(false);
                });
              }).catch((err) => {
                console.log(err);
                return cb(false);
              });
            } else
              return cb(true);
          });
        });
      } else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  check_masternodes: function(cb) {
    Masternode.findOne({}).then((masternode) => {
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
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  // determine if masternode exists and save masternode to collection
  save_masternode: function (raw_masternode, object_key, cb) {
    let txhash = raw_masternode.txhash;
    let addr = raw_masternode.addr;

    if (txhash == null) {
      // try to use a different field for the txhash
      txhash = raw_masternode.proTxHash;
    }

    if (addr == null) {
      // try to use a different field for the addr
      addr = raw_masternode.payee;
    }

    // check if the txhash and addr values were found
    if (txhash == null && addr == null) {
      try {
        // attempt to parse out data separated by spaces
        // supported formats:
        // 1) status protocol pubkey lastseen activetime lastpaid lastpaidblock vin
        // 2) status protocol pubkey vin lastseen activetime lastpaid
        const parts = raw_masternode.trim().split(/\s+/);
        const result = {};

        parts.forEach((value, index) => {
          if (index == 0) {
            // always save the 1st value as the status
            result['status'] = value;
          } else if (index == 1) {
            // always save the 2nd value as the version
            result['version'] = parseInt(value);
          } else if (index == 2) {
            // always save the 3rd value as the addr
            result['addr'] = value;
          } else if (index == 3) {
            // determine if this is an ip address or lastseen time
            if (value.indexOf(':') > -1 || value.indexOf('.') > -1) {
              // this is an ip address
              result['address'] = value;
            } else if (Number.isInteger(Number(value))) {
              // this is a lastseen time value
              result['lastseen'] = parseInt(value);
            }
          } else if (index == 4) {
            // check if this is a number value
            if (Number.isInteger(Number(value))) {
              // determine if this is the lastseen or activetime
              if (result['lastseen'] == null) {
                // this must be lastseen since it has not yet been found
                result['lastseen'] = parseInt(value);
              } else {
                // lastseen was already found so this much be the activetime
                result['activetime'] = parseInt(value);
              }
            }
          } else if (index == 5) {
            // check if this is a number value
            if (Number.isInteger(Number(value))) {
              // determine if this is the activetime or lastpaid time
              if (result['activetime'] == null) {
                // this must be activetime since it has not yet been found
                result['activetime'] = parseInt(value);
              } else {
                // activetime was already found so this much be the lastpaid time
                result['lastpaid'] = parseInt(value);
              }
            }
          } else if (index == 6) {
            // check if this is a number value
            if (Number.isInteger(Number(value))) {
              // determine if this is the lastpaid time or lastpaidblock
              if (result['lastpaid'] == null) {
                // this must be lastpaid since it has not yet been found
                result['lastpaid'] = parseInt(value);
              } else {
                // lastpaid was already found so this much be the lastpaidblock
                result['lastpaidblock'] = parseInt(value);
              }
            }
          } else {
            // determine if this is an ip address
            if (value.indexOf(':') > -1 || value.indexOf('.') > -1) {
              // this is an ip address
              result['address'] = value;
            }
          }
        });

        // check if the object_key is set
        if (object_key != null) {
          // try to separate the txhash from the outidx
          const splitHash = object_key.split('-');

          result['txhash'] = splitHash[0];
          result['outidx'] = (splitHash.length > 1 ? parseInt(splitHash[1]) : -1);
        } else {
          result['txhash'] = "";
          result['outidx'] = -1;
        }

        // set the txhash and addr values
        txhash = result['txhash'];
        addr = result['addr'];

        // update the raw_masternode object
        raw_masternode = result;
      } catch {
        // do nothing as the masternode will already fail to be saved below
      }
    } else {
      // try to convert as many alternately named fields as possible so that there is only one set of fields to deal with

      if (raw_masternode.proTxHash != null) {
        raw_masternode.txhash = raw_masternode.proTxHash;
        delete raw_masternode.proTxHash;
      }

      if (raw_masternode.payee != null) {
        raw_masternode.addr = raw_masternode.payee;
        delete raw_masternode.payee;
      }

      if (raw_masternode.lastpaidtime != null) {
        raw_masternode.lastpaid = raw_masternode.lastpaidtime;
        delete raw_masternode.lastpaidtime;
      }

      if (raw_masternode.lastpaidtime != null) {
        raw_masternode.lastpaid = raw_masternode.lastpaidtime;
        delete raw_masternode.lastpaidtime;
      }
    }

    // lookup masternode in local collection
    find_masternode(txhash, addr, function (masternode) {
      // determine if the claim address feature is enabled
      if (settings.claim_address_page.enabled == true) {
        // claim address is enabled so lookup the address claim name
        find_claim_name(addr, function(claim_name) {
          if (claim_name != null && claim_name != '') {
            // save claim name to masternode obejct
            raw_masternode.claim_name = claim_name;
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
    if (masternode.txhash == null) {
      console.log('Masternode update error: Tx Hash is missing');
      return cb(false);
    } else {
      var mn = new Masternode({
        rank: masternode.rank,
        network: masternode.network,
        txhash: masternode.txhash,
        outidx: masternode.outidx,
        status: masternode.status,
        addr: masternode.addr,
        version: masternode.version,
        lastseen: (masternode.lastseen == null ? Math.floor(Date.now() / 1000) : masternode.lastseen),  // lastseen must have a value since masternodes are deleted based on the lastseen date being too old
        activetime: masternode.activetime,
        lastpaid: masternode.lastpaid,
        last_paid_block: masternode.lastpaidblock,
        ip_address: masternode.address,
        claim_name: (masternode.claim_name == null ? '' : masternode.claim_name)
      });

      if (add) {
        // add new masternode to collection
        mn.save().then(() => {
          return cb(true);
        }).catch((err) => {
          console.log(err);
          return cb(false);
        });
      } else {
        // update existing masternode in local collection
        Masternode.updateOne({ txhash: masternode.txhash }, masternode).then(() => {
          return cb(true);
        }).catch((err) => {
          console.log(err);
          return cb(false);
        });
      }
    }
  },

  // remove masternodes older than 24 hours
  remove_old_masternodes: function (cb) {
    Masternode.deleteMany({ lastseen: { $lte: (Math.floor(Date.now() / 1000) - 86400) } }).then(() => {
      return cb();
    }).catch((err) => {
      console.log(err);
      return cb();
    });
  },

  // get the list of masternodes from local collection
  get_masternodes: function (cb) {
    Masternode.find({}).then((masternodes) => {
      return cb(masternodes);
    }).catch((err) => {
      console.log(err);
      return cb([]);
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
    ]).then((data) => {
      return cb(data);
    }).catch((err) => {
      console.log(err);
      return cb(null);
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
    ]).then((data) => {
      return cb((data.length > 0 ? data[0].total / 100000000 : 0));
    }).catch((err) => {
      console.log(err);
      return cb(null);
    });
  },

  // updates last_updated stats; called by sync.js
  update_last_updated_stats: function (coin, param, cb) {
    if (param.blockchain_last_updated) {
      // update blockchain last updated date
      Stats.updateOne({ coin: coin }, {
        blockchain_last_updated: param.blockchain_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else if (param.reward_last_updated) {
      // update reward last updated date
      Stats.updateOne({ coin: coin }, {
        reward_last_updated: param.reward_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else if (param.masternodes_last_updated) {
      // update masternode last updated date
      Stats.updateOne({ coin: coin }, {
        masternodes_last_updated: param.masternodes_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else if (param.network_last_updated) {
      // update network last updated date
      Stats.updateOne({ coin: coin }, {
        network_last_updated: param.network_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else if (param.richlist_last_updated) {
      // update richlist last updated date
      Stats.updateOne({ coin: coin }, {
        richlist_last_updated: param.richlist_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else if (param.markets_last_updated) {
      // update markets last updated date
      Stats.updateOne({ coin: coin }, {
        markets_last_updated: param.markets_last_updated
      }).then(() => {
        return cb(true);
      }).catch((err) => {
        console.log(err);
        return cb(false);
      });
    } else {
      // invalid option
      return cb(false);
    }
  },

  populate_claim_address_names: function(tx, cb) {
    const addresses = [];

    // loop through vin addresses
    tx.vin.forEach(function(vin) {
      // check if this address already exists
      if (addresses.indexOf(vin.addresses) == -1) {
        // add address to array
        addresses.push(vin.addresses);
      }
    });

    // loop through vout addresses
    tx.vout.forEach(function(vout) {
      // check if this address already exists
      if (addresses.indexOf(vout.addresses) == -1) {
        // add address to array
        addresses.push(vout.addresses);
      }
    });

    // loop through address array
    async.eachSeries(addresses, function(current_address, loop) {
      module.exports.get_claim_name(current_address, function(claim_name) {
        if (claim_name != null && claim_name != '') {
          // look for address in vin
          for (let v = 0; v < tx.vin.length; v++) {
            // check if this is the correct address
            if (tx.vin[v].addresses == current_address) {
              // add claim name to array
              tx.vin[v]['claim_name'] = claim_name;
            }
          }

          // look for address in vout
          for (let v = 0; v < tx.vout.length; v++) {
            // check if this is the correct address
            if (tx.vout[v].addresses == current_address) {
              // add claim name to array
              tx.vout[v]['claim_name'] = claim_name;
            }
          }
        }

        loop();
      });
    }, function() {
      // return modified tx object
      return cb(tx);
    });
  },

  get_network_chart_data: function(cb) {
    // lookup all network history data for populating network charts
    NetworkHistory.find().sort({blockindex: 1}).exec().then((data) => {
      return cb(data);
    }).catch((err) => {
      console.log(err);
      return cb(null);
    });
  },

  check_networkhistory: function(cb) {
    NetworkHistory.findOne({}).then((networkhistory) => {
      if (networkhistory) {
        // collection has data
        // determine if the difficulty field exists
        check_rename_db_field(NetworkHistory, 'difficulty', 'difficulty_pow', function(renamed) {
          // determine if difficulty_pos field exists
          check_add_db_field(NetworkHistory, 'difficulty_pos', 0, function(exists) {
            // determine if timestamp field exists
            check_add_db_field(NetworkHistory, 'timestamp', 0, function(timestamp_exists) {
              return cb(true);
            });
          });
        });
      } else
        return cb(false);
    }).catch((err) => {
      console.log(err);
      return cb(false);
    });
  },

  initialize_data_startup: function(cb) {
    console.log(`${settings.localization.initializing_database}.. ${settings.localization.please_wait}..`);

    // check if stats collection is initialized
    module.exports.check_stats(settings.coin.name, function(stats_exists) {
      var skip = true;

      // determine if stats collection already exists
      if (stats_exists == false) {
        console.log(`${settings.localization.creating_initial_entry.replace('{1}', 'stats')}.. ${settings.localization.please_wait}..`);
        skip = false;
      }

      // initialize the stats collection
      module.exports.create_stats(settings.coin.name, skip, function() {
        // check and initialize the markets collection
        init_markets(function(installed_markets) {
          // remove inactive markets from the database collection
          remove_inactive_markets(installed_markets, function() {
            // add new field(s) to tx collection if missing
            module.exports.check_txes(function(txes_exists) {
              // add new field(s) to masternode collection if missing
              module.exports.check_masternodes(function(masternodes_exists) {
                // add new field(s) and/or rename old field(s) in networkhistory collection if applicable
                module.exports.check_networkhistory(function(networkhistory_exists) {
                  // add new field(s) to peers collection if missing
                  module.exports.check_peers(function(peers_exists) {
                    // check if richlist collection is initialized
                    module.exports.check_richlist(settings.coin.name, function(richlist_exists) {
                      skip = true;

                      // determine if richlist collection already exists
                      if (richlist_exists == false) {
                        console.log(`${settings.localization.creating_initial_entry.replace('{1}', 'richlist')}.. ${settings.localization.please_wait}..`);
                        skip = false;
                      }

                      // initialize the richlist collection
                      module.exports.create_richlist(settings.coin.name, skip, function() {
                        // check and initialize the heavycoin collection
                        init_heavy(function() {
                          // check and initialize the claimaddress collection
                          init_claimaddress(settings.coin.name, function() {
                            // initialize all enabled plugins
                            init_plugins(settings.coin.name, function() {
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

  // get the list of orphans from local collection
  get_orphans: function(start, length, cb) {
    // get the count of orphaned blocks
    Orphans.find({}).countDocuments().then((count) => {
      // get the actual orphaned block data
      Orphans.find({}).sort({blockindex: -1}).skip(Number(start)).limit(Number(length)).exec().then((orphans) => {
        return cb(orphans, count);
      }).catch((err) => {
        console.log(err);
        return cb([], count);
      });
    }).catch((err) => {
      console.log(err);
      return cb([], 0);
    });
  },

  get_extracted_by_claim_names: function(extracted_by_addresses, cb) {
    // check if custom claim names are enabled
    if (settings.claim_address_page.enabled == true) {
      // lookup the claim names for the extracted addresses
      module.exports.get_claim_names(extracted_by_addresses, function(claim_names) {
        // combine the addresses from the original array with the claim names to create an object array
        extracted_by_addresses = extracted_by_addresses.map(address => {
          const match = claim_names.find(doc => doc.a_id === address);

          return {
            a_id: address,
            claimname: match ? match.claim_name : ''
          };
        });

        return cb(extracted_by_addresses);
      });
    } else {
      // create an object array of the extracted addresses
      extracted_by_addresses = extracted_by_addresses.map(address => {
        return {
          a_id: address,
          claimname: ''
        };
      });

      return cb(extracted_by_addresses);
    }
  },

  fs: fs
};