var express = require('express')
    , router = express.Router()
    , settings = require('../lib/settings')
    , locale = require('../lib/locale')
    , db = require('../lib/database')
    , lib = require('../lib/explorer')
    , qr = require('qr-image');

function route_get_block(res, blockhash) {
  lib.get_block(blockhash, function (block) {
    if (block && block != 'There was an error. Check your console.') {
      if (blockhash == settings.genesis_block) {
        res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: 'GENESIS', showSync: db.check_show_sync_message()});
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0) {
            res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: txs, showSync: db.check_show_sync_message()});
          } else {
            db.create_txs(block, function(){
              db.get_txs(block, function(ntxs) {
                if (ntxs.length > 0) {
                  res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: ntxs, showSync: db.check_show_sync_message()});
                } else {
                  route_get_index(res, 'Block not found: ' + blockhash);
                }
              });
            });
          }
        });
      }
    } else {
      if (!isNaN(blockhash)) {
        var height = blockhash;
        lib.get_blockhash(height, function(hash) {
          if (hash && hash != 'There was an error. Check your console.') {
            res.redirect('/block/' + hash);
          } else {
            route_get_index(res, 'Block not found: ' + blockhash);
          }
        });
      } else {
        route_get_index(res, 'Block not found: ' + blockhash);
      }
    }
  });
}
/* GET functions */

function route_get_tx(res, txid) {
  if (txid == settings.genesis_tx) {
    route_get_block(res, settings.genesis_block);
  } else {
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          if (settings.display.claim_address) {
            db.populate_claim_address_names(tx, function(tx) {
              res.render('tx', { active: 'tx', tx: tx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
            });
          } else {
            res.render('tx', { active: 'tx', tx: tx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
          }
        });
      } else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx && rtx.txid) {
            lib.prepare_vin(rtx, function(vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, ((typeof rtx.vjoinsplit === 'undefined' || rtx.vjoinsplit == null) ? [] : rtx.vjoinsplit), function(rvout, rvin) {
                lib.calculate_total(rvout, function(total){
                  if (!rtx.confirmations > 0) {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: '-',
                      blockindex: -1,
                    };

                    if (settings.display.claim_address) {
                      db.populate_claim_address_names(utx, function(utx) {
                        res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount:-1, showSync: db.check_show_sync_message()});
                      });
                    } else {
                      res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount:-1, showSync: db.check_show_sync_message()});
                    }
                  } else {
                    // check if blockheight exists
                    if (!rtx.blockheight && rtx.blockhash) {
                      // blockheight not found so look up the block
                      lib.get_block(rtx.blockhash, function(block) {
                        if (block && block != 'There was an error. Check your console.') {
                          // create the tx object before rendering
                          var utx = {
                            txid: rtx.txid,
                            vin: rvin,
                            vout: rvout,
                            total: total.toFixed(8),
                            timestamp: rtx.time,
                            blockhash: rtx.blockhash,
                            blockindex: block.height,
                          };
                          lib.get_blockcount(function(blockcount) {
                            if (settings.display.claim_address) {
                              db.populate_claim_address_names(utx, function(utx) {
                                res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
                              });
                            } else {
                              res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
                            }
                          });
                        } else {
                          // cannot load tx
                          route_get_index(res, null);
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
                        blockindex: rtx.blockheight,
                      };
                      lib.get_blockcount(function(blockcount) {
                        if (settings.display.claim_address) {
                          db.populate_claim_address_names(utx, function(utx) {
                            res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
                          });
                        } else {
                          res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0), showSync: db.check_show_sync_message()});
                        }
                      });
                    }
                  }
                });
              });
            });
          } else {
            route_get_index(res, null);
          }
        });
      }
    });
  }
}

function route_get_index(res, error) {
  // check if index page should show last updated date
  if (settings.index.show_last_updated == true) {
    // lookup last updated date
    db.get_stats(settings.coin, function (stats) {
      res.render('index', { active: 'home', error: error, last_updated: stats.blockchain_last_updated, showSync: db.check_show_sync_message()});
    });
  } else {
    // skip lookup up the last updated date and display the page now
    res.render('index', { active: 'home', error: error, last_updated: null, showSync: db.check_show_sync_message()});
  }
}

function route_get_address(res, hash, count) {
  db.get_address(hash, false, function(address) {
    if (address) {
      res.render('address', { active: 'address', address: address, showSync: db.check_show_sync_message()});
    } else {
      route_get_index(res, hash + ' not found');
    }
  });
}

function route_get_claim_form(res, hash) {
  // check if claiming addresses is enabled
  if (settings.display.claim_address) {
    // check if a hash was passed in
    if (hash == null || hash == '') {
      // no hash so just load the claim page without an address
      res.render("claim_address", { active: "claim-address", hash: hash, claim_name: '', showSync: db.check_show_sync_message()});
    } else {
      // lookup hash in the address collection
      db.get_address(hash, false, function(address) {
        // load the claim page regardless of whether the address exists or not
        res.render("claim_address", { active: "claim-address", hash: hash, claim_name: (address == null || address.name == null ? '' : address.name), showSync: db.check_show_sync_message()});
      });
    }
  } else
    route_get_address(res, hash, settings.txcount);
}

