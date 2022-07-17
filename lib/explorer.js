var request = require('postman-request'),
    settings = require('./settings'),
    locale = require('./locale'),
    Address = require('../models/address');

var base_server = 'http://127.0.0.1:' + settings.webserver.port + "/";
var base_url = base_server + 'api/';
const onode = require('./node');
const client = new onode.Client(settings.wallet);

// returns coinbase total sent as current coin supply
function coinbase_supply(cb) {
  Address.findOne({a_id: 'coinbase'}, function(err, address) {
    if (address)
      return cb(address.sent);
    else
      return cb(0);
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

    for (i = 0; i < split.length; i++) {
      if (i == 0)
        method_name = split[i];
      else
        params.push(split[i]);
    }
  }

  return { method: method_name, parameters: params };
}

function convertHashUnits(hashes) {
  if (settings.shared_pages.page_header.panels.network_panel.nethash_units == 'K') {
    // return units in KH/s
    return (hashes / 1000).toFixed(4);
  } else if (settings.shared_pages.page_header.panels.network_panel.nethash_units == 'M') {
    // return units in MH/s
    return (hashes / 1000000).toFixed(4);
  } else if (settings.shared_pages.page_header.panels.network_panel.nethash_units == 'G') {
    // return units in GH/s
    return (hashes / 1000000000).toFixed(4);
  } else if (settings.shared_pages.page_header.panels.network_panel.nethash_units == 'T') {
    // return units in TH/s
    return (hashes / 1000000000000).toFixed(4);
  } else if (settings.shared_pages.page_header.panels.network_panel.nethash_units == 'P') {
    // return units in PH/s
    return (hashes / 1000000000000000).toFixed(4);
  } else {
    // return units in H/s
    return hashes.toFixed(4);
  }
}

function processVoutAddresses(address_list, vout_value, arr_vout, cb) {
  // check if there are any addresses to process
  if (address_list != null && address_list.length > 0) {
    // check if vout address is inside an array
    if (Array.isArray(address_list[0])) {
      // extract the address
      address_list[0] = address_list[0][0];
    }

    // check if vout address is unique, if so add to array, if not add its amount to existing index
    module.exports.is_unique(arr_vout, address_list[0], 'addresses', function(unique, index) {
      if (unique == true) {
        // unique vout
        module.exports.convert_to_satoshi(parseFloat(vout_value), function(amount_sat) {
          arr_vout.push({addresses: address_list[0], amount: amount_sat});

          return cb(arr_vout);
        });
      } else {
        // already exists
        module.exports.convert_to_satoshi(parseFloat(vout_value), function(amount_sat) {
          arr_vout[index].amount = arr_vout[index].amount + amount_sat;

          return cb(arr_vout);
        });
      }
    });
  } else {
    // no address, move to next vout
    return cb(arr_vout);
  }
}

function encodeP2PKaddress(p2pk_descriptor, cb) {
  // find the descriptor value
  module.exports.get_descriptorinfo(p2pk_descriptor, function(descriptor_info) {
    // check for errors
    if (descriptor_info != null) {
      // encode the address using the output descriptor
      module.exports.get_deriveaddresses(descriptor_info.descriptor, function(p2pkh_address) {
        // check for errors
        if (p2pkh_address != null) {
          // return P2PKH address
          return cb(p2pkh_address);
        } else {
          // address could not be encoded
          return cb(null);
        }
      });
    } else {
      // address could not be encoded
      return cb(null);
    }
  });
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
    if (settings.shared_pages.show_hashrate == false)
      return cb('-');
    // check how to acquire network hashrate
    if (settings.shared_pages.page_header.panels.network_panel.nethash == 'netmhashps') {
      // load getmininginfo rpc call from settings
      var cmd = prepareRpcCommand(settings.api_cmds.getmininginfo);
      // check if the rpc cmd is valid
      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        // check if getting data from wallet rpc or web api request
        if (settings.api_cmds.use_rpc) {
          // get data from wallet via rpc cmd
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.')
              return cb('-');

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

          request({uri: uri, json: true}, function (error, response, body) {
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
    } else if (settings.shared_pages.page_header.panels.network_panel.nethash == 'getnetworkhashps') {
      // load getnetworkhashps rpc call from settings
      var cmd = prepareRpcCommand(settings.api_cmds.getnetworkhashps);
      // check if the rpc cmd is valid
      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        // check if getting data from wallet rpc or web api request
        if (settings.api_cmds.use_rpc) {
          // get data from wallet via rpc cmd
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.')
              return cb('-');
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

          request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getdifficulty';

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getconnectioncount';

        request({uri: uri, json: true}, function (error, response, body) {
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

  get_masternodelist: function(cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.getmasternodelist);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmasternodelist';

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmasternodecount';

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblockcount';

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblockhash?height=' + (height ? height : '');

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getblock?hash=' + hash;

        request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getrawtransaction?txid=' + hash + '&decrypt=1';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getmaxmoney);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmaxmoney';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getmaxvote);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getmaxvote';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getvote);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getvote';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getphase);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getphase';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getreward);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getreward';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getnextrewardestimate);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getnextrewardestimate';

        request({uri: uri, json: true}, function (error, response, body) {
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
    var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getnextrewardwhenstr);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getnextrewardwhenstr';

        request({uri: uri, json: true}, function (error, response, body) {
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

  get_descriptorinfo: function(descriptor, cb) {
    // format the descriptor correctly for use in the getdescriptorinfo cmd
    descriptor = 'pkh(' + descriptor.replace(' OP_CHECKSIG', '') + ')';

    var cmd = prepareRpcCommand(settings.blockchain_specific.bitcoin.api_cmds.getdescriptorinfo, (descriptor ? [descriptor] : []));

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getdescriptorinfo?descriptor=' + encodeURIComponent(descriptor);

        request({uri: uri, json: true}, function (error, response, body) {
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

  get_deriveaddresses: function(descriptor, cb) {
    var cmd = prepareRpcCommand(settings.blockchain_specific.bitcoin.api_cmds.deriveaddresses, (descriptor ? [descriptor] : []));

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'deriveaddresses?descriptor=' + encodeURIComponent(descriptor);

        request({uri: uri, json: true}, function (error, response, body) {
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
  syncLoop: function(iterations, process, exit) {
    var index = 0,
        done = false,
        shouldExit = false;

    var loop = {
      next: function() {
        if (done) {
          if (shouldExit && exit) {
            // exit if we're done
            exit();
          }

          // stop the loop if we're done
          return;
        }

        // if we're not finished
        if (index < iterations) {
          // increment our index
          index++;

          if (index % 100 === 0) {
            // clear stack
            setTimeout(function() {
              // run our process, pass in the loop
              process(loop);
            }, 1);
          } else {
            // run our process, pass in the loop
            process(loop);
          }
        } else {
          // otherwise we're done
          // make sure we say we're done
          done = true;

          if (exit) {
            // call the callback on exit
            exit();
          }
        }
      },
      iteration: function() {
        // return the loop number we're on
        return index - 1;
      },
      break: function(end) {
        // end the loop
        done = true;
        // passing end as true means we still call the exit callback
        shouldExit = end;
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
      }, function() {
        return cb(count);
      });
    });
  },

  get_supply: function(cb) {
    if (settings.sync.supply == 'HEAVY') {
      // attempt to get the supply from the getsupply or similar api cmd that returns the current money supply as a single positive decimal value
      var cmd = prepareRpcCommand(settings.blockchain_specific.heavycoin.api_cmds.getsupply);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.api_cmds.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response);
          });
        } else {
          var uri = base_url + 'getsupply';

          request({uri: uri, json: true}, function (error, response, body) {
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
    } else if (settings.sync.supply == 'GETINFO') {
      // attempt to get the supply from the getinfo or similar api cmd that returns and object containing various state info. Must include a value called "moneysupply" which represents the current running total of coins
      var cmd = prepareRpcCommand(settings.api_cmds.getinfo);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.api_cmds.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (!response || !response.moneysupply || response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response.moneysupply);
          });
        } else {
          var uri = base_url + 'getinfo';

          request({uri: uri, json: true}, function (error, response, body) {
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
    } else if (settings.sync.supply == 'BALANCES') {
      // get the supply by running a query on the addresses collection and summing up all positive balances (potentially a long running query for blockchains with tons of addresses)
      module.exports.balance_supply(function(supply) {
        return cb(supply/100000000);
      });
    } else if (settings.sync.supply == 'TXOUTSET') {
      // attempt to get the supply from the gettxoutsetinfo or similar api cmd that returns an object with statistics about the unspent transaction output set. Must include a value called "total_amount" which represents the current running total of coins
      var cmd = prepareRpcCommand(settings.api_cmds.gettxoutsetinfo);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.api_cmds.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (!response || !response.total_amount || response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response.total_amount);
          });
        } else {
          var uri = base_url + 'gettxoutsetinfo';

          request({uri: uri, json: true}, function (error, response, body) {
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
    } else if (settings.sync.supply == 'GETBLOCKCHAININFO') {
      // attempt to get the supply from the getblockchaininfo or similar api cmd that returns and object containing various state info. Must include a value called "moneysupply" which represents the current running total of coins
      var cmd = prepareRpcCommand(settings.api_cmds.getblockchaininfo);

      if (!(cmd.method == '' && cmd.parameters.length == 0)) {
        if (settings.api_cmds.use_rpc) {
          rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
            // check if an error msg was received from the rpc server
            if (!response || !response.moneysupply || response == 'There was an error. Check your console.')
              return cb(null);
            else
              return cb(response.moneysupply);
          });
        } else {
          var uri = base_url + 'getblockchaininfo';

          request({uri: uri, json: true}, function (error, response, body) {
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
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'getpeerinfo';

        request({uri: uri, json: true}, function (error, response, body) {
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

  verify_message: function(address, signature, message, cb) {
    var cmd = prepareRpcCommand(settings.api_cmds.verifymessage, [address, signature, message]);

    if (!(cmd.method == '' && cmd.parameters.length == 0)) {
      if (settings.api_cmds.use_rpc) {
        rpcCommand([{method:cmd.method, parameters: cmd.parameters}], function(response) {
          // check if an error msg was received from the rpc server
          if (response == 'There was an error. Check your console.')
            return cb(null);
          else
            return cb(response);
        });
      } else {
        var uri = base_url + 'verifymessage?address=' + address + '&signature=' + signature + '&message=' + message;

        request({uri: uri, json: true}, function (error, response, body) {
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
    request({uri: 'https://reallyfreegeoip.org/json/' + address, json: true}, function (error, response, geo) {
      return cb(error, geo);
    });
  },

  is_unique: function(array, object, key_name, cb) {
    var unique = true;
    var index = null;

    module.exports.syncLoop(array.length, function (loop) {
      var i = loop.iteration();

      if (array[i][key_name] == object) {
        unique = false;
        index = i;
        loop.break(true);
        loop.next();
      } else
        loop.next();
    }, function() {
      return cb(unique, index);
    });
  },

  calculate_total: function(vout, cb) {
    var total = 0;

    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();

      total = total + vout[i].amount;
      loop.next();
    }, function() {
      return cb(total);
    });
  },

  prepare_vout: function(vout, txid, vin, vhidden, cb) {
    var arr_vout = [];
    var arr_vin = vin;
    var tx_type = null;

    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      // make sure vout has an address
      if (vout[i].scriptPubKey.type != 'nonstandard' && vout[i].scriptPubKey.type != 'nulldata') {
        // check if this is a zerocoin tx
        if (vout[i].scriptPubKey.type != 'zerocoinmint') {
          var address_list = vout[i].scriptPubKey.addresses;
          // check if there are one or more addresses in the vout
          if (address_list == null || address_list.length == 0) {
            // no addresses defined
            // check if there is a single address defined
            if (vout[i].scriptPubKey.address == null) {
              // no single address defined
              // check if bitcoin features are enabled
              if (settings.blockchain_specific.bitcoin.enabled == true) {
                // assume the asm value is a P2PK (Pay To Pubkey) public key that should be encoded as a P2PKH (Pay To Pubkey Hash) address
                encodeP2PKaddress(vout[i].scriptPubKey.asm, function(p2pkh_address) {
                  // check if the address was encoded properly
                  if (p2pkh_address != null) {
                    // mark this tx as p2pk
                    tx_type = 'p2pk';
                    // process vout addresses
                    processVoutAddresses(p2pkh_address, vout[i].value, arr_vout, function(vout_array) {
                      // save updated array
                      arr_vout = vout_array;
                      // move to next vout
                      loop.next();
                    });
                  } else {
                    // could not decipher the address, save as unknown and move to next vout
                    console.log('Failed to find vout address from tx ' + txid);
                    // process vout addresses
                    processVoutAddresses(['unknown_address'], vout[i].value, arr_vout, function(vout_array) {
                      // save updated array
                      arr_vout = vout_array;
                      // move to next vout
                      loop.next();
                    });
                  }
                });
              } else {
                // could not decipher the address, save as unknown and move to next vout
                console.log('Failed to find vout address from tx ' + txid);
                // process vout addresses
                processVoutAddresses(['unknown_address'], vout[i].value, arr_vout, function(vout_array) {
                  // save updated array
                  arr_vout = vout_array;
                  // move to next vout
                  loop.next();
                });
              }
            } else {
              // process vout address
              processVoutAddresses([vout[i].scriptPubKey.address], vout[i].value, arr_vout, function(vout_array) {
                // save updated array
                arr_vout = vout_array;
                // move to next vout
                loop.next();
              });
            }
          } else {
            // process vout addresses
            processVoutAddresses(address_list, vout[i].value, arr_vout, function(vout_array) {
              // save updated array
              arr_vout = vout_array;
              // move to next vout
              loop.next();
            });
          }
        } else {
          // TODO: add support for zerocoin transactions
          console.log('Zerocoin tx found. skipping for now as it is unsupported');
          tx_type = "zerocoin";
          loop.next();
        }
      } else {
        // no address, move to next vout
        loop.next();
      }
    }, function() {
      // check if zksnarks is enabled
      if (settings.blockchain_specific.zksnarks.enabled == true) {
        // check for hidden/anonymous outputs
        if (vhidden != null && vhidden.length > 0) {
          tx_type = "zksnarks";
          // loop through all hidden/anonymous outputs
          module.exports.syncLoop(vhidden.length, function (loop) {
            var i = loop.iteration();

            if (vhidden[i].vpub_old > 0) {
              // process vout addresses
              processVoutAddresses(['hidden_address'], parseFloat(vhidden[i].vpub_old), arr_vout, function(vout_array) {
                // save updated array
                arr_vout = vout_array;
                // move to next vout
                loop.next();
              });
            } else {
              if ((!vout || vout.length == 0) && (!vin || vin.length == 0)) {
                // hidden sender is sending to hidden recipient
                // the sent and received values are not known in this case. only the fee paid is known and subtracted from the sender.
                // process vout addresses
                processVoutAddresses(['hidden_address'], 0, arr_vout, function(vout_array) {
                  // save updated array
                  arr_vout = vout_array;
                  // add a private send address with the known amount sent
                  module.exports.is_unique(arr_vin, 'hidden_address', 'addresses', function(unique, index) {
                    if (unique == true) {
                      module.exports.convert_to_satoshi(parseFloat(vhidden[i].vpub_new), function(amount_sat) {
                        arr_vin.push({addresses: 'hidden_address', amount: amount_sat});
                        // move to next vout
                        loop.next();
                      });
                    } else {
                      module.exports.convert_to_satoshi(parseFloat(vhidden[i].vpub_new), function(amount_sat) {
                        arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                        // move to next vout
                        loop.next();
                      });
                    }
                  });
                });
              } else {
                module.exports.is_unique(arr_vin, 'hidden_address', 'addresses', function(unique, index) {
                  if (unique == true) {
                    module.exports.convert_to_satoshi(parseFloat(vhidden[i].vpub_new), function(amount_sat) {
                      arr_vin.push({addresses: 'hidden_address', amount: amount_sat});
                      // move to next vout
                      loop.next();
                    });
                  } else {
                    module.exports.convert_to_satoshi(parseFloat(vhidden[i].vpub_new), function(amount_sat) {
                      arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                      // move to next vout
                      loop.next();
                    });
                  }
                });
              }
            }
          });
        }
      }

      if (typeof vout[0] !== 'undefined' && vout[0].scriptPubKey.type == 'nonstandard') {
        if (arr_vin.length > 0 && arr_vout.length > 0) {
          if (arr_vin[0].addresses == arr_vout[0].addresses) {
            //PoS
            arr_vout[0].amount = arr_vout[0].amount - arr_vin[0].amount;
            arr_vin.shift();

            return cb(arr_vout, arr_vin, tx_type);
          } else
            return cb(arr_vout, arr_vin, tx_type);
        } else
          return cb(arr_vout, arr_vin, tx_type);
      } else
        return cb(arr_vout, arr_vin, tx_type);
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
      }, function() {
        addresses.push({hash: 'coinbase', amount: amount});
        return cb(addresses, null);
      });
    } else {
      module.exports.get_rawtransaction(input.txid, function(tx) {
        if (tx) {
          var tx_type = null;

          module.exports.syncLoop(tx.vout.length, function (loop) {
            var i = loop.iteration();

            if (tx.vout[i].n == input.vout) {
              if (tx.vout[i].scriptPubKey.addresses || tx.vout[i].scriptPubKey.address) {
                var new_address = tx.vout[i].scriptPubKey.address || tx.vout[i].scriptPubKey.addresses[0];

                // check if address is inside an array
                if (Array.isArray(new_address)) {
                  // extract the address
                  new_address = new_address[0];
                }

                module.exports.is_unique(addresses, new_address, 'hash', function(unique, index) {
                  if (unique == true)
                    addresses.push({hash: new_address, amount: tx.vout[i].value});
                  else
                    addresses[index].amount = addresses[index].amount + tx.vout[i].value;

                  loop.break(true);
                  loop.next();
                });
              } else {
                // no addresses defined
                // check if bitcoin features are enabled
                if (settings.blockchain_specific.bitcoin.enabled == true) {
                  // assume the asm value is a P2PK (Pay To Pubkey) public key that should be encoded as a P2PKH (Pay To Pubkey Hash) address
                  encodeP2PKaddress(tx.vout[i].scriptPubKey.asm, function(p2pkh_address) {
                    // check if the address was encoded properly
                    if (p2pkh_address != null) {
                      // mark this tx as p2pk
                      tx_type = 'p2pk';

                      // check if address is inside an array
                      if (Array.isArray(p2pkh_address)) {
                        // extract the address
                        p2pkh_address = p2pkh_address[0];
                      }

                      // save the P2PKH address
                      module.exports.is_unique(addresses, p2pkh_address, 'hash', function(unique, index) {
                        if (unique == true)
                          addresses.push({hash: p2pkh_address, amount: tx.vout[i].value});
                        else
                          addresses[index].amount = addresses[index].amount + tx.vout[i].value;

                        loop.break(true);
                        loop.next();
                      });
                    } else {
                      // could not decipher the address, save as unknown and move to next vin
                      console.log('Failed to find vin address from tx ' + input.txid);
                      module.exports.is_unique(addresses, 'unknown_address', 'hash', function(unique, index) {
                        if (unique == true)
                          addresses.push({hash: 'unknown_address', amount: tx.vout[i].value});
                        else
                          addresses[index].amount = addresses[index].amount + tx.vout[i].value;

                        loop.break(true);
                        loop.next();
                      });
                    }
                  });
                } else {
                  // could not decipher the address, save as unknown and move to next vin
                  console.log('Failed to find vin address from tx ' + input.txid);
                  module.exports.is_unique(addresses, 'unknown_address', 'hash', function(unique, index) {
                    if (unique == true)
                      addresses.push({hash: 'unknown_address', amount: tx.vout[i].value});
                    else
                      addresses[index].amount = addresses[index].amount + tx.vout[i].value;

                    loop.break(true);
                    loop.next();
                  });
                }
              }
            } else
              loop.next();
          }, function() {
            return cb(addresses, tx_type);
          });
        } else
          return cb();
      });
    }
  },

  prepare_vin: function(tx, cb) {
    var arr_vin = [];
    var tx_type = null;

    module.exports.syncLoop(tx.vin.length, function (loop) {
      var i = loop.iteration();

      module.exports.get_input_addresses(tx.vin[i], tx.vout, function(addresses, tx_type_vin) {
        // check if the tx type is set
        if (tx_type_vin != null) {
          // set the tx type return value
          tx_type = tx_type_vin;
        }

        if (addresses && addresses.length) {
          module.exports.is_unique(arr_vin, addresses[0].hash, 'addresses', function(unique, index) {
            if (unique == true) {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat) {
                arr_vin.push({addresses: addresses[0].hash, amount: amount_sat});
                loop.next();
              });
            } else {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat) {
                arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                loop.next();
              });
            }
          });
        } else {
          // could not decipher the address, save as unknown and move to next vin
          console.log('Failed to find vin address from tx ' + tx.txid);
          module.exports.is_unique(arr_vin, 'unknown_address', 'addresses', function(unique, index) {
            if (unique == true)
              arr_vin.push({addresses: 'unknown_address', amount: 0});

            loop.next();
          });
        }
      });
    }, function() {
      return cb(arr_vin, tx_type);
    });
  },

  create_lock: function(lock) {
    const fs = require('fs');
    var fname = './tmp/' + lock + '.pid';

    try {
      fs.appendFileSync(fname, process.pid.toString());
      return true;
    } catch(err) {
      console.log("Error: Unable to remove lock: %s", fname);
      return false;
    }
  },

  remove_lock: function(lock) {
    const fs = require('fs');
    var fname = './tmp/' + lock + '.pid';

    try {
      fs.unlinkSync(fname);
      return true;
    } catch(err) {
      console.log("Error: Unable to remove lock: %s", fname);
      return false;
    }
  },

  is_locked: function(lock_array, silent = false) {
    const fs = require('fs');
    const path = require('path');
    var retVal = false;

    // loop through all lock files that need to be checked
    for (var i = 0; i < lock_array.length; i++) {
      var pidFile = path.join(path.dirname(__dirname), 'tmp', `${lock_array[i]}.pid`);

      // check if the script is already running (tmp/file.pid file already exists)
      if (fs.existsSync(pidFile)) {
        const { execSync } = require('child_process');
        var deactivateLock = false;

        // the pid file exists
        // determine the operating system
        switch (process.platform) {
          case 'win32':
            // windows
            // run a cmd that will determine if the lock should still be active
            var cmdResult = execSync(`tasklist /FI "PID eq ${fs.readFileSync(pidFile).toString()}"`);

            // check if the process that created the lock is actually still running (crude check by testing for # of carriage returns or node.exe process running, but should work universally across different systems and languages)
            if (cmdResult.toString().split('\n').length < 4 || cmdResult.toString().toLowerCase().indexOf('\nnode.exe') == -1) {
              // lock should be deactivated
              deactivateLock = true;
            }

            break;
          default:
            // linux or other
            // run a cmd that will determine if the lock should still be active

            try {
              var cmdResult = execSync('ps -p `cat "' + pidFile + '"` > /dev/null');
            } catch (err) {
              // if an error occurs, the process is NOT running and therefore the lock should be deactivated
              deactivateLock = true;
            }
        }

        // check if the lock should be deactivated
        if (deactivateLock) {
          // script is not actually running so the lock file can be deleted
          try {
            fs.rmSync(pidFile);
          } catch(err) {
            if (!silent)
              console.log(`Failed to delete lock file ${pidFile}: ${err}`);
          }
        } else {
          // script is running
          if (!silent)
            console.log(`${lock_array[i]} script is running..`);

          retVal = true;

          break;
        }
      }
    }

    return retVal;
  }
};