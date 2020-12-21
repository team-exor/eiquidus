describe('market', function() {
  var poloniex = require('../lib/markets/poloniex');

  describe('poloniex', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should return market data', function(done) {
      poloniex.get_data({ coin: 'LTC', exchange: 'BTC' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toEqual(50);
        expect(obj.sells.length).toEqual(50);
        expect(obj.trades.length).toEqual(200);
        expect(Object.keys(obj.stats).length).toEqual(7);
        expect(obj.chartdata.length).toBeGreaterThan(10);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });
});