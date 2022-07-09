/**
* The Locale Module reads the locale settings and provides
* this information to the other modules
*/

var fs = require("fs");
var jsonminify = require("jsonminify");
var settings = require("./settings");

exports.menu_explorer = "Explorer",
exports.menu_api = "API",
exports.menu_markets = "Markets",
exports.menu_richlist = "Rich List",
exports.menu_reward = "Reward",
exports.menu_movement = "Movement",
exports.menu_node = "Nodes",
exports.menu_network = "Network",
exports.menu_claim_address = "Claim Address",

exports.ex_title = "{1} Block Explorer",
exports.ex_description = "A listing of all verified {1} transactions",
exports.ex_search_title = "Search",
exports.ex_search_button = "Search",
exports.ex_search_message = "Search by block height, block hash, tx hash or address",
exports.ex_error = "Error!",
exports.ex_warning = "Warning",
exports.ex_search_error = "Search found no results.",
exports.ex_latest_transactions = "Latest Transactions",
exports.ex_summary = "Block Summary",
exports.ex_supply = "Coin Supply",
exports.ex_block = "Block",

exports.tx_title = "{1} Transaction Details",
exports.tx_description = "Viewing tx data from {1} block # {2}",
exports.tx_block_hash = "Block Hash",
exports.tx_recipients = "Recipients",
exports.tx_contributors = "Contributor(s)",
exports.tx_hash = "Tx Hash",
exports.tx_address = "Address",
exports.tx_nonstandard = "NONSTANDARD TX",
exports.view_raw_tx_data = "View Raw Transaction Data",
exports.view_block = "View Block",

exports.block_title = "{1} Block Details",
exports.block_description = "Viewing block data from {1} block # {2}",
exports.block_previous = "Previous Block",
exports.block_next = "Next Block",
exports.block_genesis = "GENESIS",
exports.view_raw_block_data = "View Raw Block Data",
exports.view_tx = "View Transaction",

exports.error_title = "{1} Block Explorer Error",
exports.error_description = "The page you are looking for cannot be found",
exports.error_description_alt = "An error occurred which prevented the page from loading correctly",

exports.difficulty = "Difficulty",
exports.network = "Network",
exports.masternodecount = "Masternodes",
exports.height = "Height",
exports.timestamp = "Timestamp",
exports.size = "Size",
exports.transactions = "Transactions",
exports.total_sent = "Total Sent",
exports.total_received = "Total Received",
exports.confirmations = "Confirmations",
exports.total = "Total",
exports.total_top_100 = "Top 1-100 Total",
exports.bits = "Bits",
exports.nonce = "Nonce",
exports.new_coins = "New Coins",
exports.proof_of_stake = "PoS",
exports.hidden_address = "Hidden Address",
exports.hidden_sender = "Hidden Sender",
exports.hidden_recipient = "Hidden Recipient",
exports.unknown_address = "Unknown Address",
exports.unknown_sender = "Unknown Sender",
exports.unknown_recipient = "Unknown Recipient",
exports.last_updated = "Last Updated",
exports.initial_index_alert = "Blockchain data is currently being synchronized. You may browse the site during this time, but keep in mind that data may not yet be fully accurate and some functionality may not work until synchronization is complete.",

exports.a_title = "{1} Wallet Address Details",
exports.a_description = "Viewing balance and transaction data from {1} address {2}",
exports.a_menu_showing = "Showing",
exports.a_menu_txs = "transactions",
exports.a_menu_all = "All",
exports.a_qr = "QR Code",

exports.mn_title = "{1} Masternodes",
exports.mn_description = "A listing of all masternodes known to be active on the {1} network",
exports.mn_masternode_list = "Masternode List",

exports.move_title = "{1} Coin Movements",
exports.move_description = "A listing of larger movements where {1} or more {2} coins were sent in a single transaction",

exports.rl_title = "Top {1} Coin Holders",
exports.rl_description = "A listing of the richest {1} wallet addresses and breakdown of the current coin distribution",
exports.rl_received_coins = "Top 100 - Received Coins",
exports.rl_current_balance = "Top 100 - Current Balance",
exports.rl_received = "Received",
exports.rl_balance = "Balance",
exports.rl_wealth = "Wealth Distribution",
exports.rl_top25 = "Top 1-25",
exports.rl_top50 = "Top 26-50",
exports.rl_top75 = "Top 51-75",
exports.rl_top100 = "Top 76-100",
exports.rl_hundredplus = "101+",

exports.net_title = "{1} Network Peers",
exports.net_description = "A listing of {1} network peers that have connected to the explorer node in the last 24 hours",
exports.net_addnodes = "Add Nodes",
exports.net_connections = "Connections",
exports.net_address = "Address",
exports.net_protocol = "Protocol",
exports.net_subversion = "Sub-version",
exports.net_country = "Country",

