describe('market', function() {
  describe('dexomy', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const dexomy = require('../lib/markets/dexomy');

      dexomy.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(100);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(100);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(100);
        expect(Object.keys(obj.stats).length).toEqual(5);
        expect(obj.chartdata.length).toBeGreaterThan(0);
        expect(obj.chartdata.length).toBeLessThanOrEqual(96);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('dextrade', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const dextrade = require('../lib/markets/dextrade');

      dextrade.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(1000);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(1000);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(25);
        expect(Object.keys(obj.stats).length).toEqual(6);
        expect(obj.chartdata.length).toBeGreaterThan(0);
        expect(obj.chartdata.length).toBeLessThanOrEqual(96);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('freiexchange', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const freiexchange = require('../lib/markets/freiexchange');

      freiexchange.get_data({ coin: 'LTC', exchange: 'BTC' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(500);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(500);

        // NOTE: Commenting out the trade data since the trades api seems to have been discontinued.
        //       It will be reimplemented again later if the trades api ever returns.
        //expect(obj.trades.length).toBeGreaterThan(0);
        //expect(obj.trades.length).toBeLessThanOrEqual(100);
        expect(obj.trades.length).toEqual(0);
        expect(Object.keys(obj.stats).length).toEqual(8);
        expect(obj.chartdata).toEqual(null);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('nestex', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const nestex = require('../lib/markets/nestex');

      nestex.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(100);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(100);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(300);
        expect(Object.keys(obj.stats).length).toEqual(7);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('nonkyc', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const nonkyc = require('../lib/markets/nonkyc');

      nonkyc.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(100);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(100);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(300);
        expect(Object.keys(obj.stats).length).toEqual(9);
        expect(obj.chartdata.length).toBeGreaterThan(0);
        expect(obj.chartdata.length).toBeLessThanOrEqual(96);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('poloniex', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const poloniex = require('../lib/markets/poloniex');

      poloniex.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(50);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(50);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(500);
        expect(Object.keys(obj.stats).length).toEqual(7);
        expect(obj.chartdata.length).toBeGreaterThan(0);
        expect(obj.chartdata.length).toBeLessThanOrEqual(96);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('yobit', function() {
    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    it('should return market data', function(done) {
      const yobit = require('../lib/markets/yobit');

      yobit.get_data({ coin: 'BTC', exchange: 'USDT' }, function(err, obj) {
        expect(err).toEqual(null);
        expect(obj.buys.length).toBeGreaterThan(0);
        expect(obj.buys.length).toBeLessThanOrEqual(150);
        expect(obj.sells.length).toBeGreaterThan(0);
        expect(obj.sells.length).toBeLessThanOrEqual(150);
        expect(obj.trades.length).toBeGreaterThan(0);
        expect(obj.trades.length).toBeLessThanOrEqual(150);
        expect(Object.keys(obj.stats).length).toEqual(6);
        expect(obj.chartdata).toEqual(null);
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });
});