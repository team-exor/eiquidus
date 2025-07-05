var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var PeersSchema = new Schema({
  createdAt: { type: Date, expires: 86400, default: Date.now() },
  address: { type: String, default: "", index: true },
  port: { type: String, default: "" },
  protocol: { type: String, default: "" },
  version: { type: String, default: "" },
  country: { type: String, default: "" },
  country_code: { type: String, default: "" },
  ipv6: { type: Boolean, default: false },
  table_type: {
    type:    String,
    enum:    ["C", "A", "O"], // "C"=Connections, "A"=AddNodes, "O"=OneTry
    default: "C",
    index:   true
  }
});

PeersSchema.index({
  table_type: 1,
  ipv6:       1,
  address:    1,
  protocol:  -1,
  port:       1
}, {
  name: 'peer_compound_idx',
  background: true
});

module.exports = mongoose.model('Peers', PeersSchema);