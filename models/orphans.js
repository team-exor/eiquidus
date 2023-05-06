var mongoose = require('mongoose'),
   Schema = mongoose.Schema;

var OrphanSchema = new Schema({
  blockindex: {type: Number, default: 0, index: true},
  orphan_blockhash: {type: String, unique: true, index: true},
  good_blockhash: {type: String, index: true},
  prev_blockhash: {type: String, index: true},
  next_blockhash: {type: String, index: true}
}, {id: false});

module.exports = mongoose.model('Orphan', OrphanSchema);