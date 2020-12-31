var express = require('express')
  , path = require('path')
  , nodeapi = require('./lib/nodeapi')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , settings = require('./lib/settings')
  , routes = require('./routes/index')
  , lib = require('./lib/explorer')
  , db = require('./lib/database')
  , package_metadata = require('./package.json')
  , locale = require('./lib/locale')
  , request = require('postman-request');

var app = express();
var apiAccessList = [];

// pass wallet rpc connection info to nodeapi
nodeapi.setWalletDetails(settings.wallet);
// dynamically build the nodeapi cmd access list by adding all non-heavy api cmds that have a value
Object.keys(settings.api_cmds).forEach(function(key, index, map) { 
  if (key != 'heavies' && settings.api_cmds[key] != null && settings.api_cmds[key] != '')
    apiAccessList.push(key);
});
if (settings.heavy) {
  // add all heavy api cmds that have a value
  Object.keys(settings.api_cmds.heavies).forEach(function(key, index, map) { 
    if (settings.api_cmds.heavies[key] != null && settings.api_cmds.heavies[key] != '')
      apiAccessList.push(key);
  });
}
// whitelist the cmds in the nodeapi access list
nodeapi.setAccess('only', apiAccessList);
// determine if cors should be enabled
if (settings.usecors == true) {
	app.use(function(req, res, next) {
	   res.header("Access-Control-Allow-Origin", settings.corsorigin);
	   res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
	   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	   next();
	});
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, settings.favicon)));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api', nodeapi.app);
app.use('/', routes);

