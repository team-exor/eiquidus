var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ClaimAddressSchema = new Schema({
  a_id: {type: String, unique: true, index: true},
  claim_name: {type: String, default: '', index: true}
}, {id: false});

module.exports = mongoose.model('ClaimAddress', ClaimAddressSchema);