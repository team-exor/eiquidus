var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var StatsSchema = new Schema({
  coin: { type: String },
  count: { type: Number, default: 1 },
  last: { type: Number, default: 1 },
  supply: { type: Number, default: 0 },
  txes: { type: Number, default: 0 },
  connections: { type: Number, default: 0 },
  last_price: { type: Number, default: 0 },
  last_usd_price: { type: Number, default: 0 },
  blockchain_last_updated: { type: Number, default: 0 },
  reward_last_updated: { type: Number, default: 0 },
  masternodes_last_updated: { type: Number, default: 0 },
  network_last_updated: { type: Number, default: 0 },
  richlist_last_updated: { type: Number, default: 0 },
  markets_last_updated: { type: Number, default: 0 }
});

module.exports = mongoose.model('coinstats', StatsSchema);