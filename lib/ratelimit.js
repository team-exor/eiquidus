// Initialize the rate limiting class from Matteo Agosti via https://www.matteoagosti.com/blog/2013/01/22/rate-limiting-function-calls-in-javascript/
var RateLimit = (function() {
  var RateLimit = function(maxOps, interval, allowBursts) {
    this._maxRate = allowBursts ? maxOps : maxOps / interval;
    this._interval = interval;
    this._allowBursts = allowBursts;

    this._numOps = 0;
    this._start = new Date().getTime();
    this._queue = [];
  };

  RateLimit.prototype.schedule = function(fn) {
    var that = this,
        rate = 0,
        now = new Date().getTime(),
        elapsed = now - this._start;

    if (elapsed > this._interval) {
      this._numOps = 0;
      this._start = now;
    }

    rate = this._numOps / (this._allowBursts ? 1 : elapsed);

    if (rate < this._maxRate) {
      if (this._queue.length === 0) {
        this._numOps++;
        fn();
      } else {
        if (fn)
          this._queue.push(fn);

        this._numOps++;
        this._queue.shift()();
      }
    } else {
      if (fn)
        this._queue.push(fn);

      setTimeout(function() {
        that.schedule();
      }, 1 / this._maxRate);
    }
  };

  return RateLimit;
})();

module.exports = {
  RateLimit: RateLimit
};