app.use('/ext/getmoneysupply', function(req, res) {
  // check if the getmoneysupply api is enabled
  if (settings.public_api.ext['getmoneysupply']) {
    lib.get_supply(function(supply) {
      res.setHeader('content-type', 'text/plain');
      res.end((supply ? supply.toString() : '0'));
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getaddress/:hash', function(req, res) {
  // check if the getaddress api is enabled
  if (settings.public_api.ext['getaddress']) {
    db.get_address(req.params.hash, false, function(address) {
      db.get_address_txs_ajax(req.params.hash, 0, settings.txcount, function(txs, count) {
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
  if (settings.public_api.ext['gettx']) {
    var txid = req.params.txid;
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.send({ active: 'tx', tx: tx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0)});
        });
      }
      else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx && rtx.txid) {
            lib.prepare_vin(rtx, function(vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, ((typeof rtx.vjoinsplit === 'undefined' || rtx.vjoinsplit == null) ? [] : rtx.vjoinsplit), function(rvout, rvin) {
                lib.calculate_total(rvout, function(total) {
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
                    res.send({ active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount:-1});
                  } else {
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
                      res.send({ active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: (blockcount ? blockcount : 0)});
                    });
                  }
                });
              });
            });
          } else {
            res.send({ error: 'tx not found.', hash: txid});
          }
        });
      }
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getbalance/:hash', function(req, res) {
  // check if the getbalance api is enabled
  if (settings.public_api.ext['getbalance']) {
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
  if (settings.public_api.ext['getdistribution']) {
    db.get_richlist(settings.coin, function(richlist) {
      db.get_stats(settings.coin, function(stats) {
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
  if (settings.public_api.ext['getcurrentprice']) {
    db.get_stats(settings.coin, function (stats) {
      eval('var p_ext = { "last_price_'+settings.markets.exchange.toLowerCase()+'": stats.last_price, "last_price_usd": stats.last_usd_price, }');
        res.send(p_ext);
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getbasicstats', function(req, res) {
  // check if the getbasicstats api is enabled
  if (settings.public_api.ext['getbasicstats']) {
    // lookup stats
    db.get_stats(settings.coin, function (stats) {
      // lookup coin supply
      lib.get_supply(function(supply) {
        // lookup block count
        lib.get_blockcount(function(blockcount) {
          // check if the masternode count api is enabled
          if (settings.public_api.rpc['getmasternodecount'] == true && settings.api_cmds['getmasternodecount'] != null && settings.api_cmds['getmasternodecount'] != '') {
            // masternode count api is available
            lib.get_masternodecount(function(masternodestotal) {
              eval('var p_ext = { "block_count": (blockcount ? blockcount : 0), "money_supply": (supply ? supply : 0), "last_price_'+settings.markets.exchange.toLowerCase()+'": stats.last_price, "last_price_usd": stats.last_usd_price, "masternode_count": masternodestotal.total }');
              res.send(p_ext);
            });
          } else {
            // masternode count api is not available
            eval('var p_ext = { "block_count": (blockcount ? blockcount : 0), "money_supply": (supply ? supply : 0), "last_price_'+settings.markets.exchange.toLowerCase()+'": stats.last_price, "last_price_usd": stats.last_usd_price }');
            res.send(p_ext);
          }
        });
      });
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getlasttxs/:min', function(req, res) {
  // check if the getlasttxs api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if (settings.public_api.ext['getlasttxs'] || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    var min = req.params.min, start, length;
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
        } else if (split.length > 2) {
          // capture start and length
          start = split[0];
          length = split[1];
        }
        break;
    }

    // fix parameters
    if (typeof length === 'undefined' || isNaN(length) || length > settings.index.last_txs)
      length = settings.index.last_txs;
    if (typeof start === 'undefined' || isNaN(start) || start < 0)
      start = 0;
    if (typeof min === 'undefined' || isNaN(min) || min < 0)
      min  = 0;
    else
      min  = (min * 100000000);

    db.get_last_txs(start, length, min, function(data, count) {
      res.json({"data":data, "recordsTotal": count, "recordsFiltered": count});
    });
  } else
    res.end('This method is disabled');
});

app.use('/ext/getaddresstxs/:address/:start/:length', function(req,res) {
  // fix parameters
  if (typeof req.params.length === 'undefined' || isNaN(req.params.length) || req.params.length > settings.txcount)
    req.params.length = settings.txcount;
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
          if (r.addresses == req.params.address) {
            out += r.amount;
          }
        });

        txs[i].vin.forEach(function(s) {
          if (s.addresses == req.params.address) {
            vin += s.amount;
          }
        });

        var row = [];
        row.push(new Date((txs[i].timestamp) * 1000).toUTCString());
        row.push(txs[i].txid);
        row.push(out);
        row.push(vin);
        row.push(txs[i].balance);
        data.push(row);
      }
    }

    res.json({"data":data, "recordsTotal": count, "recordsFiltered": count});
  });
});

app.post('/claim', function(req, res) {
  // initialize the bad-words filter
  var bad_word_lib = require('bad-words');
  var bad_word_filter = new bad_word_lib();

  // clean the message (Display name) of bad words
  var message = (req.body.message == null || req.body.message == '' ? '' : bad_word_filter.clean(req.body.message));

  // check if the message was filtered
  if (message == req.body.message) {
    // call the verifymessage api
    lib.verify_message(req.body.address, req.body.signature, req.body.message, function(body) {
      if (body == false) {
        res.json({'status': 'failed', 'error': true, 'message': 'Invalid signature'});
      } else if (body == true) {
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

app.use('/ext/connections', function(req,res){
  db.get_peers(function(peers){
    res.send({data: peers});
  });
});

// get the list of masternodes from local collection
app.use('/ext/getmasternodelist', function(req, res) {
  // check if the getmasternodelist api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if (settings.public_api.ext['getmasternodelist'] || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
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
  if (settings.public_api.ext['getmasternoderewards']) {
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
  if (settings.public_api.ext['getmasternoderewardstotal']) {
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

// locals
app.set('title', settings.title);
app.set('explorer_version', package_metadata.version);
app.set('symbol', settings.symbol);
app.set('coin', settings.coin);
app.set('locale', locale);
app.set('display', settings.display);
app.set('markets', settings.markets);
app.set('twitter', settings.twitter);
app.set('facebook', settings.facebook);
app.set('googleplus', settings.googleplus);
app.set('bitcointalk', settings.bitcointalk);
app.set('github', settings.github);
app.set('slack', settings.slack);
app.set('discord', settings.discord);
app.set('telegram', settings.telegram);
app.set('reddit', settings.reddit);
app.set('youtube', settings.youtube);
app.set('website', settings.website);

app.set('genesis_block', settings.genesis_block);
app.set('index', settings.index);
app.set('use_rpc', settings.use_rpc);
app.set('heavy', settings.heavy);
app.set('save_stats_after_sync_blocks', settings.save_stats_after_sync_blocks);
app.set('lock_during_index', settings.lock_during_index);
app.set('txcount', settings.txcount);
app.set('txcount_per_page', settings.txcount_per_page);
app.set('nethash', settings.nethash);
app.set('nethash_units', settings.nethash_units);
app.set('show_sent_received', settings.show_sent_received);
app.set('logo', settings.logo);

// Check if header logo file exists
if (db.fs.existsSync(path.join('./public', settings.headerlogo)))
  app.set('headerlogo', settings.headerlogo);
else
  app.set('headerlogo', '');

app.set('theme', settings.theme);
app.set('labels', settings.labels);
app.set('homelink', settings.homelink);
app.set('logoheight', settings.logoheight);
app.set('burned_coins', settings.burned_coins);
app.set('api_cmds', settings.api_cmds);

// Always disable the rpc masternode list cmd from public apis
settings.public_api['rpc']['getmasternodelist'] = false;
app.set('public_api', settings.public_api);

app.set('sticky_header', settings.sticky_header);
app.set('sticky_footer', settings.sticky_footer);

app.set('footer_height_desktop', settings.footer_height_desktop);
app.set('footer_height_tablet', settings.footer_height_tablet);
app.set('footer_height_mobile', settings.footer_height_mobile);

app.set('social_link_percent_height_desktop', settings.social_link_percent_height_desktop);
app.set('social_link_percent_height_tablet', settings.social_link_percent_height_tablet);
app.set('social_link_percent_height_mobile', settings.social_link_percent_height_mobile);

// determine panel offset based on which panels are enabled
var paneltotal = 5;
var panelcount = (settings.display.networkpnl > 0 ? 1 : 0) +
  (settings.display.difficultypnl > 0 ? 1 : 0) +
  (settings.display.masternodespnl > 0 ? 1 : 0) +
  (settings.display.coinsupplypnl > 0 ? 1 : 0) +
  (settings.display.pricepnl > 0 ? 1 : 0) +
  (settings.display.marketcappnl > 0 ? 1 : 0) +
  (settings.display.logopnl > 0 ? 1 : 0);
app.set('paneloffset', paneltotal + 1 - panelcount);

// determine panel order
var panelorder = new Array();

if (settings.display.networkpnl > 0) panelorder.push({name: 'networkpnl', val: settings.display.networkpnl});
if (settings.display.difficultypnl > 0) panelorder.push({name: 'difficultypnl', val: settings.display.difficultypnl});
if (settings.display.masternodespnl > 0) panelorder.push({name: 'masternodespnl', val: settings.display.masternodespnl});
if (settings.display.coinsupplypnl > 0) panelorder.push({name: 'coinsupplypnl', val: settings.display.coinsupplypnl});
if (settings.display.pricepnl > 0) panelorder.push({name: 'pricepnl', val: settings.display.pricepnl});
if (settings.display.marketcappnl > 0) panelorder.push({name: 'marketcappnl', val: settings.display.marketcappnl});
if (settings.display.logopnl > 0) panelorder.push({name: 'logopnl', val: settings.display.logopnl});

panelorder.sort(function(a,b) { return a.val - b.val; });

for (var i=1; i<6; i++)
  app.set('panel'+i.toString(), ((panelorder.length >= i) ? panelorder[i-1].name : ''));

// Dynamically populate market data
var market_data = [];

settings.markets.enabled.forEach(function (market) {
  // Check if market file exists
  if (db.fs.existsSync('./lib/markets/' + market + '.js')) {
    // Load market file
    var exMarket = require('./lib/markets/' + market);
    // Save market_name and market_logo from market file to settings
    eval('market_data.push({id: "' + market + '", name: "' + (exMarket.market_name == null ? '' : exMarket.market_name) + '", logo: "' + (exMarket.market_logo == null ? '' : exMarket.market_logo) + '"});');
  }
});

// Sort market data by name
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

app.set('market_data', market_data);

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

module.exports = app;