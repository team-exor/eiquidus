const express = require('express');
const router = express.Router();
const settings = require('../lib/settings');
const db = require('../lib/database');
const lib = require('../lib/explorer');
const async = require('async');

function send_block_data(res, block, txs, title_text, orphan) {
  let extracted_by_addresses = [];

  // check if the extracted by addresses should be found
  if (settings.block_page.show_extracted_by == true && txs != null && txs.length > 0) {
    // find the block reward tx
    const block_reward_tx = txs.find(tx => tx.vin != null && (tx.vin.length === 0 || (tx.vin.length === 1 && tx.vin[0].addresses === 'coinbase' && tx.vin[0].amount != 0)));

    // get a list of all the block reward addresses
    extracted_by_addresses = (block_reward_tx ? block_reward_tx.vout.map(v => v.addresses) : []);

    // add claim name data to the array
    db.get_extracted_by_claim_names(extracted_by_addresses, function(updated_extracted_by_addresses) {
      finalize_send_block_data(res, block, txs, title_text, orphan, updated_extracted_by_addresses);
    });
  } else
    finalize_send_block_data(res, block, txs, title_text, orphan, extracted_by_addresses);
}

function finalize_send_block_data(res, block, txs, title_text, orphan, extracted_by_addresses) {
  res.render(
    'block',
    {
      active: 'block',
      block: block,
      orphan: orphan,
      confirmations: settings.shared_pages.confirmations,
      txs: txs,
      extracted_by_addresses: extracted_by_addresses,
      showSync: db.check_show_sync_message(),
      customHash: get_custom_hash(),
      styleHash: get_style_hash(),
      themeHash: get_theme_hash(),
      page_title_prefix: settings.coin.name + ' ' + title_text
    }
  );
}

function send_tx_data(res, tx, blockcount, orphan) {
  let extracted_by_addresses = [];

  // check if the extracted by addresses should be found
  if (
    settings.transaction_page.show_extracted_by == true &&
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
    extracted_by_addresses = tx.vout.map(v => v.addresses);

    // add claim name data to the array
    db.get_extracted_by_claim_names(extracted_by_addresses, function(updated_extracted_by_addresses) {
      finalize_send_tx_data(res, tx, blockcount, orphan, updated_extracted_by_addresses);
    });
  } else
    finalize_send_tx_data(res, tx, blockcount, orphan, extracted_by_addresses);
}

function finalize_send_tx_data(res, tx, blockcount, orphan, extracted_by_addresses) {
  res.render(
    'tx',
    {
      active: 'tx',
      tx: tx,
      orphan: orphan,
      confirmations: settings.shared_pages.confirmations,
      blockcount: blockcount,
      extracted_by_addresses: extracted_by_addresses,
      showSync: db.check_show_sync_message(),
      customHash: get_custom_hash(),
      styleHash: get_style_hash(),
      themeHash: get_theme_hash(),
      page_title_prefix: settings.coin.name + ' ' + 'Transaction ' + tx.txid
    }
  );
}

function send_address_data(res, address, claim_name) {
  res.render(
    'address',
    {
      active: 'address',
      address: address,
      claim_name: claim_name,
      showSync: db.check_show_sync_message(),
      customHash: get_custom_hash(),
      styleHash: get_style_hash(),
      themeHash: get_theme_hash(),
      page_title_prefix: settings.coin.name + ' ' + 'Address ' + (claim_name == null || claim_name == '' ? address.a_id : claim_name)
    }
  );
}

function send_claimaddress_data(res, hash, claim_name) {
  res.render(
    'claim_address',
    {
      active: 'claim-address',
      hash: hash,
      claim_name: claim_name,
      showSync: db.check_show_sync_message(),
      customHash: get_custom_hash(),
      styleHash: get_style_hash(),
      themeHash: get_theme_hash(),
      page_title_prefix: settings.coin.name + ' Claim Wallet Address' + (hash == null || hash == '' ? '' : ' ' + hash)
    }
  );
}

function get_file_timestamp(file_name) {
  if (db.fs.existsSync(file_name))
    return parseInt(db.fs.statSync(file_name).mtimeMs / 1000);
  else
    return null;
}

