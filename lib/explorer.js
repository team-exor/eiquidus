var request = require('postman-request')
  , settings = require('./settings')
  , Address = require('../models/address');

var base_server = 'http://127.0.0.1:' + settings.port + "/";

var base_url = base_server + 'api/';

const onode = require('./node');
const client = new onode.Client(settings.wallet);

// returns coinbase total sent as current coin supply
function coinbase_supply(cb) {
  Address.findOne({a_id: 'coinbase'}, function(err, address) {
    if (address) {
      return cb(address.sent);
    } else {
      return cb(0);
    }
  });
}

function rpcCommand(params, cb) {
  client.cmd([{method: params[0].method, params: params[0].parameters}], function(err, response) {
    if (err)
      return cb('There was an error. Check your console.');
    else
      return cb(response);
  });
}

function prepareRpcCommand(cmd, addParams) {
  var method_name = '';
  var params = addParams || [];

  // Check for null/blank string
  if (cmd != null && cmd.trim() != '') {
    // Split cmd by spaces
    var split = cmd.split(' ');

    for (i=0; i<split.length; i++) {
      if (i==0)
        method_name = split[i];
      else
        params.push(split[i]);
    }
  }

  return { method: method_name, parameters: params };
}

function convertHashUnits(hashes) {
  if (settings.nethash_units == 'K') {
    // return units in KH/s
    return (hashes / 1000).toFixed(4);
  } else if (settings.nethash_units == 'M') {
    // return units in MH/s
    return (hashes / 1000000).toFixed(4);
  } else if (settings.nethash_units == 'G') {
    // return units in GH/s
    return (hashes / 1000000000).toFixed(4);
  } else if (settings.nethash_units == 'T') {
    // return units in TH/s
    return (hashes / 1000000000000).toFixed(4);
  } else if (settings.nethash_units == 'P') {
    // return units in PH/s
    return (hashes / 1000000000000000).toFixed(4);
  } else {
    // return units in H/s
    return hashes.toFixed(4);
  }
}

