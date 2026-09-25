// CryptoID-compatible API (chainz.cryptoid.info/freed/api.dws) served locally.
// Mounted at /v2/api.dws and /freed/api.dws so an exchange can migrate by
// changing only the hostname. Response shapes match CryptoID exactly,
// including its inconsistencies: most values are bare text, getblockhash is
// JSON-quoted, addressfirstseen is a plain datetime string.
const express = require('express');
const router = express.Router();
const settings = require('../lib/settings');
const db = require('../lib/database');
const lib = require('../lib/explorer');
const Decimal = require('decimal.js');
const mongoose = require('mongoose');
const Address = require('../models/address');
const AddressTx = require('../models/addresstx');
const Peers = require('../models/peers');

const ZERO = () => mongoose.Types.Decimal128.fromString('0');

function plain(res, value) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(String(value));
}

function d(v) {
  return (v == null ? '0' : v.toString());
}

function coins(v) {
  // Address amounts are stored in satoshis; CryptoID reports coins.
  return new Decimal(d(v)).div(1e8).toString();
}

function wrapSubver(v) {
  const sv = (v == null ? '' : v.toString());
  if (sv === '') return '';
  return (sv.charAt(0) === '/' ? sv : '/' + sv + '/');
}

function posDiff(diff) {
  if (diff && typeof diff === 'object')
    return (diff['proof-of-stake'] != null ? diff['proof-of-stake'] : (diff['proof-of-work'] != null ? diff['proof-of-work'] : 0));
  return (diff == null ? 0 : diff);
}

function txTime(txid, cb) {
  if (!txid) return cb(0);
  db.get_tx(txid, function(tx) { cb(tx && tx.timestamp ? tx.timestamp : 0); });
}

function fmtTime(unix) {
  const dt = new Date(unix * 1000);
  const p = (n) => (n < 10 ? '0' : '') + n;
  return dt.getUTCFullYear() + '-' + p(dt.getUTCMonth() + 1) + '-' + p(dt.getUTCDate()) +
         ' ' + p(dt.getUTCHours()) + ':' + p(dt.getUTCMinutes()) + ':' + p(dt.getUTCSeconds());
}

