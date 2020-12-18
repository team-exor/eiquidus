eIquidus - 1.0.1
================

The Exor block explorer.

This project is a fork of [Ciquidus Explorer](https://github.com/suprnurd/ciquidus) which is a fork of [Iquidus Explorer](https://github.com/iquidus/explorer). Shoutouts to both Luke Williams for the original code and Alan Rudolf for all the additional bonus featues which saved me tons of time! I'm only standing on the shoulders of giants. Thank you both!!!

### Features

- Built using the following scripts and technologies:
  - Node.js (v14.15.1 or newer recommended)
  - MongoDB (v4.0.21 or newer recommended)
  - JQuery v3.5.1  
  - Bootstrap v4.5.3
  - DataTables v1.10.22
  - FontAwesome v5.15.1
  - jqPlot v1.0.9.d96a669
  - Chart.js v2.9.4
  - flag-icon-css v3.5.0 ([https://github.com/lipis/flag-icon-css](https://github.com/lipis/flag-icon-css))
- Mobile-friendly
- Sass support
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
  - **gettxoutsetinfo:** Returns an object with statistics about the unspent transaction output set
  - **getsupply:** Returns the current money supply
  - **getmaxmoney:** Returns the number of coins that will be produced in total
  - **getmaxvote:** Returns the maximum allowed vote for the current phase of voting
  - **getvote:** Returns the current block reward vote setting
  - **getphase:** Returns the current voting phase name
  - **getreward:** Returns the current block reward
  - **getnextrewardestimate:** Returns an estimate for the next block reward based on the current state of decentralized voting
  - **getnextrewardwhenstr:** Returns a string describing how long until the votes are tallied and the next block reward is computed
  - **getvotelist:** Returns an object with details regarding the current vote list
  - **getmasternodecount:** Returns a json object containing the total number of masternodes on the network
  - **getmasternodelist:** Returns a json array containing status information for all masternodes on the network

### See it in action

-  https://explorer.exor.io/

### Requires

-  node.js >= 10.15.3
-  mongodb >= 4.0.9
-  *coind

### Create database

Enter MongoDB cli:

    $ mongo

Create database:

    > use explorerdb

Create user with read/write access:

    > db.createUser( { user: "eiquidus", pwd: "Nd^p2d77ceBX!L", roles: [ "readWrite" ] } )

### Get the source

    git clone https://github.com/team-exor/eiquidus explorer

### Install node modules

    cd explorer && npm install --production

### Configure

    cp ./settings.json.template ./settings.json

*Make required changes in settings.json*

### Start Explorer

    npm start

**NOTE:** mongod must be running to start the explorer

The explorer defaults to cluster mode, forking an instance of its process to each cpu core. This results in increased performance and stability. Load balancing gets automatically taken care of and any instances that for some reason die, will be restarted automatically. For testing/development (or if you just wish to) a single instance can be launched with

    node --stack-size=10000 bin/instance

To stop the cluster you can use

    npm stop

### Syncing databases with the blockchain

sync.sh (located in scripts/) is used for updating the local databases. This script must be called from the explorers root directory.

    Usage: scripts/sync.sh /path/to/nodejs [mode]

    Mode: (required)
    update           Updates index from last sync to current block
    check            Checks index for (and adds) any missing transactions/addresses
    reindex          Clears index then resyncs from genesis to current block
    reindex-rich     Clears and recreates the richlist data
    reindex-txcount  Rescan and flatten the tx count value for faster access
    market           Updates market summaries, orderbooks, trade history + charts
    peers            Updates peer info based on local wallet connections

    Notes:
    - 'current block' is the latest created block when script is executed.
    - The market + peers databases only support (& defaults to) reindex mode.
    - If check mode finds missing data(ignoring new data since last sync),
      index_timeout in settings.json is set too low.

*It is recommended to have this script launched via a cronjob at 1+ min intervals.*

**crontab**

*Example crontab; update index every minute, market data every 2 minutes and peers every 5 minutes*

	*/1 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs update > /dev/null 2>&1
    */2 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs market > /dev/null 2>&1
    */5 * * * * /path/to/explorer/scripts/sync.sh /path/to/nodejs peers > /dev/null 2>&1

### Wallet

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

### CORS support

eIquidus has basic CORS support which is useful for taking advantage of the block explorer api in your other web projects.

#### What is CORS?

*CORS description taken from [MaxCDN One](https://www.maxcdn.com/one/visual-glossary/cors/)*

>To prevent websites from tampering with each other, web browsers implement a security measure known as the same-origin policy. The same-origin policy lets resources (such as JavaScript) interact with resources from the same domain, but not with resources from a different domain. This provides security for the user by preventing abuse, such as running a script that reads the password field on a secure website.

>In cases where cross-domain scripting is desired, CORS allows web developers to work around the same-origin policy. CORS adds HTTP headers which instruct web browsers on how to use and manage cross-domain content. The browser then allows or denies access to the content based on its security configuration.

#### How to benefit from using CORS?

You must first set up CORS in eIquidus by editing the settings.json file and setting the value for `usecors` to true.

```
  "usecors": true,
```

The `corsorigin` setting defaults to "\*" which allows all requests from any origin. Keeping this setting at "\*" can lead to abuse and is not recommended. Therefore, you should change the `corsorigin` setting to an external origin that you control, as seen in the following example:

```
  "corsorigin": "http://example.com",
```

The above example would allow sharing of resources from eIquidus for all data requests coming from the example.com domain while all requests coming from any other domain would be rejected as per normal.

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

### Backup/Restore Database Scripts

A pair of scripts to backup or restore the internal mongo database are included. There are a few different usage options:

**Backup Database (No filename specified)**

`sh create_backup.sh`: Backs up to the explorer/backups directory by default with the current date as the filename in the format  yyyy-MMM-dd.tar.gz

**Backup Database (Partial filename specified)**

`sh create_backup.sh test`: Backs up the the explorer/backups directory by default with the filename test.tar.gz

**Backup Database (Full filename specified)**

`sh create_backup.sh today.tar.gz`: Backs up the the explorer/backups directory by default with the filename today.tar.gz

**Backup Database (Full path with partial filename specified)**

`sh create_backup.sh /usr/local/bin/abc`: Backs up the the /usr/local/bin directory with the filename abc.tar.gz

**Backup Database (Full path and filename specified)**

`sh create_backup.sh ~/new.tar.gz`: Backs up the the users home directory with the filename new.tar.gz

**Restore Database (Partial filename specified)**

`sh restore_backup.sh old`: Restores the explorer/scripts/backups/old.tar.gz file

**Restore Database (Full filename specified)**

`sh restore_backup.sh working.tar.gz`: Restores the explorer/scripts/backups/working.tar.gz file

**Restore Database (Full path with partial filename specified)**

`sh restore_backup.sh /home/explorer/backup`: Restores the /home/explorer/backup.tar.gz file

**Restore Database (Full path and filename specified)**

`sh restore_backup.sh ~/archive.tar.gz`: Restores the ~/archive.tar.gz file

### Known Issues

**exceeding stack size**

    RangeError: Maximum call stack size exceeded

Nodes default stack size may be too small to index addresses with many tx's. If you experience the above error while running sync.sh the stack size needs to be increased.

To determine the default setting run

    node --v8-options | grep -B0 -A1 stack_size

To run a sync with a larger stack size launch with

    node --stack-size=[SIZE] scripts/sync.js index update

Where [SIZE] is an integer higher than the default.

*note: SIZE will depend on which blockchain you are using, you may need to play around a bit to find an optimal setting*

### License

Copyright (c) 2019, The Exor Community
Copyright (c) 2017, The Chaincoin Community
Copyright (c) 2015, Iquidus Technology
Copyright (c) 2015, Luke Williams
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of Iquidus Technology nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