module.exports = {
  convert_to_satoshi: function(amount, cb) {
    // fix to 8dp & convert to string
    var fixed = amount.toFixed(8).toString();
    // remove decimal (.) and return integer
    return cb(parseInt(fixed.replace('.', '')));
  },

  get_hashrate: function(cb) {
    // check if hash rate should be hidden
    if (settings.index.show_hashrate == false) return cb('-');
    // check how to acquire network hashrate
    if (settings.nethash == 'netmhashps') {
      // load getmininginfo rpc call from settings
      var cmd = prepareRpcCommand(settings.api_cmds.getmininginfo);
      // check if the rpc cmd is valid
      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        // check if getting data from wallet rpc or web api request
        if (settings.use_rpc) {
          // get data from wallet via rpc cmd
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.') return cb('-');

            var net_hash = null;
            // check for different implementations of the net has value
            if (response.netmhashps) {
              // value returned in MH/s so convert to H/s
              net_hash = (response.netmhashps * 1000000);
            } else if (response.networkhashps)
              net_hash = response.networkhashps;
            else if (response.hashespersec)
              net_hash = response.hashespersec;

            // check if netmhashps has a value
            if (net_hash) {
              // return hash value with proper units
              return cb(convertHashUnits(net_hash));
            } else {
              // netmhashps is blank/null
              return cb('-');
            }
          });
        } else {
          // get data via internal web api request
          var uri = base_url + 'getmininginfo';
          request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
            // check if an error msg was received from the web api server
            if (body == 'There was an error. Check your console.') {
              // return a blank value
              return cb('-');
            } else {
              var net_hash = null;
              // check for different implementations of the net has value
              if (body.netmhashps) {
                // value returned in MH/s so convert to H/s
                net_hash = (body.netmhashps * 1000000);
              } else if (body.networkhashps)
                net_hash = body.networkhashps;
              else if (body.hashespersec)
                net_hash = body.hashespersec;

              // check if there is a net hash value
              if (net_hash) {
                // return hash value with proper units
                return cb(convertHashUnits(net_hash));
              } else {
                // netmhashps is blank/null
                return cb('-');
              }
            }
          });
        }
      } else {
        // getmininginfo cmd not set
        return cb('-');
      }
    } else if (settings.nethash == 'getnetworkhashps') {
      // load getnetworkhashps rpc call from settings
      var cmd = prepareRpcCommand(settings.api_cmds.getnetworkhashps);
      // check if the rpc cmd is valid
      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        // check if getting data from wallet rpc or web api request
        if (settings.use_rpc) {
          // get data from wallet via rpc cmd
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.') return cb('-');
            // check if the response has a value
            if (response) {
              // return hash value with proper units
              return cb(convertHashUnits(response));
            } else {
              // response is blank/null
              return cb('-');
            }
          });
        } else {
          // get data via internal web api request
          var uri = base_url + 'getnetworkhashps';
          request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
            // check if an error msg was received from the web api server
            if (body == 'There was an error. Check your console.') {
              // return a blank value
              return cb('-');
            } else {
              // return hash value with proper units
              return cb(convertHashUnits(body));
            }
          });
        }
      } else {
        // getnetworkhashps cmd not set
        return cb('-');
      }
    } else {
      // Invalid network hashrate setting value
      return cb('-');
    }
  },

  get_difficulty: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getdifficulty);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getdifficulty';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_connectioncount: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getconnectioncount);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getconnectioncount';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_masternodecount: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getmasternodecount);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmasternodecount';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_blockcount: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getblockcount);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblockcount';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_blockhash: function(height, cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getblockhash, (height ? [parseInt(height)] : []));

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblockhash?height=' + (height ? height : '');
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_block: function(hash, cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getblock, (hash ? [hash] : []));

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblock?hash=' + hash;
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_rawtransaction: function(hash, cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getrawtransaction, (hash ? [hash, 1] : []));

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getrawtransaction?txid=' + hash + '&decrypt=1';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_maxmoney: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getmaxmoney);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmaxmoney';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_maxvote: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getmaxvote);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmaxvote';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_vote: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getvote);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getvote';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_phase: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getphase);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getphase';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_reward: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getreward);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getreward';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_estnext: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getnextrewardestimate);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getnextrewardestimate';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  get_nextin: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getnextrewardwhenstr);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getnextrewardwhenstr';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },

  // synchonous loop used to interate through an array,
  // avoid use unless absolutely neccessary
  syncLoop: function(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
      next:function(){
          if(done){
              if(shouldExit && exit){
                  exit(); // Exit if we're done
              }
              return; // Stop the loop if we're done
          }
          // If we're not finished
          if(index < iterations){
              index++; // Increment our index
              if (index % 100 === 0) { //clear stack
                setTimeout(function() {
                  process(loop); // Run our process, pass in the loop
                }, 1);
              } else {
                 process(loop); // Run our process, pass in the loop
              }
          // Otherwise we're done
          } else {
              done = true; // Make sure we say we're done
              if(exit) exit(); // Call the callback on exit
          }
      },
      iteration:function(){
          return index - 1; // Return the loop number we're on
      },
      break:function(end){
          done = true; // End the loop
          shouldExit = end; // Passing end as true means we still call the exit callback
      }
    };
    loop.next();
    return loop;
  },

  balance_supply: function(cb) {
    Address.find({}, 'balance').where('balance').gt(0).exec(function(err, docs) {
      var count = 0;
      module.exports.syncLoop(docs.length, function (loop) {
        var i = loop.iteration();
        count = count + docs[i].balance;
        loop.next();
      }, function(){
        return cb(count);
      });
    });
  },

  get_supply: function(cb) {
    if (settings.supply == 'HEAVY') {
      // attempt to get the supply from the getsupply or similar api cmd that returns the current money supply as a single positive decimal value
      var cmd = prepareRpcCommand(settings.api_cmds.getsupply);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response);
          });
        } else {
          var uri = base_url + 'getsupply';
          request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
            // check if an error msg was received from the web api server
            if (body == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(body);
          });
        }
      } else {
        // cmd not in use. return null.
        return cb(null);
      }
    } else if (settings.supply == 'GETINFO') {
      // attempt to get the supply from the getinfo or similar api cmd that returns and object containing various state info. Must include a value called "moneysupply" which represents the current running total of coins
      var cmd = prepareRpcCommand(settings.api_cmds.getinfo);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (!response || !response.moneysupply || response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response.moneysupply);
          });
        } else {
          var uri = base_url + 'getinfo';
          request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
            // check if an error msg was received from the web api server
            if (!body || !body.moneysupply ||body == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(body.moneysupply);
          });
        }
      } else {
        // cmd not in use. return null.
        return cb(null);
      }
    } else if (settings.supply == 'BALANCES') {
      // get the supply by running a query on the addresses collection and summing up all positive balances (potentially a long running query for blockchains with tons of addresses)
      module.exports.balance_supply(function(supply) {
        return cb(supply/100000000);
      });
    } else if (settings.supply == 'TXOUTSET') {
      // attempt to get the supply from the gettxoutsetinfo or similar api cmd that returns an object with statistics about the unspent transaction output set. Must include a value called "total_amount" which represents the current running total of coins
      var cmd = prepareRpcCommand(settings.api_cmds.gettxoutsetinfo);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (!response || !response.total_amount || response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response.total_amount);
          });
        } else {
          var uri = base_url + 'gettxoutsetinfo';
          request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
            // check if an error msg was received from the web api server
            if (!body || !body.total_amount ||body == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(body.total_amount);
          });
        }
      } else {
        // cmd not in use. return null.
        return cb(null);
      }
    } else {
      // returns coinbase total sent as current coin supply
      coinbase_supply(function(supply) {
        return cb(supply/100000000);
      });
    }
  },
  
  get_peerinfo: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getpeerinfo);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getpeerinfo';
        request({uri: uri, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
          // check if an error msg was received from the web api server
          if (body == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(body);
        });
      }
    } else {
      // cmd not in use. return null.
      return cb(null);
    }
  },  
  
  get_geo_location: function(address, cb) {
    request({uri: 'https://freegeoip.app/json/' + address, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, geo) {
      return cb(error, geo);
    });
  },

  is_unique: function(array, object, cb) {
    var unique = true;
    var index = null;
    module.exports.syncLoop(array.length, function (loop) {
      var i = loop.iteration();
      if (array[i].addresses == object) {
        unique = false;
        index = i;
        loop.break(true);
        loop.next();
      } else {
        loop.next();
      }
    }, function(){
      return cb(unique, index);
    });
  },

  calculate_total: function(vout, cb) {
    var total = 0;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      //module.exports.convert_to_satoshi(parseFloat(vout[i].amount), function(amount_sat){
        total = total + vout[i].amount;
        loop.next();
      //});
    }, function(){
      return cb(total);
    });
  },

  prepare_vout: function(vout, txid, vin, vhidden, cb) {
    var arr_vout = [];
    var arr_vin = [];
    arr_vin = vin;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      // make sure vout has an address
      if (vout[i].scriptPubKey.type != 'nonstandard' && vout[i].scriptPubKey.type != 'nulldata') {
        // check if tx is public or private (private = if no out address)
		if (vout[i].scriptPubKey.type != 'zerocoinmint' && typeof vout[i].scriptPubKey.addresses != 'undefined') {
			// check if vout address is unique, if so add it array, if not add its amount to existing index
			module.exports.is_unique(arr_vout, vout[i].scriptPubKey.addresses[0], function(unique, index) {
			  if (unique == true) {
				// unique vout
				module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
				  arr_vout.push({addresses: vout[i].scriptPubKey.addresses[0], amount: amount_sat});
				  loop.next();
				});
			  } else {
				// already exists
				module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
				  arr_vout[index].amount = arr_vout[index].amount + amount_sat;
				  loop.next();
				});
			  }
			});
		} else {
			// private tx
			// TODO: save this data to be able to show an anon tx
			loop.next();
		}
      } else {
        // no address, move to next vout
        loop.next();
      }
    }, function(){
      // check for hidden/anonymous outputs
      vhidden.forEach(function(vanon, i) {
        if (vanon.vpub_old > 0) {
          module.exports.convert_to_satoshi(parseFloat(vanon.vpub_old), function(amount_sat){
            arr_vout.push({addresses:"private_tx", amount:amount_sat});
          });
        } else {
          module.exports.convert_to_satoshi(parseFloat(vanon.vpub_new), function(amount_sat){
            if (vhidden.length > 0 && (!vout || vout.length == 0) && (!vin || vin.length == 0)) {
              // hidden sender is sending to hidden recipient
              // the sent and received values are not known in this case. only the fee paid is known and subtracted from the sender.
              arr_vout.push({addresses:"private_tx", amount:0});
            }
            // add a private send address with the known amount sent
            arr_vin.push({addresses:"private_tx", amount:amount_sat});
          });
        }
      });

      if (typeof vout[0] !== 'undefined' && vout[0].scriptPubKey.type == 'nonstandard') {
        if ( arr_vin.length > 0 && arr_vout.length > 0 ) {
          if (arr_vin[0].addresses == arr_vout[0].addresses) {
            //PoS
            arr_vout[0].amount = arr_vout[0].amount - arr_vin[0].amount;
            arr_vin.shift();
            return cb(arr_vout, arr_vin);
          } else {
            return cb(arr_vout, arr_vin);
          }
        } else {
          return cb(arr_vout, arr_vin);
        }
      } else {
        return cb(arr_vout, arr_vin);
      }
    });
  },

  get_input_addresses: function(input, vout, cb) {
    var addresses = [];
    if (input.coinbase) {
      var amount = 0;
      module.exports.syncLoop(vout.length, function (loop) {
        var i = loop.iteration();
          amount = amount + parseFloat(vout[i].value);
          loop.next();
      }, function(){
        addresses.push({hash: 'coinbase', amount: amount});
        return cb(addresses);
      });
    } else {
      module.exports.get_rawtransaction(input.txid, function(tx){
        if (tx) {
          module.exports.syncLoop(tx.vout.length, function (loop) {
            var i = loop.iteration();
            if (tx.vout[i].n == input.vout) {
              //module.exports.convert_to_satoshi(parseFloat(tx.vout[i].value), function(amount_sat){
              if (tx.vout[i].scriptPubKey.addresses) {
                addresses.push({hash: tx.vout[i].scriptPubKey.addresses[0], amount:tx.vout[i].value});
              }
                loop.break(true);
                loop.next();
              //});
            } else {
              loop.next();
            }
          }, function(){
            return cb(addresses);
          });
        } else {
          return cb();
        }
      });
    }
  },

  prepare_vin: function(tx, cb) {
    var arr_vin = [];
    module.exports.syncLoop(tx.vin.length, function (loop) {
      var i = loop.iteration();
      module.exports.get_input_addresses(tx.vin[i], tx.vout, function(addresses){
        if (addresses && addresses.length) {
          //console.log('vin');
          module.exports.is_unique(arr_vin, addresses[0].hash, function(unique, index) {
            if (unique == true) {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin.push({addresses:addresses[0].hash, amount:amount_sat});
                loop.next();
              });
            } else {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                loop.next();
              });
            }
          });
        } else {
          loop.next();
        }
      });
    }, function(){
      return cb(arr_vin);
    });
  }
};