/* GET home page. */
router.get('/', function(req, res) {
  route_get_index(res, null);
});

router.get('/info', function(req, res) {
  res.render('info', { active: 'info', address: settings.address, hashes: settings.api, showSync: db.check_show_sync_message() });
});

router.get('/markets/:market', function(req, res) {
  // ensure markets page is enabled
  if (settings.display.markets == true) {
    var market_id = req.params['market'];

    if (settings.markets.enabled.indexOf(market_id) != -1) {
      // lookup market data
      db.get_market(market_id, function(data) {
        // load market data
        var market_data = require('../lib/markets/' + market_id);
        // check if markets page should show last updated date
        if (settings.markets_page.show_last_updated == true) {
          // lookup last updated date
          db.get_stats(settings.coin, function (stats) {
            res.render('./market', {
              active: 'markets',
              marketdata: {
                market_name: (market_data.market_name == null ? '' : market_data.market_name),
                market_logo: (market_data.market_logo == null ? '' : market_data.market_logo),
                coin: settings.markets.coin,
                exchange: settings.markets.exchange,
                data: data,
              },
              market: market_id,
              last_updated: stats.markets_last_updated,
              showSync: db.check_show_sync_message()
            });
          });
        } else {
          // skip lookup up the last updated date and display the page now
          res.render('./market', {
            active: 'markets',
            marketdata: {
              market_name: (market_data.market_name == null ? '' : market_data.market_name),
              market_logo: (market_data.market_logo == null ? '' : market_data.market_logo),
              coin: settings.markets.coin,
              exchange: settings.markets.exchange,
              data: data,
            },
            market: market_id,
            last_updated: null,
            showSync: db.check_show_sync_message()
          });
        }
      });
    } else {
      // selected market is not enabled so default to the index page
      route_get_index(res, null);
    }
  } else {
    // markets page is not enabled so default to the index page
    route_get_index(res, null);
  }
});

router.get('/richlist', function(req, res) {
  // ensure richlist page is enabled
  if (settings.display.richlist == true) {
    db.get_stats(settings.coin, function (stats) {
      db.get_richlist(settings.coin, function(richlist) {
        if (richlist) {
          db.get_distribution(richlist, stats, function(distribution) {
            res.render('richlist', {
              active: 'richlist',
              balance: richlist.balance,
              received: richlist.received,
              stats: stats,
              dista: distribution.t_1_25,
              distb: distribution.t_26_50,
              distc: distribution.t_51_75,
              distd: distribution.t_76_100,
              diste: distribution.t_101plus,
              show_dist: settings.richlist.distribution,
              show_received: settings.richlist.received,
              show_balance: settings.richlist.balance,
              last_updated: (settings.richlist_page.show_last_updated == true ? stats.richlist_last_updated : null),
              showSync: db.check_show_sync_message()
            });
          });
        } else {
          // richlist data not found so default to the index page
          route_get_index(res, null);
        }
      });
    });
  } else {
    // richlist page is not enabled so default to the index page
    route_get_index(res, null);
  }
});

router.get('/movement', function(req, res) {
  // ensure movement page is enabled
  if (settings.display.movement == true) {
    // check if movement page should show last updated date
    if (settings.movement_page.show_last_updated == true) {
      // lookup last updated date
      db.get_stats(settings.coin, function (stats) {
        res.render('movement', {active: 'movement', flaga: settings.movement.low_flag, flagb: settings.movement.high_flag, min_amount:settings.movement.min_amount, last_updated: stats.blockchain_last_updated, showSync: db.check_show_sync_message()});
      });
    } else {
      // skip lookup up the last updated date and display the page now
      res.render('movement', {active: 'movement', flaga: settings.movement.low_flag, flagb: settings.movement.high_flag, min_amount:settings.movement.min_amount, last_updated: null, showSync: db.check_show_sync_message()});
    }
  } else {
    // movement page is not enabled so default to the index page
    route_get_index(res, null);
  }
});

router.get('/network', function(req, res) {
  // ensure network page is enabled
  if (settings.display.network == true) {
    // check if network page should show last updated date
    if (settings.network_page.show_last_updated == true) {
      // lookup last updated date
      db.get_stats(settings.coin, function (stats) {
        res.render('network', {active: 'network', last_updated: stats.network_last_updated, showSync: db.check_show_sync_message()});
      });
    } else {
      // skip lookup up the last updated date and display the page now
      res.render('network', {active: 'network', last_updated: null, showSync: db.check_show_sync_message()});
    }
  } else {
    // network page is not enabled so default to the index page
    route_get_index(res, null);
  }
});