function handle(req, res) {
  const q = (req.query.q || '').toString();
  const a = (req.query.a || '').toString();

  switch (q) {
    case 'getblockcount':
      return lib.get_blockcount(function(c) { plain(res, c == null ? 0 : c); });

    case 'getdifficulty':
      return lib.get_difficulty(function(diff) { plain(res, posDiff(diff)); });

    case 'getblockhash': {
      const h = parseInt(req.query.height, 10);
      if (isNaN(h)) return res.json(null);
      return lib.get_blockhash(h, function(hash) { res.json(hash || null); });
    }

    case 'totalcoins':
    case 'circulating':
      return db.get_stats(settings.coin.name, function(stats) {
        plain(res, d(stats ? stats.supply : 0));
      });

    case 'totalbc':
      return db.get_stats(settings.coin.name, function(stats) {
        plain(res, new Decimal(d(stats ? stats.supply : 0)).mul(1e8).toFixed(0));
      });

    case 'noncirculating':
      return plain(res, 0);

    case 'addresses':
      return Address.countDocuments({}).then(function(known) {
        Address.countDocuments({ balance: { $gt: ZERO() } }).then(function(nonzero) {
          res.json({ known: known, nonzero: nonzero });
        }).catch(function() { res.json({ known: known, nonzero: 0 }); });
      }).catch(function() { res.json({ known: 0, nonzero: 0 }); });

    case 'masternodecount':
      return lib.get_masternodecount(function(mn) {
        plain(res, (mn && mn.total != null ? mn.total : 0));
      });

    case 'masternodeinfo':
      return lib.get_masternodecount(function(mn) {
        res.json({
          masterNodeCount: (mn && mn.enabled != null ? mn.enabled : 0),
          serverCount: (mn && mn.total != null ? mn.total : 0)
        });
      });

    case 'nodes':
      return Peers.find({}).lean().exec().then(function(peers) {
        const groups = {};
        (peers || []).forEach(function(p) {
          const key = (p.version || '') + '|' + (p.protocol || '');
          if (!groups[key])
            groups[key] = { subver: wrapSubver(p.version), protocol: (parseInt(p.protocol, 10) || 0), nodes: [] };
          if (p.address && groups[key].nodes.indexOf(p.address) === -1)
            groups[key].nodes.push(p.address);
        });
        const out = Object.keys(groups).map(function(k) {
          groups[k].nodes.sort();
          return groups[k];
        });
        out.sort(function(x, y) { return y.nodes.length - x.nodes.length; });
        res.json(out);
      }).catch(function() { res.json([]); });

    case 'summary':
      return db.get_stats(settings.coin.name, function(stats) {
        lib.get_difficulty(function(diff) {
          const out = {};
          out[(settings.coin.symbol || '').toLowerCase()] = {
            name: settings.coin.name,
            PoW: '',
            PoS: true,
            height: (stats ? stats.count : 0),
            diff: Number(posDiff(diff)) || 0,
            supply: Number(d(stats ? stats.supply : 0)),
            ticker: { usd: Number(d(stats ? stats.last_usd_price : 0)) }
          };
          res.json(out);
        });
      });

    case 'ticker.usd':
      return db.get_stats(settings.coin.name, function(stats) {
        plain(res, d(stats ? stats.last_usd_price : 0));
      });

    case 'ticker.btc':
      // No BTC pair is tracked (market is FREED/USDT). Returning 0 rather
      // than deriving a rate we cannot source honestly.
      return plain(res, 0);

    case 'getbalance':
      if (!a) return plain(res, 0);
      return db.get_address(a, true, function(addr) {
        plain(res, (addr ? coins(addr.balance) : 0));
      });

    case 'getreceivedbyaddress':
      if (!a) return plain(res, 0);
      return db.get_address(a, true, function(addr) {
        plain(res, (addr ? coins(addr.received) : 0));
      });

    case 'addressfirstseen':
      if (!a) return plain(res, '');
      return AddressTx.findOne({ a_id: a }).sort({ blockindex: 1 }).lean().exec().then(function(first) {
        if (!first) return plain(res, '');
        txTime(first.txid, function(t) { plain(res, (t ? fmtTime(t) : '')); });
      }).catch(function() { plain(res, ''); });

    case 'addressinfo':
      if (!a) return res.json(null);
      return db.get_address(a, true, function(addr) {
        if (!addr) return res.json(null);
        AddressTx.findOne({ a_id: a }).sort({ blockindex: 1 }).lean().exec().then(function(first) {
          AddressTx.findOne({ a_id: a }).sort({ blockindex: -1 }).lean().exec().then(function(last) {
            AddressTx.countDocuments({ a_id: a }).then(function(cnt) {
              txTime(first ? first.txid : null, function(ft) {
                txTime(last ? last.txid : null, function(lt) {
                  res.json({
                    address: addr.a_id,
                    balance: Number(coins(addr.balance)),
                    firstBlock: (first ? first.blockindex : 0),
                    firstBlockTimestamp: ft,
                    lastBlock: (last ? last.blockindex : 0),
                    lastBlockTimestamp: lt,
                    transactionCount: cnt
                  });
                });
              });
            }).catch(function() { res.json(null); });
          }).catch(function() { res.json(null); });
        }).catch(function() { res.json(null); });
      });

    case 'richrank':
      if (!a) return res.json(null);
      return db.get_address(a, true, function(addr) {
        if (!addr) return res.json(null);
        const bal = new Decimal(d(addr.balance));
        if (bal.lte(0)) return res.json(null);
        Address.countDocuments({
          balance: { $gt: mongoose.Types.Decimal128.fromString(bal.toString()) }
        }).then(function(above) { res.json(above + 1); })
          .catch(function() { res.json(null); });
      });

    default:
      res.status(400);
      return plain(res, 'unknown query: ' + q);
  }
}

router.get('/v2/api.dws', handle);
router.get('/freed/api.dws', handle);

module.exports = router;
