var mongoose = require('mongoose'),
   Schema = mongoose.Schema;

var NetworkHistorySchema = new Schema({
  blockindex: {type: Number, default: 0, index: true},
  nethash: { type: Number, default: 0 },
  difficulty_pow: { type: Number, default: 0 },
  difficulty_pos: { type: Number, default: 0 }
}, {id: false});

module.exports = mongoose.model('NetworkHistory', NetworkHistorySchema);