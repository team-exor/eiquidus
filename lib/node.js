var rpc = require('./jsonrpc');

function Client(opts) {
  this.rpc = new rpc.Client(opts);
};

Client.prototype.cmd = function() {
  var args = [].slice.call(arguments);
  var cmd = args.shift();

  callRpc(cmd, args, this.rpc);
};

function callRpc (cmd, args, rpc) {
  var fn = args[args.length - 1];

  // if the last argument is a callback, pop it from the args list
  if (typeof fn === 'function')
    args.pop();
  else
    fn = function () {};

  rpc.call(cmd, args, function () {
    var args = [].slice.call(arguments);

    args.unshift(null);
    fn.apply(this, args);
  }, function(err) {
    fn(err);
  });
};

module.exports.Client = Client;