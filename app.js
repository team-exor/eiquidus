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
  , locale = require('./lib/locale')
  , request = require('postman-request');

var app = express();

// nodeapi
nodeapi.setWalletDetails(settings.wallet);
if (settings.heavy != true) {
  nodeapi.setAccess('only', ['getinfo', 'getnetworkhashps', 'getmininginfo','getdifficulty', 'getconnectioncount',
  'getmasternodecount', 'getmasternodelist', 'getvotelist', 'getblockcount', 'getblockhash', 'getblock', 'getrawtransaction', 
  'getpeerinfo', 'gettxoutsetinfo']);
} else {
  // enable additional heavy api calls
  /*
    getvote - Returns the current block reward vote setting.
    getmaxvote - Returns the maximum allowed vote for the current phase of voting.
    getphase - Returns the current voting phase ('Mint', 'Limit' or 'Sustain').
    getreward - Returns the current block reward, which has been decided democratically in the previous round of block reward voting.
    getnextrewardestimate - Returns an estimate for the next block reward based on the current state of decentralized voting.
    getnextrewardwhenstr - Returns string describing how long until the votes are tallied and the next block reward is computed.
    getnextrewardwhensec - Same as above, but returns integer seconds.
    getsupply - Returns the current money supply.
    getmaxmoney - Returns the maximum possible money supply.
  */
  nodeapi.setAccess('only', ['getinfo', 'getstakinginfo', 'getnetworkhashps', 'getdifficulty', 'getconnectioncount',
    'getmasternodecount', 'getmasternodelist', 'getvotelist', 'getblockcount', 'getblockhash', 
    'getblock', 'getrawtransaction', 'getmaxmoney', 'getvote', 'getmaxvote', 'getphase', 'getreward', 'getpeerinfo', 
    'getnextrewardestimate', 'getnextrewardwhenstr', 'getnextrewardwhensec', 'getsupply', 'gettxoutsetinfo']);
}
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
app.use('/ext/getmoneysupply', function(req,res){
  lib.get_supply(function(supply){
    res.setHeader('content-type', 'text/plain');
    res.end(supply.toString());
  });
});

app.use('/ext/getaddress/:hash', function(req,res){
  db.get_address(req.params.hash, false, function(address){
    if (address) {
      var a_ext = {
        address: address.a_id,
        sent: (address.sent / 100000000),
        received: (address.received / 100000000),
        balance: (address.balance / 100000000).toString().replace(/(^-+)/mg, ''),
        last_txs: address.txs,
      };
      res.send(a_ext);
    } else {
      res.send({ error: 'address not found.', hash: req.params.hash})
    }
  });
});

app.use('/ext/getbalance/:hash', function(req,res){
  db.get_address(req.params.hash, false, function(address){
    if (address) {
      res.setHeader('content-type', 'text/plain');
      res.end((address.balance / 100000000).toString().replace(/(^-+)/mg, ''));
    } else {
      res.send({ error: 'address not found.', hash: req.params.hash})
    }
  });
});

app.use('/ext/getdistribution', function(req,res){
  db.get_richlist(settings.coin, function(richlist){
    db.get_stats(settings.coin, function(stats){
      db.get_distribution(richlist, stats, function(dist){
        res.send(dist);
      });
    });
  });
});

app.use('/ext/getlasttxs/:min', function(req,res){
  db.get_last_txs(settings.index.last_txs, (req.params.min * 100000000), function(txs){
    res.send({data: txs});
  });
});

app.use('/ext/getcurrentprice', function(req,res){
  db.get_stats(settings.coin, function (stats) {
	  eval('var p_ext = { "last_price_'+settings.markets.exchange.toLowerCase()+'": stats.last_price, "last_price_usd": stats.last_usd_price, }');
      res.send(p_ext);
  });
});

app.use('/ext/getbasicstats', function(req,res){
  lib.get_blockcount(function(blockcount){
    lib.get_supply(function(supply){
      db.get_stats(settings.coin, function (stats){
		lib.get_masternodecount(function(masternodestotal){  
          eval('var p_ext = { "block_count": blockcount, "money_supply": supply, "last_price_'+settings.markets.exchange.toLowerCase()+'": stats.last_price, "last_price_usd": stats.last_usd_price, "masternode_count": masternodestotal.total }');
          res.send(p_ext);
        });
	  });
    });
  });
});

app.use('/ext/connections', function(req,res){
  db.get_peers(function(peers){
    res.send({data: peers});
  });
});

// locals
app.set('title', settings.title);
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
app.set('heavy', settings.heavy);
app.set('txcount', settings.txcount);
app.set('nethash', settings.nethash);
app.set('nethash_units', settings.nethash_units);
app.set('show_sent_received', settings.show_sent_received);
app.set('logo', settings.logo);
app.set('theme', settings.theme);
app.set('labels', settings.labels);
app.set('homelink', settings.homelink);
app.set('logoheight', settings.logoheight);
app.set('burned_coins', settings.burned_coins);

// determine panel offset based on which panels are enabled
var paneltotal=5;
var panelcount=(settings.display.networkpnl > 0 ? 1 : 0)+(settings.display.difficultypnl > 0 ? 1 : 0)+(settings.display.masternodespnl > 0 ? 1 : 0)+(settings.display.coinsupplypnl > 0 ? 1 : 0)+(settings.display.pricepnl > 0 ? 1 : 0);
app.set('paneloffset', paneltotal+1-panelcount);

// determine panel order
var panelorder = new Array();
if (settings.display.networkpnl > 0) panelorder.push({name: 'networkpnl', val: settings.display.networkpnl});
if (settings.display.difficultypnl > 0) panelorder.push({name: 'difficultypnl', val: settings.display.difficultypnl});
if (settings.display.masternodespnl > 0) panelorder.push({name: 'masternodespnl', val: settings.display.masternodespnl});
if (settings.display.coinsupplypnl > 0) panelorder.push({name: 'coinsupplypnl', val: settings.display.coinsupplypnl});
if (settings.display.pricepnl > 0) panelorder.push({name: 'pricepnl', val: settings.display.pricepnl});
panelorder.sort(function(a,b) { return a.val - b.val; });
for (var i=1; i<6; i++) {
  app.set('panel'+i.toString(), ((panelorder.length >= i) ? panelorder[i-1].name : ''));
}

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
