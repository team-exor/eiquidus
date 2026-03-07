const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const D0 = () => mongoose.Types.Decimal128.fromString('0');

const AddressSchema = new Schema({
  a_id: { type: String, unique: true, index: true},
  name: { type: String },  // no longer used but cannot be removed or else older versions that have data here will not be able to auto move claim name data to the new claimaddress collection
  received: { type: Schema.Types.Decimal128, default: D0, index: true },
  sent: { type: Schema.Types.Decimal128, default: D0, index: true },
  balance: {type: Schema.Types.Decimal128, default: D0, index: true}
}, {id: false});

module.exports = mongoose.model('Address', AddressSchema);