// masternode list page
router.get('/masternodes', function(req, res) {
  // ensure masternode page is enabled
  if (settings.display.masternodes == true) {
    // check if masternodes page should show last updated date
    if (settings.masternodes_page.show_last_updated == true) {
      // lookup last updated date
      db.get_stats(settings.coin, function (stats) {
        res.render('masternodes', {active: 'masternodes', last_updated: stats.masternodes_last_updated, showSync: db.check_show_sync_message()});
      });
    } else {
      // skip lookup up the last updated date and display the page now
      res.render('masternodes', {active: 'masternodes', last_updated: null, showSync: db.check_show_sync_message()});
    }
  } else {
    // masternode page is not enabled so default to the index page
    route_get_index(res, null);
  }
});

router.get('/reward', function(req, res) {
  // ensure reward page is enabled
  if (settings.heavy == true) {
    db.get_stats(settings.coin, function (stats) {
      db.get_heavy(settings.coin, function (heavy) {
        if (!heavy)
          heavy = { coin: settings.coin, lvote: 0, reward: 0, supply: 0, cap: 0, estnext: 0, phase: 'N/A', maxvote: 0, nextin: 'N/A', votes: [] };

        var votes = heavy.votes;

        votes.sort(function (a, b) {
          if (a.count < b.count)
            return -1;
          else if (a.count > b.count)
            return 1;
          else
            return 0;
        });

        res.render('reward', {
          active: 'reward',
          stats: stats,
          heavy: heavy,
          votes: votes,
          last_updated: (settings.reward_page.show_last_updated == true ? stats.reward_last_updated : null),
          showSync: db.check_show_sync_message()
        });
      });
    });
  } else {
    // reward page is not enabled so default to the index page
    route_get_index(res, null);
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
  route_get_address(res, req.params.hash, settings.txcount);
});

router.get('/address/:hash/:count', function(req, res) {
  route_get_address(res, req.params.hash, req.params.count);
});

router.post('/search', function(req, res) {
  var query = req.body.search.trim();
  if (query.length == 64) {
    if (query == settings.genesis_tx) {
      res.redirect('/block/' + settings.genesis_block);
    } else {
      db.get_tx(query, function(tx) {
        if (tx) {
          res.redirect('/tx/' + tx.txid);
        } else {
          lib.get_block(query, function(block) {
            if (block && block != 'There was an error. Check your console.') {
              res.redirect('/block/' + query);
            } else {
              // check wallet for transaction
              lib.get_rawtransaction(query, function(tx) {
                if (tx && tx.txid) {
                  res.redirect('/tx/' + tx.txid);
                } else {
                  // search found nothing so display the index page with an error msg
                  route_get_index(res, locale.ex_search_error + query );
                }
              });
            }
          });
        }
      });
    }
  } else {
    db.get_address(query, false, function(address) {
      if (address) {
        res.redirect('/address/' + address.a_id);
      } else {
        lib.get_blockhash(query, function(hash) {
          if (hash && hash != 'There was an error. Check your console.') {
            res.redirect('/block/' + hash);
          } else {
            route_get_index(res, locale.ex_search_error + query );
          }
        });
      }
    });
  }
});

router.get('/qr/:string', function(req, res) {
  if (req.params.string) {
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

router.get('/ext/summary', function(req, res) {
  lib.get_difficulty(function(difficulty) {
    difficultyHybrid = '';
    if (difficulty && difficulty['proof-of-work']) {
      if (settings.index.difficulty == 'Hybrid') {
        difficultyHybrid = 'POS: ' + difficulty['proof-of-stake'];
        difficulty = 'POW: ' + difficulty['proof-of-work'];
      } else if (settings.index.difficulty == 'POW') {
        difficulty = difficulty['proof-of-work'];
      } else {
        difficulty = difficulty['proof-of-stake'];
      }
    }
    lib.get_hashrate(function(hashrate) {
      lib.get_connectioncount(function(connections){
        lib.get_masternodecount(function(masternodestotal){
          lib.get_blockcount(function(blockcount) {
            db.get_stats(settings.coin, function (stats) {
              if (hashrate == 'There was an error. Check your console.') {
                hashrate = 0;
              }

              var mn_total = 0;
              var mn_enabled = 0;

              if (masternodestotal) {
                if (masternodestotal.total)
                  mn_total = masternodestotal.total;
                if (masternodestotal.enabled)
                  mn_enabled = masternodestotal.enabled;
              }
              res.send({ data: [{
                difficulty: (difficulty ? difficulty : '-'),
                difficultyHybrid: difficultyHybrid,
                supply: (stats == null || stats.supply == null ? 0 : stats.supply),
                hashrate: hashrate,
                lastPrice: (stats == null || stats.last_price == null ? 0 : stats.last_price),
                connections: (connections ? connections : '-'),
                masternodeCountOnline: (masternodestotal ? mn_enabled : '-'),
                masternodeCountOffline: (masternodestotal ? Math.floor(mn_total - mn_enabled) : '-'),
                blockcount: (blockcount ? blockcount : '-')
              }]});
            });
          });
        });
      });
    });
  });
});
module.exports = router;