exports.api_title = "{1} Public API",
exports.api_description = "A listing of public API endpoints for retrieving {1} coin data from the network without the need for a local wallet",
exports.api_documentation = "API Documentation",
exports.api_calls = "API Calls",
exports.api_getnetworkhashps = "Returns the current network hashrate. (hash/s)",
exports.api_getdifficulty = "Returns the current difficulty.",
exports.api_getconnectioncount = "Returns the number of connections the block explorer has to other nodes.",
exports.api_getmasternodelist = "Returns the complete list of masternodes on the network.",
exports.api_getmasternodecount = "Returns the total number of masternodes on the network.",
exports.api_getvotelist = "Returns the current vote list.",
exports.api_getblockcount = "Returns the number of blocks currently in the block chain.",
exports.api_getblockhash = "Returns the hash of the block at [index]; index 0 is the genesis block.",
exports.api_getblock = "Returns information about the block with the given hash.",
exports.api_getrawtransaction = "Returns raw transaction representation for given transaction id. decrypt can be set to 0(false) or 1(true).",
exports.api_getmaxmoney = 'Returns the maximum possible money supply.',
exports.api_getmaxvote = 'Returns the maximum allowed vote for the current phase of voting.',
exports.api_getvote = 'Returns the current block reward vote setting.',
exports.api_getphase = 'Returns the current voting phase (\'Mint\', \'Limit\' or \'Sustain\').',
exports.api_getreward = 'Returns the current block reward, which has been decided democratically in the previous round of block reward voting.',
exports.api_getsupply = 'Returns the current money supply.',
exports.api_getnextrewardestimate = 'Returns an estimate for the next block reward based on the current state of decentralized voting.',
exports.api_getnextrewardwhenstr =  'Returns a string describing how long until the votes are tallied and the next block reward is computed.',

// Markets view
exports.mkt_title = "{1} Market Details",
exports.mkt_description = "Viewing {1} market data for the {2} exchange",
exports.mkt_hours = "24 hours",
exports.mkt_view_chart = "View 24 hour summary",
exports.mkt_view_summary = "View 24 hour chart",
exports.mkt_no_chart = "Chart data is not available via markets API",
exports.mkt_high = "High",
exports.mkt_low = "Low",
exports.mkt_volume = "Volume",
exports.mkt_top_bid = "Top Bid",
exports.mkt_top_ask = "Top Ask",
exports.mkt_last = "Last Price",
exports.mkt_yesterday = "Yesterday",
exports.mkt_change = "Change",
exports.mkt_sell_orders = "Sell Orders",
exports.mkt_buy_orders = "Buy Orders",
exports.mkt_price = "Price",
exports.mkt_amount = "Amount",
exports.mkt_total = "Total",
exports.mkt_trade_history = "Trade History",
exports.mkt_type = "Type",
exports.mkt_time_stamp = "Time Stamp",
exports.mkt_select = "Market Select",

// Claim address view
exports.claim_title = "{1} Wallet Address Claim",
exports.claim_description = "Verify ownership of your {1} wallet address and set a custom display name in the explorer",

// Heavycoin
exports.heavy_vote = "Vote",
// Heavycoin rewards view
exports.heavy_title = "{1} Reward/Voting Details",
exports.heavy_description = "Viewing {1} voting data and coin reward change details",
exports.heavy_reward_voting_info = "Reward/voting information",
exports.heavy_cap = "Coin Cap",
exports.heavy_phase = "Phase",
exports.heavy_maxvote = "Max Vote",
exports.heavy_reward = "Reward",
exports.heavy_current = "Current Reward",
exports.heavy_estnext = "Est. Next",
exports.heavy_changein = "Reward change in approximately",
exports.heavy_key = "Key",
exports.heavy_lastxvotes = "Last 20 votes",

exports.reloadLocale = function reloadLocale(locale) {
  // discover where the locale file lives
  var localeFilename = "./" + locale;
  var localeStr;

  try {
    // read the settings sync
    localeStr = fs.readFileSync(localeFilename).toString();
  } catch(e) {
    console.warn('Locale file not found. Continuing using defaults!');
  }

  var lsettings;

  // try to parse the settings  
  try {
    if (localeStr) {
      localeStr = jsonminify(localeStr).replace(",]","]").replace(",}","}");
      lsettings = JSON.parse(localeStr);
    }
  } catch(e) {
    console.error('There was an error processing your locale file: '+e.message);
    process.exit(1);
  }

  // loop through the settings
  for (var i in lsettings) {
    // test if the setting start with a low character
    if (i.charAt(0).search("[a-z]") !== 0)
      console.warn("Settings should start with a low character: '" + i + "'");

    if (exports[i] !== undefined) {
      // we know this setting, so we overwrite it
      exports[i] = lsettings[i];
    } else {
      // this setting is unkown, output a warning and throw it away
      console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed");
    }
  }
};

// initially load settings
exports.reloadLocale(settings.locale);