function get_last_updated_date(show_last_updated, last_updated_field, cb) {
  // check if the last updated date is needed
  if (show_last_updated == true) {
    // lookup the stats record
    db.get_stats(settings.coin.name, function (stats) {
      // return the last updated date
      return cb(stats[last_updated_field]);
    });
  } else {
    return cb(null);
  }
}

function get_block_data_from_wallet(block, res, orphan) {
  var ntxs = [];

  async.eachSeries(block.tx, function(block_tx, loop) {
    lib.get_rawtransaction(block_tx, function(tx) {
      if (tx && tx != `${settings.localization.ex_error}: ${settings.localization.check_console}`) {
        lib.prepare_vin(tx, function(vin, tx_type_vin) {
          lib.prepare_vout(tx.vout, block_tx, vin, ((!settings.blockchain_specific.zksnarks.enabled || typeof tx.vjoinsplit === 'undefined' || tx.vjoinsplit == null) ? [] : tx.vjoinsplit), function(vout, nvin, tx_type_vout) {
            const total = lib.calculate_total(vout);

            ntxs.push({
              txid: block_tx,
              vout: vout,
              total: total.toFixed(8)
            });

            if (settings.block_page.show_extracted_by == true) {
              // add the vin object to the tx data
              ntxs[ntxs.length - 1].vin = (vin == null || vin.length == 0 ? [] : nvin);
            }

            loop();
          });
        });
      } else
        loop();
    });
  }, function() {
    send_block_data(res, block, ntxs, 'Block ' + block.height, orphan);
  });
}

function get_custom_hash() {
  return get_file_timestamp('./public/css/custom.scss');
}

function get_style_hash() {
  return get_file_timestamp('./public/css/style.scss');
}

function get_theme_hash() {
  return get_file_timestamp('./public/css/themes/' + settings.shared_pages.theme.toLowerCase() + '/bootstrap.min.css');
}

/* GET functions */

function route_get_block(res, blockhash) {
  lib.get_block(blockhash, function (block) {
    if (block && block != `${settings.localization.ex_error}: ${settings.localization.check_console}`) {
      if (blockhash == settings.block_page.genesis_block)
        send_block_data(res, block, null, 'Genesis Block', null);
      else if (block.confirmations == -1) {
        // this is an orphaned block, so get the data from the wallet directly
        get_block_data_from_wallet(block, res, true);
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0)
            send_block_data(res, block, txs, 'Block ' + block.height, null);
          else {
            // cannot find block in local database so get the data from the wallet directly
            get_block_data_from_wallet(block, res, false);
          }
        });
      }
    } else {
      if (!isNaN(blockhash)) {
        var height = blockhash;

        lib.get_blockhash(height, function(hash) {
          if (hash && hash != `${settings.localization.ex_error}: ${settings.localization.check_console}`)
            res.redirect('/block/' + hash);
          else
            route_get_txlist(res, 'Block not found: ' + blockhash);
        });
      } else
        route_get_txlist(res, 'Block not found: ' + blockhash);
    }
  });
}

