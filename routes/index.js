const express = require('express');
const router = express.Router();
const settings = require('../lib/settings');
const db = require('../lib/database');
const lib = require('../lib/explorer');
const async = require('async');
const Decimal = require('decimal.js');

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
  if (block) {
    block.difficulty = lib.format_decimal_string(new Decimal(block.difficulty.toString()), { minFractionDigits: 4, maxFractionDigits: 4 });
    block.size = lib.format_decimal_string(new Decimal(block.size.toString()).div('1024'), { minFractionDigits: 2, maxFractionDigits: 2 });
  }

  txs.forEach(function (tx) {
    // add a fixed value for display
    if (tx.vout.length > 0)
      tx['totalFixed'] = lib.format_decimal_string(new Decimal(tx.total.toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 });
    else
      tx['totalFixed'] = lib.format_decimal_string(new Decimal(tx.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
  });

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
  tx.vin.forEach(function (vin) {
    // add a fixed value for display
    vin['amountFixed'] = lib.format_decimal_string(new Decimal(vin.amount.toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 });
  });

  tx.vout.forEach(function (vout) {
    // add a fixed value for display
    vout['amountFixed'] = lib.format_decimal_string(new Decimal(vout.amount.toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 });
  });

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
  const received = new Decimal(address.received.toString());
  const sent = new Decimal(address.sent.toString());
  const balanceString = lib.format_decimal_string(received.minus(sent).div('100000000'), { minFractionDigits: 2, maxFractionDigits: 8 });
  const receivedString = lib.format_decimal_string(received.div('100000000'), { minFractionDigits: 2, maxFractionDigits: 8 });
  const sentString = lib.format_decimal_string(sent.div('100000000'), { minFractionDigits: 2, maxFractionDigits: 8 });

  res.render(
    'address',
    {
      active: 'address',
      address: address,
      balance: balanceString,
      received: receivedString,
      sent: sentString,
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
        lib.get_blockhash(blockhash, function(hash) {
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
                      route_get_txlist(res, 'Transaction not found: ' + txid);
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
                        route_get_txlist(res, 'Transaction not found: ' + txid);
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
            route_get_txlist(res, 'Transaction not found: ' + txid);
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
        route_get_txlist(res, 'Address not found: ' + hash);
    });
  } else
    route_get_txlist(res, 'Address not found: ' + hash);
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
    const market_id = req.params['market'];
    const coin_symbol = req.params['coin_symbol'];
    const pair_symbol = req.params['pair_symbol'];

    // check if the market and trading pair exists and market is enabled in settings.json
    if (
      settings.markets_page.exchanges[market_id] != null &&
      settings.markets_page.exchanges[market_id].enabled == true &&
      settings.markets_page.exchanges[market_id].trading_pairs.findIndex(p => p.toLowerCase() == coin_symbol.toLowerCase() + '/' + pair_symbol.toLowerCase()) > -1
    ) {
      // lookup market data
      db.get_market(market_id, coin_symbol, pair_symbol, function(data) {
        // load market data
        const market_data = require('../lib/markets/' + market_id);
        let isAlt = false;
        let url = '';

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

        const market_name = (isAlt ? (market_data.market_name_alt == null ? '' : market_data.market_name_alt) : (market_data.market_name == null ? '' : market_data.market_name));
        const market_logo = (isAlt ? (market_data.market_logo_alt == null ? '' : market_data.market_logo_alt) : (market_data.market_logo == null ? '' : market_data.market_logo));
        const marketdata = {
          market_name: market_name,
          market_logo: market_logo,
          coin: coin_symbol,
          exchange: pair_symbol,
          data: data,
          url: url
        };

        // lookup the last updated date if necessary
        get_last_updated_date(settings.markets_page.page_header.show_last_updated, 'markets_last_updated', function(last_updated_date) {
          if (marketdata.data != null) {
            // check and fix data for display
            if (marketdata.data.summary != null) {
              if (marketdata.data.summary.high != null)
                marketdata.data.summary.high = lib.format_decimal_string(new Decimal(marketdata.data.summary.high.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.low != null)
                marketdata.data.summary.low = lib.format_decimal_string(new Decimal(marketdata.data.summary.low.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.volume != null)
                marketdata.data.summary.volume = lib.format_decimal_string(new Decimal(marketdata.data.summary.volume.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.volume_btc != null)
                marketdata.data.summary.volume_btc = lib.format_decimal_string(new Decimal(marketdata.data.summary.volume_btc.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.bid != null)
                marketdata.data.summary.bid = lib.format_decimal_string(new Decimal(marketdata.data.summary.bid.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.ask != null)
                marketdata.data.summary.ask = lib.format_decimal_string(new Decimal(marketdata.data.summary.ask.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.last != null)
                marketdata.data.summary.last = lib.format_decimal_string(new Decimal(marketdata.data.summary.last.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (marketdata.data.summary.prev != null)
                marketdata.data.summary.prev = lib.format_decimal_string(new Decimal(marketdata.data.summary.prev.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

              if (
                marketdata.data.summary.change != null ||
                (
                  marketdata.data.summary.last != null &&
                  marketdata.data.summary.prev != null
                )
              ) {
                if (marketdata.data.summary.change != null) {
                  if (marketdata.data.summary.change == '' || marketdata.data.summary.change == '-')
                    marketdata.data.summary.change = '0.00';
                  else
                    marketdata.data.summary.change = lib.format_decimal_string(new Decimal(marketdata.data.summary.change.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

                  marketdata.data.summary.change_num = new Decimal(marketdata.data.summary.change.toString()).toNumber();
                } else if (marketdata.data.summary.last != 0) {
                  marketdata.data.summary.change = lib.format_decimal_string(new Decimal('100').minus(new Decimal(marketdata.data.summary.prev.toString()).div(marketdata.data.summary.last.toString()).times('100')), { minFractionDigits: 2, maxFractionDigits: 2 });
                  marketdata.data.summary.change_num = new Decimal('100').minus(new Decimal(marketdata.data.summary.prev.toString()).div(marketdata.data.summary.last.toString()).times('100')).toNumber();
                } else {
                  marketdata.data.summary.change = lib.format_decimal_string(new Decimal('0'), { minFractionDigits: 2, maxFractionDigits: 2 });
                  marketdata.data.summary.change_num = 0;
                }
              }
            }

            if (marketdata.data.buys != null) {
              marketdata.data.buys.forEach(function (buy) {
                if (buy.total != null)
                  buy.total = lib.format_decimal_string(new Decimal(buy.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
                else
                  buy.total = lib.format_decimal_string(new Decimal(new Decimal(buy.price.toString()).toFixed(8)).mul(new Decimal(buy.quantity.toString()).toFixed(8)), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (buy.price != null)
                  buy.price = lib.format_decimal_string(new Decimal(buy.price.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (buy.quantity != null)
                  buy.quantity = lib.format_decimal_string(new Decimal(buy.quantity.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
              });
            }

            if (marketdata.data.sells != null) {
              marketdata.data.sells.forEach(function (sell) {
                if (sell.total != null)
                  sell.total = lib.format_decimal_string(new Decimal(sell.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
                else
                  sell.total = lib.format_decimal_string(new Decimal(new Decimal(sell.price.toString()).toFixed(8)).mul(new Decimal(sell.quantity.toString()).toFixed(8)), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (sell.price != null)
                  sell.price = lib.format_decimal_string(new Decimal(sell.price.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (sell.quantity != null)
                  sell.quantity = lib.format_decimal_string(new Decimal(sell.quantity.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
              });
            }

            if (marketdata.data.history != null) {
              marketdata.data.history.forEach(function (order) {
                if (order.total != null)
                  order.total = lib.format_decimal_string(new Decimal(order.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
                else
                  order.total = lib.format_decimal_string(new Decimal(new Decimal(order.price.toString()).toFixed(8)).mul(new Decimal(order.quantity.toString()).toFixed(8)), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (order.price != null)
                  order.price = lib.format_decimal_string(new Decimal(order.price.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

                if (order.quantity != null)
                  order.quantity = lib.format_decimal_string(new Decimal(order.quantity.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
              });
            }
          }

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
            // fix balance data for display
            richlist.balance.forEach((balance) => {
              balance.balanceFixed = lib.format_decimal_string(new Decimal(balance.balance.toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 });
              balance.percentFixed = lib.format_decimal_string(new Decimal(balance.balance.toString()).div(100000000).div(stats.supply.toString()).mul(100), { minFractionDigits: 2, maxFractionDigits: 2 });
            });

            // fix received data for display
            richlist.received.forEach((received) => {
              received.receivedFixed = lib.format_decimal_string(new Decimal(received.received.toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 });
            });

            // fix 1-25 data for display
            distribution.t_1_25.totalFixed = lib.format_decimal_string(new Decimal(distribution.t_1_25.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
            distribution.t_1_25.percentFixed = lib.format_decimal_string(new Decimal(distribution.t_1_25.percent.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

            // fix 26-50 data for display
            distribution.t_26_50.totalFixed = lib.format_decimal_string(new Decimal(distribution.t_26_50.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
            distribution.t_26_50.percentFixed = lib.format_decimal_string(new Decimal(distribution.t_26_50.percent.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

            // fix 51-75 data for display
            distribution.t_51_75.totalFixed = lib.format_decimal_string(new Decimal(distribution.t_51_75.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
            distribution.t_51_75.percentFixed = lib.format_decimal_string(new Decimal(distribution.t_51_75.percent.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

            // fix 76-100 data for display
            distribution.t_76_100.totalFixed = lib.format_decimal_string(new Decimal(distribution.t_76_100.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
            distribution.t_76_100.percentFixed = lib.format_decimal_string(new Decimal(distribution.t_76_100.percent.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

            // fix 101+ data for display
            distribution.t_101plus.totalFixed = lib.format_decimal_string(new Decimal(distribution.t_101plus.total.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
            distribution.t_101plus.percentFixed = lib.format_decimal_string(new Decimal(distribution.t_101plus.percent.toString()), { minFractionDigits: 2, maxFractionDigits: 2 });

            let burned = null;

            // fix burned data for display
            if (richlist.burned != null && richlist.burned.length > 0) {
              burned = {
                total: new Decimal(richlist.burned[0].toString()).div(100000000),
                percent: new Decimal(richlist.burned[0].toString()).div(100000000).div(stats.supply.toString()).mul(100),
                totalFixed: lib.format_decimal_string(new Decimal(richlist.burned[0].toString()).div(100000000), { minFractionDigits: 2, maxFractionDigits: 8 }),
                percentFixed: lib.format_decimal_string(new Decimal(richlist.burned[0].toString()).div(100000000).div(stats.supply.toString()).mul(100), { minFractionDigits: 2, maxFractionDigits: 2 })
              };
            }

            // add fixed 1-100 data for display
            distribution.t_1_100total = {
              totalFixed: lib.format_decimal_string(new Decimal(distribution.t_1_25.total.toString()).add(new Decimal(distribution.t_26_50.total.toString())).add(new Decimal(distribution.t_51_75.total.toString())).add(new Decimal(distribution.t_76_100.total.toString())), { minFractionDigits: 2, maxFractionDigits: 8 }),
              percentFixed: lib.format_decimal_string(new Decimal(distribution.t_1_25.percent.toString()).add(new Decimal(distribution.t_26_50.percent.toString())).add(new Decimal(distribution.t_51_75.percent.toString())).add(new Decimal(distribution.t_76_100.percent.toString())), { minFractionDigits: 2, maxFractionDigits: 2 })
            };

            // add fixed total data for display
            distribution.total = {
              totalFixed: lib.format_decimal_string(new Decimal(distribution.t_1_25.total.toString()).add(new Decimal(distribution.t_26_50.total.toString())).add(new Decimal(distribution.t_51_75.total.toString())).add(new Decimal(distribution.t_76_100.total.toString())).add(new Decimal(distribution.t_101plus.total.toString())).add((settings.richlist_page.burned_coins.include_burned_coins_in_distribution == true && burned != null && burned.total.toNumber() > 0 ? burned.total : 0).toString()), { minFractionDigits: 2, maxFractionDigits: 8 }),
              percentFixed: lib.format_decimal_string(new Decimal(distribution.t_1_25.percent.toString()).add(new Decimal(distribution.t_26_50.percent.toString())).add(new Decimal(distribution.t_51_75.percent.toString())).add(new Decimal(distribution.t_76_100.percent.toString())).add(new Decimal(distribution.t_101plus.percent.toString())).add((settings.richlist_page.burned_coins.include_burned_coins_in_distribution == true && burned != null && burned.total.toNumber() > 0 ? burned.percent : 0).toString()), { minFractionDigits: 2, maxFractionDigits: 2 })
            };

            res.render(
              'richlist',
              {
                active: 'richlist',
                balance: richlist.balance,
                received: richlist.received,
                burned: burned,
                stats: stats,
                address_count: (settings.richlist_page.wealth_distribution.show_address_count == true ? lib.format_decimal_string(new Decimal(stats.address_count.toString()), { minFractionDigits: 0, maxFractionDigits: 0 }) : 0),
                dista: distribution.t_1_25,
                distb: distribution.t_26_50,
                distc: distribution.t_51_75,
                distd: distribution.t_76_100,
                diste: distribution.t_101plus,
                distsubtotal: distribution.t_1_100total,
                disttotal: distribution.total,
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

        // add fixed values for display
        heavy['supplyFixed'] = lib.format_decimal_string(new Decimal(heavy.supply.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
        heavy['capFixed'] = lib.format_decimal_string(new Decimal(heavy.cap.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
        heavy['rewardFixed'] = lib.format_decimal_string(new Decimal(heavy.reward.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });
        heavy['estnextFixed'] = lib.format_decimal_string(new Decimal(heavy.estnext.toString()), { minFractionDigits: 2, maxFractionDigits: 8 });

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
    // search is disabled so load the tx list page with an error msg
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