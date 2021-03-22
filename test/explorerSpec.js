describe('explorer', function() {
  var lib = require('../lib/explorer');
  var data = require('./testData.js');

  describe('convert_to_satoshi', function() {
    it('should be able to convert round numbers', function() {
      lib.convert_to_satoshi(500, function(amount_sat) {
        expect(amount_sat).toEqual(50000000000);
      });
    });

    it('should be able to convert decimals above 1', function() {
      lib.convert_to_satoshi(500.12564, function(amount_sat) {
        expect(amount_sat).toEqual(50012564000);
      });
    });

    it('should be able to convert decimals below 1', function() {
      lib.convert_to_satoshi(0.0005, function(amount_sat) {
        expect(amount_sat).toEqual(50000);
      });
    });
  });

  describe('is_unique', function() {
    var arrayStrMap = [
      {'addresses' : 'XsF8k8s5CoS3XATqW2FkuTsznbJJzFAC2U'},
      {'addresses' : 'XsF8k8s5C14FbhqW2FkuATsznFACAfVhUn'},
      {'addresses' : 'XsF8k8s5CoAF5gTqW2FkuTsznbJJzhkj5A'},
      {'addresses' : 'XfuW2K9QiGMSsq5eXgtimEQvTvz9dzBCzb'}
    ];

    var arrayArrMap = [
      {'addresses' : ['XsF8k8s5CoS3XATqW2FkuTsznbJJzFAC2U']},
      {'addresses' : ['XsF8k8s5C14FbhqW2FkuATsznFACAfVhUn']},
      {'addresses' : ['XsF8k8s5CoAF5gTqW2FkuTsznbJJzhkj5A']},
      {'addresses' : ['XfuW2K9QiGMSsq5eXgtimEQvTvz9dzBCzb']}
    ];

    it('should return index of matching string object', function() {
      lib.is_unique(arrayStrMap, arrayStrMap[2].addresses, 'addresses', function(unique, index) {
        expect(index).toEqual(2);
        expect(unique).toEqual(false);
      });
    });

    it('should return index of matching array object', function() {
      lib.is_unique(arrayArrMap, arrayArrMap[2].addresses, 'addresses', function(unique, index) {
        expect(index).toEqual(2);
        expect(unique).toEqual(false);
      });
    });

    it('should return true if no matching string object', function() {
      lib.is_unique(arrayStrMap, 'unique', 'addresses', function(unique, index) {
        expect(index).toEqual(null);
        expect(unique).toEqual(true);
      });
    });

    it('should return true if no matching array object', function() {
      lib.is_unique(arrayArrMap, ['unique'], 'addresses', function(unique, index) {
        expect(index).toEqual(null);
        expect(unique).toEqual(true);
      });
    });
  });

  describe('prepare_vout', function() {
    var originalTimeout;

    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should ignore nonstandard outputs', function(done) {
      lib.prepare_vout(data.txA().vout, data.txA().txid, data.txA().vin, ((typeof data.txA().vjoinsplit === 'undefined' || data.txA().vjoinsplit == null) ? [] : data.txA().vjoinsplit), function(prepared) {
        expect(prepared.length).toEqual(2);
        done();
      });
    });

    it('should maintain order', function(done) {
      lib.prepare_vout(data.txA().vout, data.txA().txid, data.txA().vin, ((typeof data.txA().vjoinsplit === 'undefined' || data.txA().vjoinsplit == null) ? [] : data.txA().vjoinsplit), function(prepared) {
        expect(prepared[1].amount).toEqual(17499989908960);
        expect(prepared[1].addresses).toEqual('ENpRvyLpLFEyrMZthAGABhxZi3N4Byk3Ab');
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('calculate_total', function() {
    var originalTimeout;

    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should calculate correct total', function(done) {
      lib.prepare_vout(data.txA().vout, data.txA().txid, data.txA().vin, ((typeof data.txA().vjoinsplit === 'undefined' || data.txA().vjoinsplit == null) ? [] : data.txA().vjoinsplit), function(prepared) {
        lib.calculate_total(prepared, function(total) {
          expect(total).toEqual(19499989908960);
          done();
        });
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('prepare_vin', function() {
    var originalTimeout;

    beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should return array of correct length', function(done) {
      lib.prepare_vin(data.txB(), function(prepared) {
        expect(prepared.length).toEqual(1);
        done();
      });
    });

    it('should get correct input addresses', function(done) {
      lib.prepare_vin(data.txB(), function(prepared) {
        expect(prepared[0].amount).toEqual(27499989920000);
        expect(prepared[0].addresses).toEqual('coinbase');
        done();
      });
    });

    afterEach(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });
});