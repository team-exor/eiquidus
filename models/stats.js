const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const D0 = () => mongoose.Types.Decimal128.fromString('0');

const StatsSchema = new Schema({
  coin: { type: String },
  count: { type: Number, default: 1 },
  last: { type: Number, default: 1 },
  supply: { type: Schema.Types.Decimal128, default: D0 },
  txes: { type: Number, default: 0 },
  connections: { type: Number, default: 0 },
  last_price: { type: Schema.Types.Decimal128, default: D0 },
  last_usd_price: { type: Schema.Types.Decimal128, default: D0 },
  blockchain_last_updated: { type: Number, default: 0 },
  reward_last_updated: { type: Number, default: 0 },
  masternodes_last_updated: { type: Number, default: 0 },
  network_last_updated: { type: Number, default: 0 },
  richlist_last_updated: { type: Number, default: 0 },
  markets_last_updated: { type: Number, default: 0 },
  orphan_index: { type: Number, default: 0 },
  orphan_current: { type: Number, default: 0 },
  newer_claim_address: { type: Boolean, default: false },
  address_count: { type: Number, default: 0 }
});

module.exports = mongoose.model('coinstats', StatsSchema);