function route_get_tx(res, txid) {
  if (txid == settings.transaction_page.genesis_tx)
    route_get_block(res, settings.block_page.genesis_block);
  else {
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          if (settings.claim_address_page.enabled == true) {
            db.populate_claim_address_names(tx, function(tx) {
              send_tx_data(res, tx, (blockcount ? blockcount : 0), null);
            });
          } else
            send_tx_data(res, tx, (blockcount ? blockcount : 0), null);
        });
      } else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx && rtx.txid) {
            lib.prepare_vin(rtx, function(vin, tx_type_vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, ((!settings.blockchain_specific.zksnarks.enabled || typeof rtx.vjoinsplit === 'undefined' || rtx.vjoinsplit == null) ? [] : rtx.vjoinsplit), function(rvout, rvin, tx_type_vout) {
                const total = lib.calculate_total(rvout);

                if (!rtx.confirmations > 0) {
                  lib.get_block(rtx.blockhash, function(block) {
                    if (block && block != `${settings.localization.ex_error}: ${settings.localization.check_console}`) {
                      var utx = {
                        txid: rtx.txid,
                        vin: rvin,
                        vout: rvout,
                        total: total.toFixed(8),
                        timestamp: (rtx.time == null ? block.time : rtx.time),
                        blockhash: (rtx.blockhash == null ? '-' : rtx.blockhash),
                        blockindex: block.height
                      };

                      if (settings.claim_address_page.enabled == true) {
                        db.populate_claim_address_names(utx, function(utx) {
                          send_tx_data(res, utx, (block.height - 1), true);
                        });
                      } else
                        send_tx_data(res, utx, (block.height - 1), true);
                    } else {
                      // cannot load tx
                      route_get_txlist(res, null);
                    }
                  });
                } else {
                  // check if blockheight exists
                  if (!rtx.blockheight && rtx.blockhash) {
                    // blockheight not found so look up the block
                    lib.get_block(rtx.blockhash, function(block) {
                      if (block && block != `${settings.localization.ex_error}: ${settings.localization.check_console}`) {
                        // create the tx object before rendering
                        var utx = {
                          txid: rtx.txid,
                          vin: rvin,
                          vout: rvout,
                          total: total.toFixed(8),
                          timestamp: rtx.time,
                          blockhash: rtx.blockhash,
                          blockindex: block.height
                        };

                        lib.get_blockcount(function(blockcount) {
                          if (settings.claim_address_page.enabled == true) {
                            db.populate_claim_address_names(utx, function(utx) {
                              send_tx_data(res, utx, (blockcount ? blockcount : 0), null);
                            });
                          } else
                            send_tx_data(res, utx, (blockcount ? blockcount : 0), null);
                        });
                      } else {
                        // cannot load tx
                        route_get_txlist(res, null);
                      }
                    });
                  } else {
                    // create the tx object before rendering
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: rtx.blockhash,
                      blockindex: rtx.blockheight
                    };

                    lib.get_blockcount(function(blockcount) {
                      if (settings.claim_address_page.enabled == true) {
                        db.populate_claim_address_names(utx, function(utx) {
                          send_tx_data(res, utx, (blockcount ? blockcount : 0), null);
                        });
                      } else
                        send_tx_data(res, utx, (blockcount ? blockcount : 0), null);
                    });
                  }
                }
              });
            });
          } else
            route_get_txlist(res, null);
        });
      }
    });
  }
}

function route_get_txlist(res, error) {
  // lookup the last updated date if necessary
  get_last_updated_date(settings.index_page.page_header.show_last_updated, 'blockchain_last_updated', function(last_updated_date) {
    res.render(
      'index',
      {
        active: 'home',
        error: error,
        last_updated: last_updated_date,
        showSync: db.check_show_sync_message(),
        customHash: get_custom_hash(),
        styleHash: get_style_hash(),
        themeHash: get_theme_hash(),
        page_title_prefix: settings.coin.name + ' ' + 'Block Explorer'
      }
    );
  });
}

function route_get_address(res, hash) {
  // check if trying to load a special address
  if (hash != null && hash.toLowerCase() != 'coinbase' && ((hash.toLowerCase() == 'hidden_address' && settings.address_page.enable_hidden_address_view == true) || (hash.toLowerCase() == 'unknown_address' && settings.address_page.enable_unknown_address_view == true) || (hash.toLowerCase() != 'hidden_address' && hash.toLowerCase() != 'unknown_address'))) {
    // lookup address in local collection
    db.get_address(hash, false, function(address) {
      if (address) {
        if (settings.claim_address_page.enabled == true) {
          // lookup claim_name for this address if exists
          db.get_claim_name(hash, function(claim_name) {
            send_address_data(res, address, claim_name);
          });
        } else
          send_address_data(res, address, null);
      } else
        route_get_txlist(res, hash + ' not found');
    });
  } else
    route_get_txlist(res, hash + ' not found');
}

function route_get_claim_form(res, hash) {
  // check if claiming addresses is enabled
  if (settings.claim_address_page.enabled == true) {
    // check if a hash was passed in
    if (hash == null || hash == '') {
      // no hash so just load the claim page without an address
      send_claimaddress_data(res, hash, '');
    } else {
      // lookup hash in the address collection
      db.get_claim_name(hash, function(claim_name) {
        // load the claim page regardless of whether the address exists or not
        send_claimaddress_data(res, hash, (claim_name == null ? '' : claim_name));
      });
    }
  } else
    route_get_address(res, hash);
}

router.get('/', function(req, res) {
  route_get_txlist(res, null);
});

