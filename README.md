# eIquidus

### v1.0.1

Written in node.js and mongodb, eIquidus is the most stable, secure, customizable and feature-rich open-source block explorer with support for virtually any altcoin that implements some form of the [Bitcoin RPC API protocol](https://developer.bitcoin.org/reference/rpc/index.html). Originally built for the [Exor blockchain](https://github.com/team-exor/exor), eIquidus has since grown into a fully-featured explorer with a focus on stability and security at its core. All features from the [original iquidus explorer](https://github.com/iquidus/explorer) are included here along with many new ideas from other iquidus forks, and an absolute ton of new custom changes and bug fixes that were developed specifically for eIquidus.

#### Special Thanks
- **[Luke Williams (aka iquidus)](https://github.com/iquidus):** for creating the original [Iquidus explorer](https://github.com/iquidus/explorer)
- **[Alan Rudolf (aka suprnurd)](https://github.com/suprnurd):** for the custom changes found in the [Ciquidus explorer](https://github.com/suprnurd/ciquidus)
- **[Tim Garrity (aka uaktags)](https://github.com/uaktags):** for his many contributions to the Iquidus explorer and custom features from the [uaktags explorer](https://github.com/uaktags/explorer)
- **[TheHolyRoger](https://github.com/TheHolyRoger):** for his continued work and contributions to the Iquidus explorer
- All the rest of the Iquidus contributors who helped shape the Iquidus explorer in some way

<h3 class="rich-diff-level-zero" align="center" name="eiquidus-open-bounty-program">:moneybag: eIquidus Open Bounty Program :moneybag:</h3>
<h3 class="rich-diff-level-zero" align="center">:moneybag: DEVELOPERS WANTED: We pay EXOR coins for quality pull requests :moneybag:</h3>

Before getting too excited, please note that for now, the average payment will likely be equivalent to the price of a cup of coffee, depending on the complexity and usefullness of the pull request. The open bounty means that we welcome any and all code submissions that improve the overall experience of the explorer in some way. We are generally more interested in bug fixes and feature enhancements that are useful for most users, and are less interested in coin-specific changes that only benefit a small handful of users, although we do appreciate and support those types of updates as well. Payments will be decided on a case by case basis. If you are interested in submitting a pull request for payment, you may [create a new issue](https://github.com/team-exor/eiquidus/issues) for bugs, [start a new discussion](https://github.com/team-exor/eiquidus/discussions) for general updates, or contact the developer privately via Discord or Telegram using the links below to get an approximate quote on how much a particular fix or feature may be worth.

<div align="center">
<a href="https://discord.gg/dSuGm3y"><img src="https://img.shields.io/badge/Discord-Joe%20%5BTeam%20Exor%5D%235573-blue?style=for-the-badge&logo=Discord" /></a>&nbsp;
<a href="https://t.me/joeuhren"><img src="https://img.shields.io/badge/Telegram-joeuhren-blue?style=for-the-badge&logo=Telegram" /></a>
</div>

Table of Contents
------------------

- [Features](#features)
- [See it in Action](#see-it-in-action)
- [Installation](#installation)
  - [Full Setup Guide](#full-setup-guide)
  - [Quick Install Instructions](#quick-install-instructions)
    - [Pre-Install](#pre-install)
    - [Database Setup](#database-setup)
    - [Download Source Code](#download-source-code)
    - [Install Node Modules](#install-node-modules)
    - [Configure Explorer Settings](#configure-explorer-settings)
    - [Starting the Explorer](#starting-the-explorer)
    - [Stopping the Explorer](#stopping-the-explorer)
- [Syncing Databases with the Blockchain](#syncing-databases-with-the-blockchain)
  - [Sample Crontab](#sample-crontab)
- [Wallet Settings](#wallet-settings)
- [Forever](#forever)
  - [Install Forever](#install-forever)
  - [Starting the Explorer Using Forever](#starting-the-explorer-using-forever)
  - [Stopping the Explorer Using Forever](#stopping-the-explorer-using-forever)
- [Useful Scripts](#useful-scripts)
  - [Backup Database Script](#backup-database-script)
  - [Restore Database Script](#restore-database-script)
  - [Delete Database Script](#delete-database-script)
- [CORS Support](#cors-support)
  - [What is CORS?](#what-is-cors)
  - [How to Benefit From Using CORS?](#how-to-benefit-from-using-cors)
- [Known Issues](#known-issues)
- [How You Can Support Us](#how-you-can-support-us)
- [License](#license)

### Features

- Built using the following scripts and technologies:
  - Node.js (v14.15.4 or newer recommended)
  - MongoDB (v4.4.3 or newer recommended)
  - JQuery v3.5.1  
  - Bootstrap v4.5.3
  - DataTables v1.10.22
  - FontAwesome v5.15.1
  - jqPlot v1.0.9.d96a669
  - Chart.js v2.9.4
  - flag-icon-css v3.5.0 ([https://github.com/lipis/flag-icon-css](https://github.com/lipis/flag-icon-css))
- Mobile-friendly
- Sass support
- Pages/features:
  - **Home/Explorer:** Displays latest blockchain transactions
  - **Masternodes:** Displays the current listing of all masternodes known to be active on the network. *\*only applicable to masternode coins*
  - **Movement:** Displays latest blockchain transactions that are greater than a certain configurable amount
  - **Network:** Displays a list of peers that have connected to the coind wallet in the past 24 hours, along with useful addnode data that can be used to connect your own wallets to the network easier
  - **Top 100:** Displays the top 100 richest wallet addresses, the top 100 wallet addresses that have the highest total number of coins received based on adding up all received transactions, as well as a table and pie chart breakdown of wealth distribution. Additional support for omitting burned coins from top 100 lists
  - **Markets:** Displays a number of exchange-related metrics including market summary, 24 hour chart, most recent buy/sell orders and latest trade history. The following 7 cryptocurrency exchanges are supported:
    - [AltMarkets](https://altmarkets.io)
    - [Bittrex](https://bittrex.com)
    - [Bleutrade](https://bleutrade.com)
    - [Crex24](https://crex24.com/)
    - [Poloniex](https://poloniex.com/)
    - [Stex](https://stex.com/)
    - [Yobit](https://yobit.io) *\*no chart support due to yobit's lack of OHLCV api data*
  - **API:** A listing of available public API's that can be used to retrieve information from the network without the need for a local wallet. The following public API's are supported:
    - **RPC API calls** (Return data from coind)
      - **getdifficulty:** Returns the current difficulty
      - **getconnectioncount:** Returns the number of connections the block explorer has to other nodes
      - **getblockcount:** Returns the current block index
      - **getblockhash:** Returns the hash of the block at a specific index
      - **getblock:** Returns information about the block with the given hash
      - **getrawtransaction:** Returns raw transaction representation for given transaction id
      - **getnetworkhashps:** Returns the current network hashrate
      - **getvotelist:** Returns the current vote list
      - **getmasternodecount:** Returns the total number of masternodes on the network *\*only applicable to masternode coins*
    - **Extended API calls** (Return data from local indexes)
      - **getmoneysupply:** Returns current money supply
      - **getdistribution:** Returns wealth distribution stats
      - **getaddress:** Returns information for given address
      - **getaddresstxs:** Returns transactions for a wallet address starting from a particular offset
      - **gettx:** Returns information for given tx hash
      - **getbalance:** Returns current balance of given address
      - **getlasttxs:** Returns transactions greater than a specific number of coins, starting from a particular offset
      - **getcurrentprice:** Returns last known exchange price
      - **getbasicstats:** Returns basic statistics about the coin including: block count, circulating supply, USD price, BTC price and # of masternodes *\*# of masternodes is only applicable to masternode coins*
      - **getsummary:** Returns a summary of coin data including: difficulty, hybrid difficulty, circulating supply, hash rate, BTC price, network connection count, block count, count of online masternodes and count of offline masternodes *\*masternode counts are only applicable to masternode coins*
      - **getnetworkpeers:** Returns the list of network peers that have connected to the explorer node in the last 24 hours
      - **getmasternodelist:** Returns the complete list of masternodes on the network *\*only applicable to masternode coins*
      - **getmasternoderewards:** Returns a list of masternode reward transactions for a specific address that arrived after a specific block height *\*only applicable to masternode coins*
      - **getmasternoderewardstotal:** Returns the total number of coins earned in masternode rewards for a specific address that arrived after a specific block height *\*only applicable to masternode coins*
  - **Claim Address:** Allows anyone to set custom display names for wallet addresses that they own using the **Sign Message** feature from their local wallet. Includes *bad word* filter support.
  - **Block Info:** Displays block summary and list of transactions for a specific block height
  - **Transaction Info:** Displays transaction summary, list of input addresses and output addresses for a specific transaction
  - **Address Info:** Displays wallet address summary (balance, total sent, total received, QR code) and a list of latest transactions for a specific wallet address
- Choose from 22 built-in themes with tweakable settings such as light and dark options to customize the look and feel of the explorer:
  - **Exor** *\*default theme made especially for eIquidus*
  - **Cerulean** ([Preview](https://bootswatch.com/cerulean/))
  - **Cosmo** ([Preview](https://bootswatch.com/cosmo/))
  - **Cyborg** ([Preview](https://bootswatch.com/cyborg/))
  - **Darkly** ([Preview](https://bootswatch.com/darkly/))
  - **Flatly** ([Preview](https://bootswatch.com/flatly/))
  - **Journal** ([Preview](https://bootswatch.com/journal/))
  - **Litera** ([Preview](https://bootswatch.com/litera/))
  - **Lumen** ([Preview](https://bootswatch.com/lumen/))
  - **Lux** ([Preview](https://bootswatch.com/lux/))
  - **Materia** ([Preview](https://bootswatch.com/materia/))
  - **Minty** ([Preview](https://bootswatch.com/minty/))
  - **Pulse** ([Preview](https://bootswatch.com/pulse/))
  - **Sandstone** ([Preview](https://bootswatch.com/sandstone/))
  - **Simplex** ([Preview](https://bootswatch.com/simplex/))
  - **Sketchy** ([Preview](https://bootswatch.com/sketchy/))
  - **Slate** ([Preview](https://bootswatch.com/slate/))
  - **Solar** ([Preview](https://bootswatch.com/solar/))
  - **Spacelab** ([Preview](https://bootswatch.com/spacelab/))
  - **Superhero** ([Preview](https://bootswatch.com/superhero/))
  - **United** ([Preview](https://bootswatch.com/united/))
  - **Yeti** ([Preview](https://bootswatch.com/yeti/))
- Customizable panels at the top of every page to display the following information:
  - **Network:** Displays the current network hash rate *\*only applicable to POW coins*
  - **Difficulty:** Displays the current proof-of-work and/or proof-of-stake difficulty
  - **Masternodes:** Displays a count of online and unreachable masternodes *\*only applicable to masternode coins*
  - **Coin Supply:** Displays the current circulating coin supply value
  - **Price:** Displays the current market price in BTC
  - **Market Cap:** Displays the current market cap value in BTC
  - **Logo:** Display an image of your coin logo
- Add as many custom social links to the explorer footer as desired. Useful for linking to github, twitter, coinmarketcap or any other social media or external links as necessary. 
- Custom rpc/api command support which increases blockchain compatibility. Supported cmds:
  - **getnetworkhashps:** Returns the estimated network hashes per second
  - **getmininginfo:** Returns a json object containing mining-related information
  - **getdifficulty:** Returns the proof-of-work difficulty as a multiple of the minimum difficulty
  - **getconnectioncount:** Returns the number of connections to other nodes
  - **getblockcount:** Returns the number of blocks in the longest blockchain
  - **getblockhash:** Returns hash of block in best-block-chain at height provided
  - **getblock:** Returns an object with information about the block
  - **getrawtransaction:** Returns raw transaction data
  - **getinfo:** Returns an object containing various state info
  - **getpeerinfo:** Returns data about each connected network node as a json array of objects
  - **gettxoutsetinfo:** Returns an object with statistics about the unspent transaction output set
  - **getvotelist:** Returns an object with details regarding the current vote list
  - **getmasternodecount:** Returns a json object containing the total number of masternodes on the network
  - **getmasternodelist:** Returns a json array containing status information for all masternodes on the network
  - **verifymessage:** Verify a signed message. Must accept the following arguments:
    - **address:** The wallet address to use for the signature.
    - **signature:** The signature provided by the signer in base 64 encoding.
    - **message:** The message that was signed.
- Additional support for the following custom blockchain features:
  - Heavycoin democratic voting and reward support
    - **Reward Page:** Displays reward/voting information
    - Heavycoin rpc/api cmds:
      - **getmaxmoney:** Returns the number of coins that will be produced in total
      - **getmaxvote:** Returns the maximum allowed vote for the current phase of voting
      - **getvote:** Returns the current block reward vote setting
      - **getphase:** Returns the current voting phase name
      - **getreward:** Returns the current block reward
      - **getsupply:** Returns the current money supply
      - **getnextrewardestimate:** Returns an estimate for the next block reward based on the current state of decentralized voting
      - **getnextrewardwhenstr:** Returns a string describing how long until the votes are tallied and the next block reward is computed
    - Heavycoin public API's:
      - **getmaxmoney:** Returns the maximum possible money supply
      - **getmaxvote:** Returns the maximum allowed vote for the current phase of voting
      - **getvote:** Returns the current block reward vote setting
      - **getphase:** Returns the current voting phase
      - **getreward:** Returns the current block reward, which has been decided democratically in the previous round of block reward voting
      - **getsupply:** Returns the current money supply
      - **getnextrewardestimate:** Returns an estimate for the next block reward based on the current state of decentralized voting
      - **getnextrewardwhenstr:** Returns a string describing how long until the votes are tallied and the next block reward is computed
  - Partial Zcash/zk-SNARKs private tx support (90% complete)

### See it in Action

-  https://explorer.exor.io/

### Installation

#### Full Setup Guide

While we do not yet have our own step-by-step setup instructions, there are a few well-written guides out there already that detail how to set up and install the [original iquidus explorer](https://github.com/iquidus/explorer). Because the setup process for iquidus is more-or-less identical to eIquidus at this moment in time (making changes to settings.json is probably the biggest difference although we have helpful comments for each setting), here are some of the more complete guides that may be useful for anyone who needs more detailed instructions than are provided in the [Quick Install Instructions](#quick-install-instructions):

1. [The Ultimate Iquidus Explorer Installation Guide](https://stakeandnodes.net/iquidus-explorer-installation-guide)
2. [Node and Iquidus Explorer Setup for Dummies](https://gist.github.com/zeronug/5c66207c426a1d4d5c73cc872255c572)
3. [Iquidus Block Explorer Guide](https://www.reddit.com/r/BiblePay/comments/7elm7r/iquidus_block_explorer_guide)

#### Quick Install Instructions

##### Pre-Install

The following prerequisites must be installed before using the explorer:

- [Node.js](https://nodejs.org/en/) (v14.15.4 or newer recommended)
- [MongoDB](https://www.mongodb.com/) (v4.4.3 or newer recommended)
- A fully synchronized *coind* wallet daemon that supports the [Bitcoin RPC API protocol](https://developer.bitcoin.org/reference/rpc/index.html)

##### Database Setup

Open the MongoDB cli:

    $ mongo

Select database:

**NOTE:** `explorerdb` is the name of the database where you will be storing local explorer data. You can change this to any name you want, but you must make sure that you set the same name in the `settings.json` file for the `dbsettings.database` setting.

    > use explorerdb

Create a new user with read/write access:

    > db.createUser( { user: "eiquidus", pwd: "Nd^p2d77ceBX!L", roles: [ "readWrite" ] } )

##### Download Source Code

    git clone https://github.com/team-exor/eiquidus explorer

##### Install Node Modules

    cd explorer && npm install --production

##### Configure Explorer Settings

    cp ./settings.json.template ./settings.json

*Make required changes in settings.json*

##### Starting the Explorer

You can launch the explorer in a terminal window that will output all warnings and error msgs with the following cmd (be sure to run from within the explorer directory):

    npm start

**NOTE:** mongod must be running to start the explorer.

The explorer defaults to cluster mode, forking an instance of its process to each cpu core. This results in increased performance and stability. Load balancing gets automatically taken care of and any instances that for some reason die, will be restarted automatically. If desired, a single instance can be launched with:

    node --stack-size=10000 bin/instance

##### Stopping the Explorer

To stop the explorer running with `npm start` you can end the process with the key combination `CTRL+C` in the terminal that is running the explorer or from another terminal you can use the following cmd (be sure to run from within the explorer directory):

    npm stop

### Syncing Databases with the Blockchain

sync.sh (located in scripts/) is used for updating the local databases. This script must be called from the explorers root directory.

    Usage: scripts/sync.sh /path/to/nodejs [mode]

    Mode: (required)
    update           Updates index from last sync to current block
    check            Checks index for (and adds) any missing transactions/addresses
    reindex          Clears index then resyncs from genesis to current block
    reindex-rich     Clears and recreates the richlist data
    reindex-txcount  Rescan and flatten the tx count value for faster access
    reindex-last     Rescan and flatten the last blockindex value for faster access
    market           Updates market summaries, orderbooks, trade history + charts
    peers            Updates peer info based on local wallet connections
    masternodes      Updates the list of active masternodes on the network

    Notes:
    - 'current block' is the latest created block when script is executed.
    - The market + peers databases only support (& defaults to) reindex mode.
    - If check mode finds missing data(ignoring new data since last sync),
      index_timeout in settings.json is set too low.

*It is recommended to have this script launched via a cronjob at 1+ min intervals.*

#### Sample Crontab

*Example crontab; update index every minute, market data every 2 minutes, peers and masternodes every 5 minutes*

    */1 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs update > /dev/null 2>&1
    */2 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs market > /dev/null 2>&1
    */5 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs peers > /dev/null 2>&1
    */5 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs masternodes > /dev/null 2>&1

### Wallet Settings

The wallet connected to eIquidus must be running with the following flags:

    -daemon -txindex
	
You may either call your coins daemon using this syntax:

```
coind -daemon -txindex
```

or else you can add the settings to your coins config file (recommended):

```
daemon=1
txindex=1
```

### Forever

[Forever](https://www.npmjs.com/package/forever) is a useful node.js module that is used to always keep the explorer alive and running even if the explorer crashes or stops. Once you have configured the explorer to work properly in a production environment, it is recommended to use forever to start and stop the explorer instead of `npm start` and `npm stop` to keep the explorer constantly running without the need to always keep a terminal window open.

#### Install Forever

Run the following cmd in a terminal to install forever:

```
sudo npm install forever -g
```

#### Starting the Explorer Using Forever

You can start the explorer using forever with the following terminal cmd (be sure to run from within the explorer directory):

```
npm run sass:compile && /path/to/nodejs /path/to/forever start bin/cluster
```

**NOTE:** Use the following cmd to find the install path for forever:

```
which forever
```

#### Stopping the Explorer Using Forever

To stop the explorer when it is running via forever you can use the following terminal cmd (be sure to run from within the explorer directory):

```
/path/to/nodejs /path/to/forever stop bin/cluster
```

### Useful Scripts

#### Backup Database Script

Make a complete backup of an eIquidus mongo database collection and save to compressed tar.gz file. Please note that you must ensure that the explorer is NOT running at the time of backup to prevent corrupting the backup data. The following backup scenarios are supported:

**Backup Database (No filename specified)**

`sh scripts/create_backup.sh`: Backs up to the explorer/backups directory by default with the current date as the filename in the format  yyyy-MMM-dd.tar.gz

**Backup Database (Partial filename specified)**

`sh scripts/create_backup.sh test`: Backs up the the explorer/backups directory by default with the filename test.tar.gz

**Backup Database (Full filename specified)**

`sh scripts/create_backup.sh today.tar.gz`: Backs up the the explorer/backups directory by default with the filename today.tar.gz

**Backup Database (Full path with partial filename specified)**

`sh scripts/create_backup.sh /usr/local/bin/abc`: Backs up the the /usr/local/bin directory with the filename abc.tar.gz

**Backup Database (Full path and filename specified)**

`sh scripts/create_backup.sh ~/new.tar.gz`: Backs up the the users home directory with the filename new.tar.gz

#### Restore Database Script

Restore a previously saved eIquidus mongo database collection backup. :warning: **WARNING:** This will completely overwrite your existing eIquidus mongo database, so be sure to make a full backup before proceeding. Please note that the explorer should NOT be running at the time of restore to prevent problems restoring the database. The following restore scenarios are supported:

**Restore Database (Partial filename specified)**

`sh scripts/restore_backup.sh old`: Restores the explorer/scripts/backups/old.tar.gz file

**Restore Database (Full filename specified)**

`sh scripts/restore_backup.sh working.tar.gz`: Restores the explorer/scripts/backups/working.tar.gz file

**Restore Database (Full path with partial filename specified)**

`sh scripts/restore_backup.sh /home/explorer/backup`: Restores the /home/explorer/backup.tar.gz file

**Restore Database (Full path and filename specified)**

`sh scripts/restore_backup.sh ~/archive.tar.gz`: Restores the ~/archive.tar.gz file

#### Delete Database Script

Completely wipe the eIquidus mongo database collection clean to start again from scratch. :warning: **WARNING:** This will completely destroy all data in your existing eIquidus mongo database, so be sure to make a full backup before proceeding. Please note that the explorer should NOT be running at the time of database deletion to prevent database related problems. Delete the mongo database with the following command:

**Delete Database**

`sh scripts/delete_database.sh`

### CORS Support

eIquidus has basic CORS support which is useful to prevent other sites from consuming public APIs while still allowing specific websites whitelisted access.

#### What is CORS?

*CORS description taken from [MaxCDN One](https://www.maxcdn.com/one/visual-glossary/cors/)*

>To prevent websites from tampering with each other, web browsers implement a security measure known as the same-origin policy. The same-origin policy lets resources (such as JavaScript) interact with resources from the same domain, but not with resources from a different domain. This provides security for the user by preventing abuse, such as running a script that reads the password field on a secure website.

>In cases where cross-domain scripting is desired, CORS allows web developers to work around the same-origin policy. CORS adds HTTP headers which instruct web browsers on how to use and manage cross-domain content. The browser then allows or denies access to the content based on its security configuration.

#### How to Benefit From Using CORS?

You must first set up CORS in eIquidus by editing the settings.json file and setting the value for `webserver.cors.enabled` to true.

```
  "webserver": {
    "cors": {
      "enabled": true,
```

The `webserver.cors.corsorigin` setting defaults to "\*" which allows all requests from any origin. Keeping this setting at "\*" can lead to abuse and is not recommended. Therefore, you should change the `webserver.cors.corsorigin` setting to an external origin that you control, as seen in the following example:

```
  "webserver": {
    "cors": {
      "enabled": true,
      "corsorigin": "http://example.com"
```

The above example would allow sharing of resources from eIquidus for all data requests coming from the example.com domain, while all requests coming from any other domain would be rejected as per normal.

Below is an example of a simple javascript call using [jQuery](https://jquery.com) that could be used on your example.com website to return the current block count from eIquidus:

```
jQuery(document).ready(function($) {
  $.ajax({
    type: "GET",
    url: "http://your-eiquidus-url/api/getblockcount",
    cache: false
  }).done(function (data) {
    alert(data);
  });
});
```

### Known Issues

**exceeding stack size**

    RangeError: Maximum call stack size exceeded

Nodes default stack size may be too small to index addresses with many tx's. If you experience the above error while running sync.sh the stack size needs to be increased.

To determine the default setting run

    node --v8-options | grep -B0 -A1 stack-size

To run a sync with a larger stack size launch with

    node --stack-size=[SIZE] scripts/sync.js index update

Where [SIZE] is an integer higher than the default.

*note: SIZE will depend on which blockchain you are using, you may need to play around a bit to find an optimal setting*

### How You Can Support Us

The eIquidus block explorer is brought to you by the tireless efforts of the [Exor development team](https://exor.io/#section-team) for the benefit of the greater crypto community. If you enjoy our work, please consider supporting our continued development of this and many other cool crypto projects which you can find on our [github page](https://github.com/team-exor).

You can support us via one of the following options:

1. [Buy and hodl EXOR](https://app.stex.com/en/trade/pair/BTC/EXOR/1D). Buying and trading our EXOR coin helps stimulate the market price which allows us to hire more developers and continue to release high quality products in the future.
2. Consider a small donation by sending us some cryptocurrency:
    - **BTC:** [15zQAQFB9KR35nPWEJEKvmytUF6fg2zvdP](https://www.blockchain.com/btc/address/15zQAQFB9KR35nPWEJEKvmytUF6fg2zvdP)
    - **EXOR:** [EYYW8Nvz5aJz33M3JNHXG2FEHWUsntozrd](https://explorer.exor.io/address/EYYW8Nvz5aJz33M3JNHXG2FEHWUsntozrd)
3. Are you a software developer? Consider taking advantage of our [open bounty program](#eiquidus-open-bounty-program) and get paid in EXOR to help make the block explorer even better by submitting code improvements.

### License

Copyright (c) 2019-2021, The Exor Community<br />
Copyright (c) 2017, The Chaincoin Community<br />
Copyright (c) 2015, Iquidus Technology<br />
Copyright (c) 2015, Luke Williams<br />
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

* Neither the name of Iquidus Technology nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.