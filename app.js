var express = require('express'),
    path = require('path'),
    nodeapi = require('./lib/nodeapi'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    settings = require('./lib/settings'),
    routes = require('./routes/index'),
    lib = require('./lib/explorer'),
    db = require('./lib/database'),
    package_metadata = require('./package.json');
var app = express();
var apiAccessList = [];
var viewPaths = [path.join(__dirname, 'views')]
var pluginRoutes = [];
const { exec } = require('child_process');
const helmet = require('helmet');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');

// Use helmet to secure Express apps by setting various HTTP headers
app.use(helmet());

// Use csurf for CSRF protection
app.use(csurf({ cookie: true }));

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// pass wallet rpc connection info to nodeapi
nodeapi.setWalletDetails(settings.wallet);
// dynamically build the nodeapi cmd access list by adding all non-blockchain-specific api cmds that have a value
Object.keys(settings.api_cmds).forEach(function(key, index, map) {
  if (key != 'use_rpc' && key != 'rpc_concurrent_tasks' && settings.api_cmds[key] != null && settings.api_cmds[key] != '')
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

// determine if http traffic should be forwarded to https
if (settings.webserver.tls.enabled == true && settings.webserver.tls.always_redirect == true) {
  app.use(function(req, res, next) {
    if (req.secure) {
      // continue without redirecting
      next();
    } else {
      // add webserver port to the host value if it does not already exist
      const host = req.headers.host + (req.headers.host.indexOf(':') > -1 ? '' : ':' + settings.webserver.port.toString());

      // redirect to the correct https page
      res.redirect(301, 'https://' + host.replace(':' + settings.webserver.port.toString(), (settings.webserver.tls.port != 443 ? ':' + settings.webserver.tls.port.toString() : '')) + req.url);
    }
  });
}

// determine if cors should be enabled
if (settings.webserver.cors.enabled == true) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", settings.webserver.cors.corsorigin);
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}

// loop through all plugins defined in the settings
settings.plugins.allowed_plugins.forEach(function (plugin) {
  // check if this plugin is enabled
  if (plugin.enabled) {
    const pluginName = (plugin.plugin_name == null ? '' : plugin.plugin_name);

    // check if the plugin exists in the plugins directory
    if (db.fs.existsSync(`./plugins/${pluginName}`)) {
      // check if the plugin's local_plugin_settings file exists
      if (db.fs.existsSync(`./plugins/${pluginName}/lib/local_plugin_settings.js`)) {
        // load the local_plugin_settings.js file from the plugin
        let localPluginSettings = require(`./plugins/${pluginName}/lib/local_plugin_settings`);

        // loop through all local plugin settings
        Object.keys(localPluginSettings).forEach(function(key, index, map) {
          // check if this is a known setting type that should be brought into the main settings
          if (key.endsWith('_page') && typeof localPluginSettings[key] === 'object' && localPluginSettings[key]['enabled'] == true) {
            // this is a page setting
            // add the page_id to the page setting
            localPluginSettings[key].page_id = key;

            // add the menu item title to the page setting
            localPluginSettings[key].menu_title = localPluginSettings['localization'][`${key}_menu_title`];

            // check if there is already a page for this plugin
            if (plugin.pages == null) {
              // initialize the pages array
              plugin.pages = [];
            }

            // add this page setting to the main plugin data
            plugin['pages'].push(localPluginSettings[key]);
          } else if (key == 'public_apis') {
            // this is a collection of new apis
            // check if there is an ext section
            if (localPluginSettings[key]['ext'] != null) {
              // loop through all ext apis for this plugin
              Object.keys(localPluginSettings[key]['ext']).forEach(function(extKey, extIndex, extMap) {
                // add the name of the api into the object
                localPluginSettings[key]['ext'][extKey]['api_name'] = extKey;

                // loop through all parameters for this api and replace them in the description string if applicable
                for (let p = 0; p < localPluginSettings[key]['ext'][extKey]['api_parameters'].length; p++)
                  localPluginSettings['localization'][`${extKey}_description`] = localPluginSettings['localization'][`${extKey}_description`].replace(new RegExp(`\\{${(p + 1)}}`, 'g'), localPluginSettings[key]['ext'][extKey]['api_parameters'][p]['parameter_name']);

                // add the localized api description into the object
                localPluginSettings[key]['ext'][extKey]['api_desc'] = localPluginSettings['localization'][`${extKey}_description`];
              });
            }

            // copy the entire public_apis section from the plugin into the main settings
            plugin.public_apis = localPluginSettings[key];
          }
        });
      }

      // check if the plugin's routes/index.js file exists
      if (db.fs.existsSync(`./plugins/${pluginName}/routes/index.js`)) {
        // get the plugin routes and save them to an array
        pluginRoutes.push(require(`./plugins/${pluginName}/routes/index`));

        // check if the plugin has a views directory
        if (db.fs.existsSync(`./plugins/${pluginName}/views`)) {
          // get the list of files in the views directory
          const files = db.fs.readdirSync(`./plugins/${pluginName}/views`);

          // filter the list of files to check if any have the .pug extension
          const pugFiles = files.filter(file => path.extname(file) === '.pug');

          // check if the plugin has 1 or more views
          if (pugFiles.length > 0) {
            // add this plugins view path to the list of view paths
            viewPaths.push(path.resolve(`./plugins/${pluginName}/views`));
          }
        }
      }
    }
  }
});

// view engine setup
app.set('views', viewPaths);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api', nodeapi.app);
app.use('/', routes);

// loop through all plugin routes and add them to the app
pluginRoutes.forEach(function (r) {
  app.use('/', r);
});

// post method to claim an address using verifymessage functionality
app.post('/claim', function(req, res) {
  // validate captcha if applicable
  validate_captcha(settings.claim_address_page.enable_captcha, req.body, function(captcha_error) {
    // check if there was a problem with captcha
    if (captcha_error) {
      // show the captcha error
      res.json({'status': 'failed', 'error': true, 'message': 'The captcha validation failed'});
    } else {
      // filter bad words if enabled
      filter_bad_words((req.body.message == null || req.body.message == '' ? '' : req.body.message), function(claim_error, message) {
        // check if there was an error or if the message was filtered
        if (claim_error != null) {
          // an error occurred with loading the bad-words filter
          res.json({'status': 'failed', 'error': true, 'message': 'Error loading the bad-words filter: ' + claim_error});
        } else if (message == req.body.message) {
          // call the verifymessage api
          lib.verify_message(req.body.address, req.body.signature, req.body.message, function(body) {
            if (body == false)
              res.json({'status': 'failed', 'error': true, 'message': 'Invalid signature'});
            else if (body == true) {
              db.update_claim_name(req.body.address, req.body.message, function(val) {
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
    }
  });
});

function validate_captcha(captcha_enabled, data, cb) {
  // check if captcha is enabled for the requested feature
  if (captcha_enabled == true) {
    // determine the captcha type
    if (settings.captcha.google_recaptcha3.enabled == true) {
      if (data.google_recaptcha3 != null) {
        const request = require('postman-request');

        request({uri: 'https://www.google.com/recaptcha/api/siteverify?secret=' + settings.captcha.google_recaptcha3.secret_key + '&response=' + data.google_recaptcha3, json: true}, function (error, response, body) {
          if (error) {
            // an error occurred while trying to validate the captcha
            return cb(true);
          } else if (body == null || body == '' || typeof body !== 'object') {
            // return data is invalid
            return cb(true);
          } else if (body.score == null || body.score < settings.captcha.google_recaptcha3.pass_score) {
            // captcha challenge failed
            return cb(true);
          } else {
            // captcha challenge passed
            return cb(false);
          }
        });
      } else {
        // a captcha response wasn't received
        return cb(true);
      }
    } else if (settings.captcha.google_recaptcha2.enabled == true) {
      if (data.google_recaptcha2 != null) {
        const request = require('postman-request');

        request({uri: 'https://www.google.com/recaptcha/api/siteverify?secret=' + settings.captcha.google_recaptcha2.secret_key + '&response=' + data.google_recaptcha2, json: true}, function (error, response, body) {
          if (error) {
            // an error occurred while trying to validate the captcha
            return cb(true);
          } else if (body == null || body == '' || typeof body !== 'object') {
            // return data is invalid
            return cb(true);
          } else if (body.success == null || body.success == false) {
            // captcha challenge failed
            return cb(true);
          } else {
            // captcha challenge passed
            return cb(false);
          }
        });
      } else {
        // a captcha response wasn't received
        return cb(true);
      }
    } else if (settings.captcha.hcaptcha.enabled == true) {
      if (data.hcaptcha != null) {
        const request = require('postman-request');

        request({uri: 'https://hcaptcha.com/siteverify?secret=' + settings.captcha.hcaptcha.secret_key + '&response=' + data.hcaptcha, json: true}, function (error, response, body) {
          if (error) {
            // an error occurred while trying to validate the captcha
            return cb(true);
          } else if (body == null || body == '' || typeof body !== 'object') {
            // return data is invalid
            return cb(true);
          } else if (body.success == null || body.success == false) {
            // captcha challenge failed
            return cb(true);
          } else {
            // captcha challenge passed
            return cb(false);
          }
        });
      } else {
        // a captcha response wasn't received
        return cb(true);
      }
    } else {
      // no captcha options are enabled
      return cb(false);
    }
  } else {
    // captcha is not enabled for this feature
    return cb(false);
  }
}

function filter_bad_words(msg, cb) {
  // check if the bad-words filter is enabled
  if (settings.claim_address_page.enable_bad_word_filter == true) {
    // import the bad-words dependency
    import('bad-words').then(function(module) {
      // load the bad-words filter
      const bad_word_lib = module.Filter;
      const bad_word_filter = new bad_word_lib();

       // return the filtered msg
      return cb(null, bad_word_filter.clean(msg));
    })
    .catch(function(err) {
      return cb(err, null);
    });
  } else {
    // return the msg without filtering for bad words
    return cb(null, msg);
  }
}

// post method to receive data from a plugin
app.post('/plugin-request', function(req, res) {
  const pluginLockName = 'plugin';

  // check if another plugin request is already running
  if (lib.is_locked([pluginLockName], true) == true)
    res.json({'status': 'failed', 'error': true, 'message': `Another plugin request is already running..`});
  else {
    // create a new plugin lock before checking the rest of the locks to minimize problems with running scripts at the same time
    lib.create_lock(pluginLockName);

    // check the backup, restore and delete locks since those functions would be problematic when updating data
    if (lib.is_locked(['backup', 'restore', 'delete'], true) == true) {
      lib.remove_lock(pluginLockName);
      res.json({'status': 'failed', 'error': true, 'message': `Another script has locked the database..`});
    } else {
      // all lock tests passed. OK to run plugin request

      let dataObject = {};

      try {
        // attempt to parse the POST data field into a JSON object
        dataObject = JSON.parse(req.body.data);
      } catch {
        // do nothing. errors will be handled below
      }

      // check if the dataObject was populated
      if (dataObject == null || JSON.stringify(dataObject) === '{}') {
        lib.remove_lock(pluginLockName);
        res.json({'status': 'failed', 'error': true, 'message': 'POST data is missing or not in the correct format'});
      } else {
        // check if the plugin secret code is correct and if the coin name was specified
        if (dataObject.plugin_data == null || settings.plugins.plugin_secret_code != dataObject.plugin_data.secret_code) {
          lib.remove_lock(pluginLockName);
          res.json({'status': 'failed', 'error': true, 'message': 'Secret code is missing or incorrect'});
        } else if (dataObject.plugin_data.coin_name == null || dataObject.plugin_data.coin_name == '') {
          lib.remove_lock(pluginLockName);
          res.json({'status': 'failed', 'error': true, 'message': 'Coin name is missing'});
        } else {
          const tableData = dataObject.table_data;

          // check if the table_data seems valid
          if (tableData == null || !Array.isArray(tableData)) {
            lib.remove_lock(pluginLockName);
            res.json({'status': 'failed', 'error': true, 'message': `table_data from POST data is missing or empty`});
          } else {
            const pluginName = (dataObject.plugin_data.plugin_name == null ? '' : dataObject.plugin_data.plugin_name);
            const pluginObj = settings.plugins.allowed_plugins.find(item => item.plugin_name === pluginName && pluginName != '');

            // check if the requested plugin was found in the settings
            if (pluginObj == null) {
              lib.remove_lock(pluginLockName);
              res.json({'status': 'failed', 'error': true, 'message': `Plugin '${pluginName}' is not defined in settings`});
            } else {
              // check if the requested plugin is enabled
              if (!pluginObj.enabled) {
                lib.remove_lock(pluginLockName);
                res.json({'status': 'failed', 'error': true, 'message': `Plugin '${pluginName}' is not enabled`});
              } else {
                // check if the plugin exists in the plugins directory
                if (!db.fs.existsSync(`./plugins/${pluginName}`)) {
                  lib.remove_lock(pluginLockName);
                  res.json({'status': 'failed', 'error': true, 'message': `Plugin '${pluginName}' is not installed in the plugins directory`});
                } else {
                  // check if the plugin's server_functions file exists
                  if (!db.fs.existsSync(`./plugins/${pluginName}/lib/server_functions.js`)) {
                    lib.remove_lock(pluginLockName);
                    res.json({'status': 'failed', 'error': true, 'message': `Plugin '${pluginName}' is missing the /lib/server_functions.js file`});
                  } else {
                    // load the server_functions.js file from the plugin
                    const serverFunctions = require(`./plugins/${pluginName}/lib/server_functions`);

                    // check if the process_plugin_request function exists
                    if (typeof serverFunctions.process_plugin_request !== 'function') {
                      lib.remove_lock(pluginLockName);
                      res.json({'status': 'failed', 'error': true, 'message': `Plugin '${pluginName}' is missing the process_plugin_request function`});
                    } else {
                      // call the process_plugin_request function to process the new table data
                      serverFunctions.process_plugin_request(dataObject.plugin_data.coin_name, tableData, settings.sync.update_timeout, function(response) {
                        lib.remove_lock(pluginLockName);
                        res.json(response);
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
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
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
});

app.use('/ext/gettx/:txid', function(req, res) {
  // check if the gettx api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.gettx.enabled == true) {
    var txid = req.params.txid;

    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.send({ active: 'tx', tx: tx, confirmations: (blockcount - tx.blockindex + 1), blockcount: (blockcount ? blockcount : 0)});
        });
      } else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx && rtx.txid) {
            lib.prepare_vin(rtx, function(vin, tx_type_vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, ((typeof rtx.vjoinsplit === 'undefined' || rtx.vjoinsplit == null) ? [] : rtx.vjoinsplit), function(rvout, rvin, tx_type_vout) {
                const total = lib.calculate_total(rvout);

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

                  res.send({ active: 'tx', tx: utx, confirmations: rtx.confirmations, blockcount:-1});
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
                    res.send({ active: 'tx', tx: utx, confirmations: rtx.confirmations, blockcount: (blockcount ? blockcount : 0)});
                  });
                }
              });
            });
          } else
            res.send({ error: 'tx not found.', hash: txid});
        });
      }
    });
  } else
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
});

app.use('/ext/getcurrentprice', function(req, res) {
  // check if the getcurrentprice api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getcurrentprice.enabled == true) {
    db.get_stats(settings.coin.name, function (stats) {
      const currency = lib.get_market_currency_code();

      eval('var p_ext = { "last_price_' + currency.toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price, }');
      res.send(p_ext);
    });
  } else
    res.end(settings.localization.method_disabled);
});

app.use('/ext/getbasicstats', function(req, res) {
  // check if the getbasicstats api is enabled
  if (settings.api_page.enabled == true && settings.api_page.public_apis.ext.getbasicstats.enabled == true) {
    // lookup stats
    db.get_stats(settings.coin.name, function (stats) {
      const currency = lib.get_market_currency_code();

      // check if the masternode count api is enabled
      if (settings.api_page.public_apis.rpc.getmasternodecount.enabled == true && settings.api_cmds['getmasternodecount'] != null && settings.api_cmds['getmasternodecount'] != '') {
        // masternode count api is available
        lib.get_masternodecount(function(masternodestotal) {
          eval('var p_ext = { "block_count": (stats.count ? stats.count : 0), "money_supply": (stats.supply ? stats.supply : 0), "last_price_' + currency.toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price, "masternode_count": masternodestotal.total }');
          res.send(p_ext);
        });
      } else {
        // masternode count api is not available
        eval('var p_ext = { "block_count": (stats.count ? stats.count : 0), "money_supply": (stats.supply ? stats.supply : 0), "last_price_' + currency.toLowerCase() + '": stats.last_price, "last_price_usd": stats.last_usd_price }');
        res.send(p_ext);
      }
    });
  } else
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
});

function get_connection_and_block_counts(get_data, cb) {
  // check if the connection and block counts should be returned
  if (get_data) {
    lib.get_connectioncount(function(connections) {
      lib.get_blockcount(function(blockcount) {
        return cb(connections, blockcount);
      });
    });
  } else
    return cb(null, null);
}

app.use('/ext/getsummary', function(req, res) {
  const isInternal = (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1);

  // check if the getsummary api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getsummary.enabled == true) || isInternal) {
    // check if this is a footer-only method that should only return the connection count and block count
    if (req.headers['footer-only'] != null && req.headers['footer-only'] == 'true') {
      // only return the connection count and block count
      get_connection_and_block_counts(true, function(connections, blockcount) {
        res.send({
          connections: (connections ? connections : '-'),
          blockcount: (blockcount ? blockcount : '-')
        });
      });
    } else {
      // get the connection and block counts only if this is NOT an internal call
      get_connection_and_block_counts(!isInternal, function(connections, blockcount) {
        lib.get_hashrate(function(hashrate) {
          db.get_stats(settings.coin.name, function (stats) {
            lib.get_masternodecount(function(masternodestotal) {
              lib.get_difficulty(function(difficulty) {
                let difficultyHybrid = '';

                if (difficulty && difficulty['proof-of-work']) {
                  if (settings.shared_pages.difficulty == 'Hybrid') {
                    difficultyHybrid = 'POS: ' + difficulty['proof-of-stake'];
                    difficulty = 'POW: ' + difficulty['proof-of-work'];
                  } else if (settings.shared_pages.difficulty == 'POW')
                    difficulty = difficulty['proof-of-work'];
                  else
                    difficulty = difficulty['proof-of-stake'];
                }

                if (hashrate == `${settings.localization.ex_error}: ${settings.localization.check_console}`)
                  hashrate = 0;

                let mn_total = 0;
                let mn_enabled = 0;

                // check if the masternode count api is enabled
                if (settings.api_page.public_apis.rpc.getmasternodecount.enabled == true && settings.api_cmds['getmasternodecount'] != null && settings.api_cmds['getmasternodecount'] != '') {
                  // masternode count api is available
                  if (masternodestotal) {
                    if (masternodestotal.total)
                      mn_total = masternodestotal.total;

                    if (masternodestotal.enabled)
                      mn_enabled = masternodestotal.enabled;
                  }
                }

                res.send({
                  difficulty: (difficulty ? difficulty : '-'),
                  difficultyHybrid: difficultyHybrid,
                  supply: (stats == null || stats.supply == null ? 0 : stats.supply),
                  hashrate: hashrate,
                  lastPrice: (stats == null || stats.last_price == null ? 0 : stats.last_price),
                  lastUSDPrice: (stats == null || stats.last_usd_price == null ? 0 : stats.last_usd_price),
                  connections: (connections ? connections : '-'),
                  blockcount: (blockcount ? blockcount : '-'),
                  masternodeCountOnline: (masternodestotal && mn_enabled != 0 ? mn_enabled : '-'),
                  masternodeCountOffline: (masternodestotal && mn_total != 0 ? Math.floor(mn_total - mn_enabled) : '-')
                });
              });
            });
          });
        });
      });
    }
  } else
    res.end(settings.localization.method_disabled);
});

app.use('/ext/getnetworkpeers', function(req, res) {
  // check if the getnetworkpeers api is enabled or else check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if ((settings.api_page.enabled == true && settings.api_page.public_apis.ext.getnetworkpeers.enabled == true) || (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1)) {
    // split url suffix by forward slash and remove blank entries
    const split = req.url.split('/').filter(function(v) { return v; });
    let internal = false;

    // check if this is an internal request
    if (split.length > 0 && split[0] == 'internal')
      internal = true;

    // get list of peers
    db.get_peers(!internal, function(connection_peers, addnode_peers, onetry_peers) {
      // return peer data
      if (internal)
        res.json({'connection_peers': connection_peers, 'addnode_peers': addnode_peers, 'onetry_peers': onetry_peers});
      else {
        // remove ipv6 and table_type fields before outputting the api data
        connection_peers.forEach(function (peer) {
          delete peer.ipv6;
          delete peer.table_type;
        });

        res.json(connection_peers);
      }
    });
  } else
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
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
    res.end(settings.localization.method_disabled);
});

// get the list of orphans from local collection
app.use('/ext/getorphanlist/:start/:length', function(req, res) {
  // check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1) {
    // fix parameters
    if (typeof req.params.start === 'undefined' || isNaN(req.params.start) || req.params.start < 0)
      req.params.start = 0;
    if (typeof req.params.length === 'undefined' || isNaN(req.params.length))
      req.params.length = 10;

    // get the orphan list from local collection
    db.get_orphans(req.params.start, req.params.length, function(orphans, count) {
      var data = [];

      for (i = 0; i < orphans.length; i++) {
        var row = [];

        row.push(orphans[i].blockindex);
        row.push(orphans[i].orphan_blockhash);
        row.push(orphans[i].good_blockhash);
        row.push(orphans[i].prev_blockhash);
        row.push(orphans[i].next_blockhash);

        data.push(row);
      }

      // display data formatted for internal datatable
      res.json({"data": data, "recordsTotal": count, "recordsFiltered": count});
    });
  } else
    res.end(settings.localization.method_disabled);
});

// get the last updated date for a particular section
app.use('/ext/getlastupdated/:section', function(req, res) {
  // check the headers to see if it matches an internal ajax request from the explorer itself (TODO: come up with a more secure method of whitelisting ajax calls from the explorer)
  if (req.headers['x-requested-with'] != null && req.headers['x-requested-with'].toLowerCase() == 'xmlhttprequest' && req.headers.referer != null && req.headers.accept.indexOf('text/javascript') > -1 && req.headers.accept.indexOf('application/json') > -1) {
    // fix parameters
    if (req.params.section == null)
      req.params.section = '';

    switch (req.params.section.toLowerCase()) {
      case 'blockchain':
      case 'movement':
        // lookup last updated date
        db.get_stats(settings.coin.name, function (stats) {
          res.json({'last_updated_date': stats.blockchain_last_updated});
        });
        break;
      default:
        res.send({error: 'Cannot find last updated date'});
    }
  } else
    res.end(settings.localization.method_disabled);
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
    var err = new Error(settings.localization.error_not_found);
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

  // fix default exchange name case
  if (settings.markets_page.default_exchange.exchange_name != null)
    settings.markets_page.default_exchange.exchange_name = settings.markets_page.default_exchange.exchange_name.toLowerCase();
  else
    settings.markets_page.default_exchange.exchange_name = '';

  // fix default exchange trading pair case
  if (settings.markets_page.default_exchange.trading_pair != null)
    settings.markets_page.default_exchange.trading_pair = settings.markets_page.default_exchange.trading_pair.toUpperCase();
  else
    settings.markets_page.default_exchange.trading_pair = '';

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
  } else if (ex[ex_name].trading_pairs.findIndex(p => p.toUpperCase() == ex_pair.toUpperCase()) == -1) {
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
      console.log('WARNING: ' + ex_error + '. ' + 'Default exchange will be set to' + ': ' + ex_keys[new_default_index] + '[' + ex[ex_keys[new_default_index]].trading_pairs[0].toUpperCase() + ']');
      // set new default exchange data
      settings.markets_page.default_exchange.exchange_name = ex_keys[new_default_index];
      settings.markets_page.default_exchange.trading_pair = ex[ex_keys[new_default_index]].trading_pairs[0].toUpperCase();
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
app.set('localization', settings.localization);
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
app.set('orphans_page', settings.orphans_page);
app.set('captcha', settings.captcha);
app.set('labels', settings.labels);
app.set('default_coingecko_ids', settings.default_coingecko_ids);
app.set('api_cmds', settings.api_cmds);
app.set('blockchain_specific', settings.blockchain_specific);
app.set('plugins', settings.plugins);

// determine panel offset based on which panels are enabled
var paneltotal = 5;
var panelcount = (settings.shared_pages.page_header.panels.network_panel.enabled == true && settings.shared_pages.page_header.panels.network_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.difficulty_panel.enabled == true && settings.shared_pages.page_header.panels.difficulty_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.masternodes_panel.enabled == true && settings.shared_pages.page_header.panels.masternodes_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.coin_supply_panel.enabled == true && settings.shared_pages.page_header.panels.coin_supply_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.price_panel.enabled == true && settings.shared_pages.page_header.panels.price_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.usd_price_panel.enabled == true && settings.shared_pages.page_header.panels.usd_price_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.market_cap_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.usd_market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.usd_market_cap_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.logo_panel.enabled == true && settings.shared_pages.page_header.panels.logo_panel.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.spacer_panel_1.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_1.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.spacer_panel_2.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_2.display_order > 0 ? 1 : 0) +
  (settings.shared_pages.page_header.panels.spacer_panel_3.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_3.display_order > 0 ? 1 : 0);
app.set('paneloffset', paneltotal + 1 - panelcount);

// determine panel order
var panel_order = new Array();

if (settings.shared_pages.page_header.panels.network_panel.enabled == true && settings.shared_pages.page_header.panels.network_panel.display_order > 0) panel_order.push({name: 'network_panel', val: settings.shared_pages.page_header.panels.network_panel.display_order});
if (settings.shared_pages.page_header.panels.difficulty_panel.enabled == true && settings.shared_pages.page_header.panels.difficulty_panel.display_order > 0) panel_order.push({name: 'difficulty_panel', val: settings.shared_pages.page_header.panels.difficulty_panel.display_order});
if (settings.shared_pages.page_header.panels.masternodes_panel.enabled == true && settings.shared_pages.page_header.panels.masternodes_panel.display_order > 0) panel_order.push({name: 'masternodes_panel', val: settings.shared_pages.page_header.panels.masternodes_panel.display_order});
if (settings.shared_pages.page_header.panels.coin_supply_panel.enabled == true && settings.shared_pages.page_header.panels.coin_supply_panel.display_order > 0) panel_order.push({name: 'coin_supply_panel', val: settings.shared_pages.page_header.panels.coin_supply_panel.display_order});
if (settings.shared_pages.page_header.panels.price_panel.enabled == true && settings.shared_pages.page_header.panels.price_panel.display_order > 0) panel_order.push({name: 'price_panel', val: settings.shared_pages.page_header.panels.price_panel.display_order});
if (settings.shared_pages.page_header.panels.usd_price_panel.enabled == true && settings.shared_pages.page_header.panels.usd_price_panel.display_order > 0) panel_order.push({name: 'usd_price_panel', val: settings.shared_pages.page_header.panels.usd_price_panel.display_order});
if (settings.shared_pages.page_header.panels.market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.market_cap_panel.display_order > 0) panel_order.push({name: 'market_cap_panel', val: settings.shared_pages.page_header.panels.market_cap_panel.display_order});
if (settings.shared_pages.page_header.panels.usd_market_cap_panel.enabled == true && settings.shared_pages.page_header.panels.usd_market_cap_panel.display_order > 0) panel_order.push({name: 'usd_market_cap_panel', val: settings.shared_pages.page_header.panels.usd_market_cap_panel.display_order});
if (settings.shared_pages.page_header.panels.logo_panel.enabled == true && settings.shared_pages.page_header.panels.logo_panel.display_order > 0) panel_order.push({name: 'logo_panel', val: settings.shared_pages.page_header.panels.logo_panel.display_order});
if (settings.shared_pages.page_header.panels.spacer_panel_1.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_1.display_order > 0) panel_order.push({name: 'spacer_panel_1', val: settings.shared_pages.page_header.panels.spacer_panel_1.display_order});
if (settings.shared_pages.page_header.panels.spacer_panel_2.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_2.display_order > 0) panel_order.push({name: 'spacer_panel_2', val: settings.shared_pages.page_header.panels.spacer_panel_2.display_order});
if (settings.shared_pages.page_header.panels.spacer_panel_3.enabled == true && settings.shared_pages.page_header.panels.spacer_panel_3.display_order > 0) panel_order.push({name: 'spacer_panel_3', val: settings.shared_pages.page_header.panels.spacer_panel_3.display_order});

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

// error handler - will print stacktrace when in development mode, otherwise no stacktraces will be leaked to the user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: (app.get('env') === 'development' ? err : {})
  });
});

// determine if tls features should be enabled
if (settings.webserver.tls.enabled == true) {
  function readCertsSync() {
    var tls_options = {};

    try {
      tls_options = {
        key: db.fs.readFileSync(settings.webserver.tls.key_file),
        cert: db.fs.readFileSync(settings.webserver.tls.cert_file),
        ca: db.fs.readFileSync(settings.webserver.tls.chain_file)
      };
    } catch(e) {
      console.warn('There was a problem reading tls certificates. Check that the certificate, chain and key paths are correct.');
    }

    return tls_options;
  }

  const https = require('https');
  let httpd = https.createServer(readCertsSync(), app).listen(settings.webserver.tls.port);

  try {
    let waitForCertsToRefresh;

    // watch for changes to the certificate directory
    db.fs.watch(path.dirname(settings.webserver.tls.key_file), () => {
      clearTimeout(waitForCertsToRefresh);

      // refresh certificates as they are changed on disk
      waitForCertsToRefresh = setTimeout(() => {
        httpd.setSecureContext(readCertsSync());
      }, 1000);
    });
  } catch(e) {
    console.warn('There was a problem reading tls certificates. Check that the certificate, chain and key paths are correct.');
  }
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