router.get('/info', function(req, res) {
  let pluginApisExt = [];

  // ensure api page is enabled
  if (settings.api_page.enabled == true) {
    // loop through all plugins defined in the settings
    settings.plugins.allowed_plugins.forEach(function (plugin) {
      // check if this plugin is enabled
      if (plugin.enabled) {
        // check if this plugin has a public_apis section
        if (plugin.public_apis != null) {
          // check if there is an ext section
          if (plugin.public_apis.ext != null) {
            // loop through all ext apis for this plugin
            Object.keys(plugin.public_apis.ext).forEach(function(key, index, map) {
              // check if this api is enabled
              if (plugin.public_apis.ext[key].enabled == true) {
                // add this api into the list of ext apis for plugins
                pluginApisExt.push(plugin.public_apis.ext[key]);
              }
            });
          }
        }
      }
    });

    // load the api page
    res.render(
      'info',
      {
        active: 'info',
        address: req.headers.host,
        showSync: db.check_show_sync_message(),
        customHash: get_custom_hash(),
        styleHash: get_style_hash(),
        themeHash: get_theme_hash(),
        page_title_prefix: settings.coin.name + ' Public API',
        pluginApisExt: pluginApisExt
      }
    );
  } else {
    // api page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/markets/:market/:coin_symbol/:pair_symbol', function(req, res) {
  // ensure markets page is enabled
  if (settings.markets_page.enabled == true) {
    var market_id = req.params['market'];
    var coin_symbol = req.params['coin_symbol'];
    var pair_symbol = req.params['pair_symbol'];

    // check if the market and trading pair exists and market is enabled in settings.json
    if (settings.markets_page.exchanges[market_id] != null && settings.markets_page.exchanges[market_id].enabled == true && settings.markets_page.exchanges[market_id].trading_pairs.findIndex(p => p.toLowerCase() == coin_symbol.toLowerCase() + '/' + pair_symbol.toLowerCase()) > -1) {
      // lookup market data
      db.get_market(market_id, coin_symbol, pair_symbol, function(data) {
        // load market data
        var market_data = require('../lib/markets/' + market_id);
        var isAlt = false;
        var url = '';

        // build the external exchange url link and determine if using the alt name + logo
        if (market_data.market_url_template != null && market_data.market_url_template != '') {
          switch ((market_data.market_url_case == null || market_data.market_url_case == '' ? 'l' : market_data.market_url_case.toLowerCase())) {
            case 'l':
            case 'lower':
              url = market_data.market_url_template.replace('{base}', pair_symbol.toLowerCase()).replace('{coin}', coin_symbol.toLowerCase()).replace('{url_prefix}', (market_data.market_url != null ? market_data.market_url({coin: coin_symbol.toLowerCase(), exchange: pair_symbol.toLowerCase()}) : ''));
              isAlt = (market_data.isAlt != null ? market_data.isAlt({coin: coin_symbol.toLowerCase(), exchange: pair_symbol.toLowerCase()}) : false);
              break;
            case 'u':
            case 'upper':
              url = market_data.market_url_template.replace('{base}', pair_symbol.toUpperCase()).replace('{coin}', coin_symbol.toUpperCase()).replace('{url_prefix}', (market_data.market_url != null ? market_data.market_url({coin: coin_symbol.toUpperCase(), exchange: pair_symbol.toUpperCase()}) : ''));
              isAlt = (market_data.isAlt != null ? market_data.isAlt({coin: coin_symbol.toUpperCase(), exchange: pair_symbol.toUpperCase()}) : false);
              break;
            default:
          }
        }

        var market_name = (isAlt ? (market_data.market_name_alt == null ? '' : market_data.market_name_alt) : (market_data.market_name == null ? '' : market_data.market_name));
        var market_logo = (isAlt ? (market_data.market_logo_alt == null ? '' : market_data.market_logo_alt) : (market_data.market_logo == null ? '' : market_data.market_logo));
        var marketdata = {
          market_name: market_name,
          market_logo: market_logo,
          coin: coin_symbol,
          exchange: pair_symbol,
          data: data,
          url: url
        };

        // lookup the last updated date if necessary
        get_last_updated_date(settings.markets_page.page_header.show_last_updated, 'markets_last_updated', function(last_updated_date) {
          res.render(
            './market',
            {
              active: 'markets',
              marketdata: marketdata,
              market: market_id,
              last_updated: last_updated_date,
              showSync: db.check_show_sync_message(),
              customHash: get_custom_hash(),
              styleHash: get_style_hash(),
              themeHash: get_theme_hash(),
              page_title_prefix: settings.localization.mkt_title.replace('{1}', marketdata.market_name + ' (' + marketdata.coin + '/' + marketdata.exchange + ')')
            }
          );
        });
      });
    } else {
      // selected market does not exist or is not enabled so default to the tx list page
      route_get_txlist(res, null);
    }
  } else {
    // markets page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/richlist', function(req, res) {
  // ensure richlist page is enabled
  if (settings.richlist_page.enabled == true) {
    db.get_stats(settings.coin.name, function (stats) {
      db.get_richlist(settings.coin.name, function(richlist) {
        if (richlist) {
          db.get_distribution(richlist, stats, function(distribution) {
            res.render(
              'richlist',
              {
                active: 'richlist',
                balance: richlist.balance,
                received: richlist.received,
                burned: richlist.burned,
                stats: stats,
                dista: distribution.t_1_25,
                distb: distribution.t_26_50,
                distc: distribution.t_51_75,
                distd: distribution.t_76_100,
                diste: distribution.t_101plus,
                last_updated: (settings.richlist_page.page_header.show_last_updated == true ? stats.richlist_last_updated : null),
                showSync: db.check_show_sync_message(),
                customHash: get_custom_hash(),
                styleHash: get_style_hash(),
                themeHash: get_theme_hash(),
                page_title_prefix: 'Top ' + settings.coin.name + ' Coin Holders'
              }
            );
          });
        } else {
          // richlist data not found so default to the tx list page
          route_get_txlist(res, null);
        }
      });
    });
  } else {
    // richlist page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/movement', function(req, res) {
  // ensure movement page is enabled
  if (settings.movement_page.enabled == true) {
    // lookup the last updated date if necessary
    get_last_updated_date(settings.movement_page.page_header.show_last_updated, 'blockchain_last_updated', function(last_updated_date) {
      res.render(
        'movement',
        {
          active: 'movement',
          last_updated: last_updated_date,
          showSync: db.check_show_sync_message(),
          customHash: get_custom_hash(),
          styleHash: get_style_hash(),
          themeHash: get_theme_hash(),
          page_title_prefix: settings.coin.name + ' ' + 'Coin Movements'
        }
      );
    });
  } else {
    // movement page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/network', function(req, res) {
  // ensure network page is enabled
  if (
    settings.network_page.enabled == true &&
    (
      settings.network_page.connections_table.enabled == true ||
      settings.network_page.addnodes_table.enabled == true ||
      settings.network_page.onetry_table.enabled == true
    )
  ) {
    // lookup the last updated date if necessary
    get_last_updated_date(settings.network_page.page_header.show_last_updated, 'network_last_updated', function(last_updated_date) {
      res.render(
        'network',
        {
          active: 'network',
          last_updated: last_updated_date,
          showSync: db.check_show_sync_message(),
          customHash: get_custom_hash(),
          styleHash: get_style_hash(),
          themeHash: get_theme_hash(),
          page_title_prefix: settings.coin.name + ' ' + 'Network Peers'
        }
      );
    });
  } else {
    // network page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

// masternode list page
router.get('/masternodes', function(req, res) {
  // ensure masternode page is enabled
  if (settings.masternodes_page.enabled == true) {
    // lookup the last updated date if necessary
    get_last_updated_date(settings.masternodes_page.page_header.show_last_updated, 'masternodes_last_updated', function(last_updated_date) {
      res.render(
        'masternodes',
        {
          active: 'masternodes',
          last_updated: last_updated_date,
          showSync: db.check_show_sync_message(),
          customHash: get_custom_hash(),
          styleHash: get_style_hash(),
          themeHash: get_theme_hash(),
          page_title_prefix: settings.coin.name + ' ' + 'Masternodes'
        }
      );
    });
  } else {
    // masternode page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/reward', function(req, res) {
  // ensure reward page is enabled
  if (settings.blockchain_specific.heavycoin.enabled == true && settings.blockchain_specific.heavycoin.reward_page.enabled == true) {
    db.get_stats(settings.coin.name, function (stats) {
      db.get_heavy(settings.coin.name, function (heavy) {
        if (!heavy)
          heavy = { coin: settings.coin.name, lvote: 0, reward: 0, supply: 0, cap: 0, estnext: 0, phase: 'N/A', maxvote: 0, nextin: 'N/A', votes: [] };

        var votes = heavy.votes;

        votes.sort(function (a, b) {
          if (a.count < b.count)
            return -1;
          else if (a.count > b.count)
            return 1;
          else
            return 0;
        });

        res.render(
          'reward',
          {
            active: 'reward',
            stats: stats,
            heavy: heavy,
            votes: votes,
            last_updated: (settings.blockchain_specific.heavycoin.reward_page.page_header.show_last_updated == true ? stats.reward_last_updated : null),
            showSync: db.check_show_sync_message(),
            customHash: get_custom_hash(),
            styleHash: get_style_hash(),
            themeHash: get_theme_hash(),
            page_title_prefix: settings.coin.name + ' Reward/Voting Details'
          }
        );
      });
    });
  } else {
    // reward page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.get('/tx/:txid', function(req, res) {
  route_get_tx(res, req.params.txid);
});

router.get('/block/:hash', function(req, res) {
  route_get_block(res, req.params.hash);
});

router.get('/claim', function(req, res) {
  route_get_claim_form(res, '');
});

router.get('/claim/:hash', function(req, res) {
  route_get_claim_form(res, req.params.hash);
});

router.get('/address/:hash', function(req, res) {
  route_get_address(res, req.params.hash);
});

router.get('/orphans', function(req, res) {
  // ensure orphans page is enabled
  if (settings.orphans_page.enabled == true) {
    // lookup the last updated date if necessary
    get_last_updated_date(settings.orphans_page.page_header.show_last_updated, 'blockchain_last_updated', function(last_updated_date) {
      res.render(
        'orphans',
        {
          active: 'orphans',
          last_updated: last_updated_date,
          showSync: db.check_show_sync_message(),
          customHash: get_custom_hash(),
          styleHash: get_style_hash(),
          themeHash: get_theme_hash(),
          page_title_prefix: settings.localization.orphan_title.replace('{1}', settings.coin.name)
        }
      );
    });
  } else {
    // orphans page is not enabled so default to the tx list page
    route_get_txlist(res, null);
  }
});

router.post('/search', function(req, res) {
  if (settings.shared_pages.page_header.search.enabled == true) {
    var query = req.body.search.trim();

    if (query.length == 64) {
      if (query == settings.transaction_page.genesis_tx)
        res.redirect('/block/' + settings.block_page.genesis_block);
      else {
        db.get_tx(query, function(tx) {
          if (tx)
            res.redirect('/tx/' + tx.txid);
          else {
            lib.get_block(query, function(block) {
              if (block && block != `${settings.localization.ex_error}: ${settings.localization.check_console}`)
                res.redirect('/block/' + query);
              else {
                // check wallet for transaction
                lib.get_rawtransaction(query, function(tx) {
                  if (tx && tx.txid)
                    res.redirect('/tx/' + tx.txid);
                  else {
                    // search found nothing so display the tx list page with an error msg
                    route_get_txlist(res, settings.localization.ex_search_error + query );
                  }
                });
              }
            });
          }
        });
      }
    } else {
      db.get_address(query, false, function(address) {
        if (address)
          res.redirect('/address/' + address.a_id);
        else {
          lib.get_blockhash(query, function(hash) {
            if (hash && hash != `${settings.localization.ex_error}: ${settings.localization.check_console}`)
              res.redirect('/block/' + hash);
            else
              route_get_txlist(res, settings.localization.ex_search_error + query);
          });
        }
      });
    }
  } else {
    // Search is disabled so load the tx list page with an error msg
    route_get_txlist(res, 'Search is disabled');
  }
});

router.get('/qr/:string', function(req, res) {
  if (req.params.string) {
    const qr = require('qr-image');

    var address = qr.image(req.params.string, {
      type: 'png',
      size: 4,
      margin: 1,
      ec_level: 'M'
    });

    res.type('png');
    address.pipe(res);
  }
});

module.exports = router;