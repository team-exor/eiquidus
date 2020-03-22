/**
* The Settings Module reads the settings out of settings.json and provides
* this information to the other modules
*/

var fs = require("fs");
var jsonminify = require("jsonminify");

//The app title, visible e.g. in the browser window
exports.title = "eIquidus";

//The url it will be accessed from
exports.address = "explorer.example.com";

//logo
exports.logo = "/images/logo.png";

//The app favicon fully specified url, visible e.g. in the browser window
exports.favicon = "public/favicon.ico";

//What is displayed for the home button in the top-left corner (valid options are: title, coin, logo)
exports.homelink = "coin";

// home link logo height (value in px, only valid if using homelink = 'logo')
exports.logoheight = 50;

//Theme
exports.theme = "Exor";

//The Port ep-lite should listen to
exports.port = process.env.PORT || 3001;

//coin symbol, visible e.g. MAX, LTC, HVC
exports.symbol = "EXOR";

//coin name, visible e.g. in the browser window
exports.coin = "Exor";

//This setting is passed to MongoDB to set up the database
exports.dbsettings = {
  "user": "eiquidus",
  "password": "Nd^p2d77ceBX!L",
  "database": "blockchaindb",
  "address" : "localhost",
  "port" : 27017
};

//This setting is passed to the wallet
exports.wallet = { "host" : "127.0.0.1",
  "port" : 51573,
  "user" : "exorrpc",
  "pass" : "sSTLyCkrD94Y8&9mr^m6W^Mk367Vr!!K"
};

//Locale file
exports.locale = "locale/en.json",

//Menu and panel items to display
// set a number to pnl variables to change the panel display order. lowest # = far left panel, highest # = far right panel, 0 = do not show panel
exports.display = {
  "api": true,
  "market": true,
  "twitter": false,
  "facebook": false,
  "googleplus": false,
  "bitcointalk": false,
  "website": false,
  "slack": false,
  "github": false,
  "discord": false,
  "telegram": false,
  "reddit": false,
  "youtube": false,
  "search": true,
  "richlist": true,
  "movement": true,
  "network": true,
  "networkpnl": 1,
  "difficultypnl": 2,
  "masternodespnl": 3,
  "coinsupplypnl": 4,
  "pricepnl": 5
};

//API view
exports.api = {
  "blockindex": 6415,
  "blockhash": "dd17105f9e3d79c553b3670001e0243dd21378f4f90a340d87c0e5eb0b44dfd4",
  "txhash": "2af5cc842d18814b45db44b62411c8a47987fc3c56294af38572989de5c1f7d5",
  "address": "EaqHssmmgEPCxaeczbZnoqM6vutv9xmhrZ",
};

// markets
exports.markets = {
  "coin": "EXOR",
  "exchange": "BTC",
  "enabled": [],
  "stex_id": "",
  "default": ""
};

// richlist/top100 settings
exports.richlist = {
  "distribution": true,
  "received": true,
  "balance": true
};

exports.movement = {
  "min_amount": 100,
  "low_flag": 1000,
  "high_flag": 10000
},

//index
exports.index = {
  "show_hashrate": false,
  "difficulty": "POS",
  "last_txs": 100
};

// twitter, facebook, googleplus, bitcointalk, github, slack, discord, telegram, reddit, youtube, website
exports.twitter = "your-twitter-username";
exports.facebook = "your-facebook-username";
exports.googleplus = "your-google-plus-username";
exports.bitcointalk = "your-bitcointalk-topic-value";
exports.github = "your-github-username/your-github-repo";
exports.slack = "your-full-slack-invite-url";
exports.discord = "your-full-discord-invite-url";
exports.telegram = "your-telegram-group-or-channel-name";
exports.reddit = "your-subreddit-name";
exports.youtube = "your-full-youtube-url";
exports.website = "your-full-website-url";

exports.confirmations = 6;

//timeouts
exports.update_timeout = 125;
exports.check_timeout = 250;

//genesis
exports.genesis_tx = "dd1d332ad2d8d8f49195056d482ae3c96fd2d16e9d166413b27ca7f19775644c";
exports.genesis_block = "0000860fcf946b44df0e7d85d6757d45f8de6f4c9aacc5c7b6abc13db1f68819";

exports.heavy = false;
exports.txcount = 100;
exports.show_sent_received = true;
exports.supply = "TXOUTSET";
exports.nethash = "getnetworkhashps";
exports.nethash_units = "G";

// simple Cross-Origin Resource Sharing (CORS) support
// enabling this feature will add a new output header to all requests like this: Access-Control-Allow-Origin: <corsorigin>
// corsorigin "*" will allow any origin to access the requested resource while specifying any other value for corsorigin will allow cross-origin requests only when the request is made from a source that matches the corsorigin filter
exports.usecors = false;
exports.corsorigin = "*";

exports.labels = {};
exports.burned_coins = [];

// Customized API commands
exports.api_cmds = {
  "masternode_count": "getmasternodecount"
};

exports.reloadSettings = function reloadSettings() {
  // Discover where the settings file lives
  var settingsFilename = "settings.json";
  settingsFilename = "./" + settingsFilename;

  var settingsStr;
  try{
    //read the settings sync
    settingsStr = fs.readFileSync(settingsFilename).toString();
  } catch(e){
    console.warn('No settings file found. Continuing using defaults!');
  }

  // try to parse the settings
  var settings;
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      settings = JSON.parse(settingsStr);
    }
  }catch(e){
    console.error('There was an error processing your settings.json file: '+e.message);
    process.exit(1);
  }

  //loop trough the settings
  for(var i in settings)
  {
    //test if the setting start with a low character
    if(i.charAt(0).search("[a-z]") !== 0)
    {
      console.warn("Settings should start with a low character: '" + i + "'");
    }

    //we know this setting, so we overwrite it
    if(exports[i] !== undefined)
    {
      exports[i] = settings[i];
    }
    //this setting is unkown, output a warning and throw it away
    else
    {
      console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed");
    }
  }
};

// initially load settings
exports.reloadSettings();