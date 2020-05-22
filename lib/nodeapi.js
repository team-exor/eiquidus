var onode = require('./node');
var express = require('express');
var settings = require('./settings');

module.exports = function(){
  function express_app(){
    var app = express();
    
    app.get('*', hasAccess, function(req, res){
      var method = req.path.substring(1,req.path.length);

      if('undefined' != typeof requires_passphrase[method]){
        if(wallet_passphrase) client.walletPassphrase(wallet_passphrase, 10);
        else res.send('A wallet passphrase is needed and has not been set.');
      }

      var query_parameters = req.query;
      var params = [];

      for(var parameter in query_parameters){
        if(query_parameters.hasOwnProperty(parameter)){
          var param = query_parameters[parameter];
          if(!isNaN(param)){
            param = parseFloat(param);
          }
          params.push(param);
        }
      }

      var command = [];

      if (method == 'sendmany' || 
          method == 'getmasternodecountonline' || 
          method == 'getmasternodecount' || 
          method == 'getmasternodelist' || 
          method == 'getvotelist') {
        command = specialApiCase(method);
      } else {
        command = [{
          method: method,
          params: params
        }];
      }

      client.cmd(command, function(err, response){
        if(err){console.log(err); res.send("There was an error. Check your console.");}
        else{
          if(typeof response === 'object'){
            res.json(response);
          }
          else{
            res.setHeader('content-type', 'text/plain');
            res.end(response.toString());
          }
        }
      });
    });
    
    function hasAccess(req, res, next){
      if(accesslist.type == 'all'){
        return next();
      }

      var method = req.path.substring(1,req.path.length);
      if('undefined' == typeof accesslist[method]){
        if(accesslist.type == 'only') res.end('This method is restricted.');
        else return next();
      }
      else{
        if(accesslist[method] == true){
          return next();
        }
        else res.end('This method is restricted.');
      } 
    }

    function specialApiCase(method_name){
      var params = [];
	  
      switch(method_name) {
        case 'sendmany':
          var after_account = false;
          var before_min_conf = true;
          var address_info = {};
          for(var parameter in query_parameters){
            if(query_parameters.hasOwnProperty(parameter)){
              if(parameter == 'minconf'){
                before_min_conf = false;
                params.push(address_info);
              }
              var param = query_parameters[parameter];
              if(!isNaN(param)){
                param = parseFloat(param);
              }
              if(after_account && before_min_conf){
                address_info[parameter] = param;
              }
              else {
                params.push(param);
              }
              if(parameter == 'account') after_account = true;           
            }
          }
          if(before_min_conf){
            params.push(address_info);
          }
          break;
        case 'getvotelist':
          method_name = 'masternodelist'
          params.push('votes');
          break;
        case 'getmasternodelist':
          method_name = 'masternode'
          params.push('list');
          break;
        case 'getmasternodecountonline':
          method_name = 'masternode';
          params.push('count');
          params.push('enabled');
          break;
        case 'getmasternodecount':
		  // split cmd by spaces
		  var sSplit = settings.api_cmds.masternode_count.split(' ');
          for (i=0; i<sSplit.length; i++) {
            if (i==0)
              method_name = sSplit[i];
            else
              params.push(sSplit[i]);
          }
          break;
      }

      return [{
        method: method_name,
        params: params
      }];
    }

    return app;
  };

  var accesslist = {};
  accesslist.type = 'all';
  var client = {};
  var wallet_passphrase = null;
  var requires_passphrase = {
    'dumpprivkey': true,
    'importprivkey': true,
    'keypoolrefill': true,
    'sendfrom': true,
    'sendmany': true,
    'sendtoaddress': true,
    'signmessage': true,
    'signrawtransaction': true
  };

  function setAccess(type, access_list){
    //Reset//
    accesslist = {};
    accesslist.type = type;

    if(type == "only"){
      var i=0;
      for(; i<access_list.length; i++){
        accesslist[access_list[i]] = true;
      }
    }

    if(type == "restrict"){
      var i=0;
      for(; i<access_list.length; i++){
        accesslist[access_list[i]] = false;
      }
    }

    //Default is for security reasons. Prevents accidental theft of coins/attack

    if(type == 'default-safe'){
      accesslist.type = 'restrict';
      var restrict_list = ['dumpprivkey', 'walletpassphrasechange', 'stop'];
      var i=0;
      for(;i<restrict_list.length;i++){
        accesslist[restrict_list[i]] = false;
      }
    }

    if(type == 'read-only'){
      accesslist.type = 'restrict';
      var restrict_list = ['addmultisigaddress', 'addnode', 'backupwallet', 'createmultisig', 'createrawtransaction', 'encryptwallet', 'importprivkey', 'keypoolrefill', 'lockunspent', 'move', 'sendfrom', 'sendmany', 'sendrawtransaction', 'sendtoaddress', 'setaccount', 'setgenerate', 'settxfee', 'signmessage', 'signrawtransaction', 'stop', 'submitblock', 'walletlock', 'walletpassphrasechange'];
      var i=0;
      for(;i<restrict_list.length;i++){
        accesslist[restrict_list[i]] = false;
      }
    }
  };

  function setWalletDetails(details){
    if('undefined' == typeof details.rpc){
      client = new onode.Client(details);
    }
    else{
      client = details;
    }
  };

  function setWalletPassphrase(passphrase){
    wallet_passphrase = passphrase;
  };

  return {
    app: express_app(),
    setAccess: setAccess,
    setWalletDetails: setWalletDetails,
    setWalletPassphrase: setWalletPassphrase
  }
}();
