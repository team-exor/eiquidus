var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var AddressSchema = new Schema({
  a_id: { type: String, unique: true, index: true},
  name: { type: String },  // no longer used but cannot be removed or else older versions that have data here will not be able to auto move claim name data to the new claimaddress collection
  received: { type: Number, default: 0, index: true },
  sent: { type: Number, default: 0, index: true },
  balance: {type: Number, default: 0, index: true},
}, {id: false});

module.exports = mongoose.model('Address', AddressSchema);