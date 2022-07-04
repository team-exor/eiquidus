var express = require('express'),
    path = require('path'),
    nodeapi = require('./lib/nodeapi'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    settings = require('./lib/settings'),
    routes = require('./routes/index'),
    lib = require('./lib/explorer'),
    db = require('./lib/database'),
    package_metadata = require('./package.json'),
    locale = require('./lib/locale');
var app = express();
var apiAccessList = [];
const { exec } = require('child_process');

// pass wallet rpc connection info to nodeapi
nodeapi.setWalletDetails(settings.wallet);
// dynamically build the nodeapi cmd access list by adding all non-blockchain-specific api cmds that have a value
Object.keys(settings.api_cmds).forEach(function(key, index, map) {
  if (key != 'use_rpc' && settings.api_cmds[key] != null && settings.api_cmds[key] != '')
    apiAccessList.push(key);
});
// dynamically find and add additional blockchain_specific api cmds
Object.keys(settings.blockchain_specific).forEach(function(key, index, map) {
  // check if this feature is enabled and has api cmds
  if (settings.blockchain_specific[key].enabled == true && Object.keys(settings.blockchain_specific[key]).indexOf('api_cmds') > -1) {
    // add all blockchain specific api cmds that have a value
    Object.keys(settings.blockchain_specific[key]['api_cmds']).forEach(function(key2, index, map) {
      if (settings.blockchain_specific[key]['api_cmds'][key2] != null && settings.blockchain_specific[key]['api_cmds'][key2] != '')
        apiAccessList.push(key2);
    });
  }
});
// whitelist the cmds in the nodeapi access list
nodeapi.setAccess('only', apiAccessList);
// determine if cors should be enabled
if (settings.webserver.cors.enabled == true) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", settings.webserver.cors.corsorigin);
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var default_favicon = '';

// loop through the favicons
Object.keys(settings.shared_pages.favicons).forEach(function(key, index, map) {
  // remove the public directory from the path if exists
  if (settings.shared_pages.favicons[key] != null && settings.shared_pages.favicons[key].indexOf('public/') > -1)
    settings.shared_pages.favicons[key] = settings.shared_pages.favicons[key].replace(/public\//g, '');

  // check if the favicon file exists
  if (!db.fs.existsSync(path.join('./public', settings.shared_pages.favicons[key])))
    settings.shared_pages.favicons[key] = '';
  else if (default_favicon == '')
    default_favicon = settings.shared_pages.favicons[key];
});

if (default_favicon != '')
  app.use(favicon(path.join('./public', default_favicon)));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api', nodeapi.app);
app.use('/', routes);

// post method to claim an address using verifymessage functionality
app.post('/claim', function(req, res) {
  // check if the bad-words filter is enabled
  if (settings.claim_address_page.enable_bad_word_filter == true) {
    // initialize the bad-words filter
    var bad_word_lib = require('bad-words');
    var bad_word_filter = new bad_word_lib();

    // clean the message (Display name) of bad words
    var message = (req.body.message == null || req.body.message == '' ? '' : bad_word_filter.clean(req.body.message));
  } else {
    // Do not use the bad word filter
    var message = (req.body.message == null || req.body.message == '' ? '' : req.body.message);
  }

  // check if the message was filtered
  if (message == req.body.message) {
    // call the verifymessage api
    lib.verify_message(req.body.address, req.body.signature, req.body.message, function(body) {
      if (body == false)
        res.json({'status': 'failed', 'error': true, 'message': 'Invalid signature'});
      else if (body == true) {
        db.update_label(req.body.address, req.body.message, function(val) {
          // check if the update was successful
          if (val == '')
            res.json({'status': 'success'});
          else if (val == 'no_address')
            res.json({'status': 'failed', 'error': true, 'message': 'Wallet address ' + req.body.address + ' is not valid or does not have any transactions'});
          else
            res.json({'status': 'failed', 'error': true, 'message': 'Wallet address or signature is invalid'});
        });
      } else
        res.json({'status': 'failed', 'error': true, 'message': 'Wallet address or signature is invalid'});
    });
  } else {
    // message was filtered which would change the signature
    res.json({'status': 'failed', 'error': true, 'message': 'Display name contains bad words and cannot be saved: ' + message});
  }
});

// extended apis
app.use('/ext/getmoneysupply', function(req, res) {
  // check if the getmoneysupply api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getmoneysupply.enabled == true) {
    // lookup stats
    db.get_stats(settings.coin.name, function (stats) {
      res.setHeader('content-type', 'text/plain');
      res.end((stats && stats.supply ? stats.supply.toString() : '0'));
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getaddress/:hash', function(req, res) {
  // check if the getaddress api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getaddress.enabled == true) {
    db.get_address(req.params.hash, false, function(address) {
      db.get_address_txs_ajax(req.params.hash, 0, settings.api_page.public_apis.ext.getaddresstxs.max_items_per_query, function(txs, count) {
        if (address) {
          var last_txs = [];

          for (i = 0; i < txs.length; i++) {
            if (typeof txs[i].txid !== "undefined") {
              var out = 0,
                  vin = 0,
                  tx_type = 'vout',
                  row = {};

              txs[i].vout.forEach(function (r) {
                if (r.addresses == req.params.hash)
                  out += r.amount;
              });

              txs[i].vin.forEach(function (s) {
                if (s.addresses == req.params.hash)
                  vin += s.amount;
              });

              if (vin > out)
                tx_type = 'vin';

              row['addresses'] = txs[i].txid;
              row['type'] = tx_type;
              last_txs.push(row);
            }
          }

          var a_ext = {
            address: address.a_id,
            sent: (address.sent / 100000000),
            received: (address.received / 100000000),
            balance: (address.balance / 100000000).toString().replace(/(^-+)/mg, ''),
            last_txs: last_txs
          };

          res.send(a_ext);
        } else
          res.send({ error: 'address not found.', hash: req.params.hash});
      });
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/gettx/:txid', function(req, res) {
  // check if the gettx api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.gettx.enabled == true) {
    var txid = req.params.txid;

    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.send({ active: 'tx', tx: tx, confirmations: settings.shared_pages.confirmations, blockcount: (blockcount ? blockcount : 0)});
        });
      } else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx && rtx.txid) {
            lib.prepare_vin(rtx, function(vin, tx_type_vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, ((typeof rtx.vjoinsplit === 'undefined' || rtx.vjoinsplit == null) ? [] : rtx.vjoinsplit), function(rvout, rvin, tx_type_vout) {
                lib.calculate_total(rvout, function(total) {
                  if (!rtx.confirmations > 0) {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: '-',
                      blockindex: -1
                    };

                    res.send({ active: 'tx', tx: utx, confirmations: settings.shared_pages.confirmations, blockcount:-1});
                  } else {
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
                      res.send({ active: 'tx', tx: utx, confirmations: settings.shared_pages.confirmations, blockcount: (blockcount ? blockcount : 0)});
                    });
                  }
                });
              });
            });
          } else
            res.send({ error: 'tx not found.', hash: txid});
        });
      }
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getbalance/:hash', function(req, res) {
  // check if the getbalance api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getbalance.enabled == true) {
    db.get_address(req.params.hash, false, function(address) {
      if (address) {
        res.setHeader('content-type', 'text/plain');
        res.end((address.balance / 100000000).toString().replace(/(^-+)/mg, ''));
      } else
        res.send({ error: 'address not found.', hash: req.params.hash });
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getdistribution', function(req, res) {
  // check if the getdistribution api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getdistribution.enabled == true) {
    db.get_richlist(settings.coin.name, function(richlist) {
      db.get_stats(settings.coin.name, function(stats) {
        db.get_distribution(richlist, stats, function(dist) {
          res.send(dist);
        });
      });
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getcurrentprice', function(req, res) {
  // check if the getcurrentprice api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getcurrentprice.enabled == true) {
    db.get_stats(settings.coin.name, function (stats) {
      eval('var p_ext = { "last_price_' + settings.markets_page.default_exchange.trading_pair.split('/')[1].toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price, }');
      res.send(p_ext);
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getbasicstats', function(req, res) {
  // check if the getbasicstats api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getbasicstats.enabled == true) {
    // lookup stats
    db.get_stats(settings.coin.name, function (stats) {
      // check if the masternode count api is enabled
      if (settings.api_page.public_apis.rpc.getmasternodecount.enabled == true && settings.api_cmds['getmasternodecount'] != null && settings.api_cmds['getmasternodecount'] != '') {
        // masternode count api is available
        lib.get_masternodecount(function(masternodestotal) {
          eval('var p_ext = { "block_count": (stats.count ? stats.count : 0), "money_supply": (stats.supply ? stats.supply : 0), "last_price_' + settings.markets_page.default_exchange.trading_pair.split('/')[1].toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price, "masternode_count": masternodestotal.total }');
          res.send(p_ext);
        });
      } else {
        // masternode count api is not available
        eval('var p_ext = { "block_count": (stats.count ? stats.count : 0), "money_supply": (stats.supply ? stats.supply : 0), "last_price_' + settings.markets_page.default_exchange.trading_pair.split('/')[1].toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price }');
        res.send(p_ext);
      }
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getlasttxs/:min', function(req, res) {
  // check if the getlasttxs api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getlasttxs.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    var min = req.params.min, start, length, internal = false;
    // split url suffix by forward slash and remove blank entries
    var split = req.url.split('/').filter(function(v) { return v; });
    // determine how many parameters were passed
    switch (split.length) {
      case 2:
        // capture start and length
        start = split[0];
        length = split[1];
        break;
      default:
        if (split.length == 1) {
          // capture start
          start = split[0];
        } else if (split.length >= 2) {
          // capture start and length
          start = split[0];
          length = split[1];
          // check if this is an internal request
          if (split.length > 2 && split[2] == 'internal')
            internal = true;
        }

        break;
    }

    // fix parameters
    if (typeof length === 'undefined' || isNaN(length) || length > settings.api_page.public_apis.ext.getlasttxs.max_items_per_query)
      length = settings.api_page.public_apis.ext.getlasttxs.max_items_per_query;
    if (typeof start === 'undefined' || isNaN(start) || start < 0)
      start = 0;
    if (typeof min === 'undefined' || isNaN(min) || min < 0)
      min  = 0;
    else
      min  = (min * 100000000);

    db.get_last_txs(start, length, min, internal, function(data, count) {
      // check if this is an internal request
      if (internal) {
        // display data formatted for internal datatable
        res.json({"data": data, "recordsTotal": count, "recordsFiltered": count});
      } else {
        // display data in more readable format for public api
        res.json(data);
      }
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getaddresstxs/:address/:start/:length', function(req, res) {
  // check if the getaddresstxs api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getaddresstxs.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    var internal = false;
    // split url suffix by forward slash and remove blank entries
    var split = req.url.split('/').filter(function(v) { return v; });
    // check if this is an internal request
    if (split.length > 0 && split[0] == 'internal')
      internal = true;
    // fix parameters
    if (typeof req.params.length === 'undefined' || isNaN(req.params.length) || req.params.length > settings.api_page.public_apis.ext.getaddresstxs.max_items_per_query)
      req.params.length = settings.api_page.public_apis.ext.getaddresstxs.max_items_per_query;
    if (typeof req.params.start === 'undefined' || isNaN(req.params.start) || req.params.start < 0)
      req.params.start = 0;
    if (typeof req.params.min === 'undefined' || isNaN(req.params.min) || req.params.min < 0)
      req.params.min  = 0;
    else
      req.params.min  = (req.params.min * 100000000);

    db.get_address_txs_ajax(req.params.address, req.params.start, req.params.length, function(txs, count) {
      var data = [];

      for (i = 0; i < txs.length; i++) {
        if (typeof txs[i].txid !== "undefined") {
          var out = 0;
          var vin = 0;

          txs[i].vout.forEach(function(r) {
            if (r.addresses == req.params.address)
              out += r.amount;
          });

          txs[i].vin.forEach(function(s) {
            if (s.addresses == req.params.address)
              vin += s.amount;
          });

          if (internal) {
            var row = [];

            row.push(txs[i].timestamp);
            row.push(txs[i].txid);
            row.push(Number(out / 100000000));
            row.push(Number(vin / 100000000));
            row.push(Number(txs[i].balance / 100000000));

            data.push(row);
          } else {
            data.push({
              timestamp: txs[i].timestamp,
              txid: txs[i].txid,
              sent: Number(out / 100000000),
              received: Number(vin / 100000000),
              balance: Number(txs[i].balance / 100000000)
            });
          }
        }
      }

      // check if this is an internal request
      if (internal) {
        // display data formatted for internal datatable
        res.json({"data": data, "recordsTotal": count, "recordsFiltered": count});
      } else {
        // display data in more readable format for public api
        res.json(data);
      }
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getsummary', function(req, res) {
  // check if the getsummary api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getsummary.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    lib.get_connectioncount(function(connections) {
      lib.get_blockcount(function(blockcount) {
        // check if this is a footer-only method that should only return the connection count and block count
        if (req.headers['footer-only'] != null && req.headers['footer-only'] == 'true') {
          // only return the connection count and block count
          res.send({
            connections: (connections ? connections : '-'),
            blockcount: (blockcount ? blockcount : '-')
          });
        } else {
          lib.get_hashrate(function(hashrate) {
            db.get_stats(settings.coin.name, function (stats) {
              lib.get_masternodecount(function(masternodestotal) {
                lib.get_difficulty(function(difficulty) {
                  difficultyHybrid = '';

                  if (difficulty && difficulty['proof-of-work']) {
                    if (settings.shared_pages.difficulty == 'Hybrid') {
                      difficultyHybrid = 'POS: ' + difficulty['proof-of-stake'];
                      difficulty = 'POW: ' + difficulty['proof-of-work'];
                    } else if (settings.shared_pages.difficulty == 'POW')
                      difficulty = difficulty['proof-of-work'];
                    else
                      difficulty = difficulty['proof-of-stake'];
                  }

                  if (hashrate == 'There was an error. Check your console.')
                    hashrate = 0;

                  // check if the masternode count api is enabled
                  if (settings.api_page.public_apis.rpc.getmasternodecount.enabled == true && settings.api_cmds['getmasternodecount'] != null && settings.api_cmds['getmasternodecount'] != '') {
                    // masternode count api is available
                    var mn_total = 0;
                    var mn_enabled = 0;

                    if (masternodestotal) {
                      if (masternodestotal.total)
                        mn_total = masternodestotal.total;

                      if (masternodestotal.enabled)
                        mn_enabled = masternodestotal.enabled;
                    }

                    res.send({
                      difficulty: (difficulty ? difficulty : '-'),
                      difficultyHybrid: difficultyHybrid,
                      supply: (stats == null || stats.supply == null ? 0 : stats.supply),
                      hashrate: hashrate,
                      lastPrice: (stats == null || stats.last_price == null ? 0 : stats.last_price),
                      connections: (connections ? connections : '-'),
                      masternodeCountOnline: (masternodestotal ? mn_enabled : '-'),
                      masternodeCountOffline: (masternodestotal ? Math.floor(mn_total - mn_enabled) : '-'),
                      blockcount: (blockcount ? blockcount : '-')
                    });
                  } else {
                    // masternode count api is not available
                    res.send({
                      difficulty: (difficulty ? difficulty : '-'),
                      difficultyHybrid: difficultyHybrid,
                      supply: (stats == null || stats.supply == null ? 0 : stats.supply),
                      hashrate: hashrate,
                      lastPrice: (stats == null || stats.last_price == null ? 0 : stats.last_price),
                      connections: (connections ? connections : '-'),
                      blockcount: (blockcount ? blockcount : '-')
                    });
                  }
                });
              });
            });
          });
        }
      });
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getnetworkpeers', function(req, res) {
  // check if the getnetworkpeers api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getnetworkpeers.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    // get list of peers
    db.get_peers(function(peers) {
      // loop through peers list and remove the mongo _id and __v keys
      for (i = 0; i < peers.length; i++) {
        delete peers[i]['_doc']['_id'];
        delete peers[i]['_doc']['__v'];
      }

      // sort ip6 addresses to the bottom
      peers.sort(function(a, b) {
        var address1 = a.address.indexOf(':') > -1;
        var address2 = b.address.indexOf(':') > -1;

        if (address1 < address2)
          return -1;
        else if (address1 > address2)
          return 1;
        else
          return 0;
      });

      // return peer data
      res.json(peers);
    });
  } else
    res.end('This method is disabled');
});

// get the list of masternodes from local collection
app.use('/ext/getmasternodelist', function(req, res) {
  // check if the getmasternodelist api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getmasternodelist.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    // get the masternode list from local collection
    db.get_masternodes(function(masternodes) {
      // loop through masternode list and remove the mongo _id and __v keys
      for (i = 0; i < masternodes.length; i++) {
        delete masternodes[i]['_doc']['_id'];
        delete masternodes[i]['_doc']['__v'];
      }

      // return masternode list
      res.send(masternodes);
    });
  } else
    res.end('This method is disabled');
});

// returns a list of masternode reward txs for a single masternode address from a specific block height
app.use('/ext/getmasternoderewards/:hash/:since', function(req, res) {
  // check if the getmasternoderewards api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getmasternoderewards.enabled == true) {
    db.get_masternode_rewards(req.params.hash, req.params.since, function(rewards) {
      if (rewards != null) {
        // loop through the tx list to fix vout values and remove unnecessary data such as the always empty vin array and the mongo _id and __v keys
        for (i = 0; i < rewards.length; i++) {
          // remove unnecessary data keys
          delete rewards[i]['vin'];
          delete rewards[i]['_id'];
          delete rewards[i]['__v'];
          // convert amounts from satoshis
          rewards[i]['total'] = rewards[i]['total'] / 100000000;
          rewards[i]['vout']['amount'] = rewards[i]['vout']['amount'] / 100000000;
        }

        // return list of masternode rewards
        res.json(rewards);
      } else
        res.send({error: "failed to retrieve masternode rewards", hash: req.params.hash, since: req.params.since});
    });
  } else
    res.end('This method is disabled');
});

// returns the total masternode rewards received for a single masternode address from a specific block height
app.use('/ext/getmasternoderewardstotal/:hash/:since', function(req, res) {
  // check if the getmasternoderewardstotal api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getmasternoderewardstotal.enabled == true) {
    db.get_masternode_rewards_totals(req.params.hash, req.params.since, function(total_rewards) {
      if (total_rewards != null) {
        // return the total of masternode rewards
        res.json(total_rewards);
      } else
        res.send({error: "failed to retrieve masternode rewards", hash: req.params.hash, since: req.params.since});
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getnetworkchartdata', function(req, res) {
  db.get_network_chart_data(function(data) {
    if (data)
      res.send(data);
    else
      res.send();
  });
});

app.use('/system/restartexplorer', function(req, res, next) {
  // check to ensure this special cmd is only executed by the local server
  if (req._remoteAddress != null && req._remoteAddress.indexOf('127.0.0.1') > -1) {
    // send a msg to the cluster process telling it to restart
    process.send('restart');
    res.end();
  } else {
    // show the error page
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
});

var market_data = [];
var market_count = 0;

// check if markets are enabled
if (settings.markets_page.enabled == true) {
  // dynamically populate market data
  Object.keys(settings.markets_page.exchanges).forEach(function (key, index, map) {
    // check if market is enabled via settings
    if (settings.markets_page.exchanges[key].enabled == true) {
      // check if market is installed/supported
      if (db.fs.existsSync('./lib/markets/' + key + '.js')) {
        // load market file
        var exMarket = require('./lib/markets/' + key);
        // save market_name and market_logo from market file to settings
        eval('market_data.push({id: "' + key + '", name: "' + (exMarket.market_name == null ? '' : exMarket.market_name) + '", alt_name: "' + (exMarket.market_name_alt == null ? '' : exMarket.market_name_alt) + '", logo: "' + (exMarket.market_logo == null ? '' : exMarket.market_logo) + '", alt_logo: "' + (exMarket.market_logo_alt == null ? '' : exMarket.market_logo_alt) + '", trading_pairs: []});');
        // loop through all trading pairs for this market
        for (var i = 0; i < settings.markets_page.exchanges[key].trading_pairs.length; i++) {
          var isAlt = false;
          var pair = settings.markets_page.exchanges[key].trading_pairs[i].toUpperCase(); // ensure trading pair setting is always uppercase
          var coin_symbol = pair.split('/')[0];
          var pair_symbol = pair.split('/')[1];

          // determine if using the alt name + logo
          if (exMarket.market_url_template != null && exMarket.market_url_template != '') {
            switch ((exMarket.market_url_case == null || exMarket.market_url_case == '' ? 'l' : exMarket.market_url_case.toLowerCase())) {
              case 'l':
              case 'lower':
                isAlt = (exMarket.isAlt != null ? exMarket.isAlt({coin: coin_symbol.toLowerCase(), exchange: pair_symbol.toLowerCase()}) : false);
                break;
              case 'u':
              case 'upper':
                isAlt = (exMarket.isAlt != null ? exMarket.isAlt({coin: coin_symbol.toUpperCase(), exchange: pair_symbol.toUpperCase()}) : false);
                break;
              default:
            }
          }

          // add trading pair to market_data
          market_data[market_data.length - 1].trading_pairs.push({
            pair: pair,
            isAlt: isAlt
          });

          // increment the market count
          market_count++;
        }

        // sort trading pairs by alt status
        market_data[market_data.length - 1].trading_pairs.sort(function(a, b) {
          if (a.isAlt < b.isAlt)
            return -1;
          else if (a.isAlt > b.isAlt)
            return 1;
          else
            return 0;
        });
      }
    }
  });

  // sort market data by market name
  market_data.sort(function(a, b) {
    var name1 = a.name.toLowerCase();
    var name2 = b.name.toLowerCase();

    if (name1 < name2)
      return -1;
    else if (name1 > name2)
      return 1;
    else
      return 0;
  });

  // Fix default exchange case
  settings.markets_page.default_exchange.exchange_name = settings.markets_page.default_exchange.exchange_name.toLowerCase();
  settings.markets_page.default_exchange.trading_pair = settings.markets_page.default_exchange.trading_pair.toUpperCase();

  var ex = settings.markets_page.exchanges;
  var ex_name = settings.markets_page.default_exchange.exchange_name;
  var ex_pair = settings.markets_page.default_exchange.trading_pair;
  var ex_keys = Object.keys(ex);
  var ex_error = '';

  // check to ensure default market and trading pair exist and are enabled
  if (ex[ex_name] == null) {
    // exchange name does not exist in exchanges list
    ex_error = 'Default exchange name is not valid' + ': ' + ex_name;
  } else if (!ex[ex_name].enabled) {
    // exchange is not enabled
    ex_error = 'Default exchange is disabled in settings' + ': ' + ex_name;
  } else if (ex[ex_name].trading_pairs.findIndex(p => p.toLowerCase() == ex_pair.toLowerCase()) == -1) {
    // invalid default exchange trading pair
    ex_error = 'Default exchange trading pair is not valid' + ': ' + ex_pair;
  }

  // check if there was an error msg
  if (ex_error != '') {
    // there was an error, so find the next available market from settings.json
    var new_default_index = -1;

    // find the first enabled exchange with at least one trading pair
    for (var i = 0; i < ex_keys.length; i++) {
      if (ex[ex_keys[i]]['enabled'] === true && ex[ex_keys[i]]['trading_pairs'].length > 0) {
        // found a match so save the index
        new_default_index = i;
        // stop looking for more matches
        break;
      }
    }

    // check if a valid and enabled market was found
    if (new_default_index == -1) {
      // no valid markets found
      console.log('WARNING: ' + ex_error + '. ' + 'No valid or enabled markets found in settings.json. The markets feature will be temporarily disabled. To restore markets functionality, please enable at least 1 market and ensure at least 1 valid trading pair is added. Finally, restart the explorer to resolve the problem');
      // disable the markets feature for this session
      settings.markets_page.enabled = false;
    } else {
      // a valid and enabled market was found to replace the default
      console.log('WARNING: ' + ex_error + '. ' + 'Default exchange will be set to' + ': ' + ex_keys[new_default_index] + ' (' + ex[ex_keys[new_default_index]].trading_pairs[0] + ')');
      // set new default exchange data
      settings.markets_page.default_exchange.exchange_name = ex_keys[new_default_index];
      settings.markets_page.default_exchange.trading_pair = ex[ex_keys[new_default_index]].trading_pairs[0];
    }
  }
}

// check if home_link_logo file exists
if (!db.fs.existsSync(path.join('./public', settings.shared_pages.page_header.home_link_logo)))
  settings.shared_pages.page_header.home_link_logo = '';

// always disable the rpc masternode list cmd from public apis
settings.api_page.public_apis.rpc.getmasternodelist = { "enabled": false };

// locals
app.set('explorer_version', package_metadata.version);
app.set('locale', locale);
app.set('coin', settings.coin);
app.set('network_history', settings.network_history);
app.set('shared_pages', settings.shared_pages);
app.set('index_page', settings.index_page);
app.set('block_page', settings.block_page);
app.set('transaction_page', settings.transaction_page);
app.set('address_page', settings.address_page);
app.set('error_page', settings.error_page);
app.set('masternodes_page', settings.masternodes_page);
app.set('movement_page', settings.movement_page);
app.set('network_page', settings.network_page);
app.set('richlist_page', settings.richlist_page);
app.set('markets_page', settings.markets_page);
app.set('api_page', settings.api_page);
app.set('claim_address_page', settings.claim_address_page);
app.set('labels', settings.labels);
app.set('api_cmds', settings.api_cmds);
app.set('blockchain_specific', settings.blockchain_specific);

// determine panel offset based on which panels are enabled
var paneltotal = 5;
var panelcount = (settings.shared_pages.page_header.panels.network_panel.enabled == true && settings.shared_pages.page_header.panels.network_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.difficulty_panel.enabled == true && settings.shared_pages.page_header.panels.difficulty_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.masternodes_panel.enabled == true && settings.shared_pages.page_header.panels.masternodes_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.coin_supply_panel.enabled == true && settings.shared_pages.page_header.panels.coin_supply_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.price_panel.enabled == true && settings.shared_pages.page_header.panels.price_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.market_cap_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.logo_panel.enabled == true && settings.shared_pages.page_header.panels.logo_panel.display_order > 0 ? 1 : 0);
app.set('paneloffset', paneltotal + 1 - panelcount);

// determine panel order
var panel_order = new Array();

if (settings.shared_pages.page_header.panels.network_panel.enabled == true && settings.shared_pages.page_header.panels.network_panel.display_order > 0) panel_order.push({name: 'network_panel', val: settings.shared_pages.page_header.panels.network_panel.display_order});
if (settings.shared_pages.page_header.panels.difficulty_panel.enabled == true && settings.shared_pages.page_header.panels.difficulty_panel.display_order > 0) panel_order.push({name: 'difficulty_panel', val: settings.shared_pages.page_header.panels.difficulty_panel.display_order});
if (settings.shared_pages.page_header.panels.masternodes_panel.enabled == true && settings.shared_pages.page_header.panels.masternodes_panel.display_order > 0) panel_order.push({name: 'masternodes_panel', val: settings.shared_pages.page_header.panels.masternodes_panel.display_order});
if (settings.shared_pages.page_header.panels.coin_supply_panel.enabled == true && settings.shared_pages.page_header.panels.coin_supply_panel.display_order > 0) panel_order.push({name: 'coin_supply_panel', val: settings.shared_pages.page_header.panels.coin_supply_panel.display_order});
if (settings.shared_pages.page_header.panels.price_panel.enabled == true && settings.shared_pages.page_header.panels.price_panel.display_order > 0) panel_order.push({name: 'price_panel', val: settings.shared_pages.page_header.panels.price_panel.display_order});
if (settings.shared_pages.page_header.panels.market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.market_cap_panel.display_order > 0) panel_order.push({name: 'market_cap_panel', val: settings.shared_pages.page_header.panels.market_cap_panel.display_order});
if (settings.shared_pages.page_header.panels.logo_panel.enabled == true && settings.shared_pages.page_header.panels.logo_panel.display_order > 0) panel_order.push({name: 'logo_panel', val: settings.shared_pages.page_header.panels.logo_panel.display_order});

panel_order.sort(function(a,b) { return a.val - b.val; });

for (var i = 1; i < 6; i++)
  app.set('panel'+i.toString(), ((panel_order.length >= i) ? panel_order[i-1].name : ''));

app.set('market_data', market_data);
app.set('market_count', market_count);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// determine if tls features should be enabled
if (settings.webserver.tls.enabled == true) {
  try {
    var tls_options = {
      key: db.fs.readFileSync(settings.webserver.tls.key_file),
      cert: db.fs.readFileSync(settings.webserver.tls.cert_file),
      ca: db.fs.readFileSync(settings.webserver.tls.chain_file)
    };
  } catch(e) {
    console.warn('There was a problem reading tls certificates. Check that the certificate, chain and key paths are correct.');
  }

  var https = require('https');
  https.createServer(tls_options, app).listen(settings.webserver.tls.port);
}

// get the latest git commit id (if exists)
exec('git rev-parse HEAD', (err, stdout, stderr) => {
  // check if the commit id was returned
  if (stdout != null && stdout != '') {
    // set the explorer revision code based on the git commit id
    app.set('revision', stdout.substring(0, 7));
  }
});

module.exports = app;