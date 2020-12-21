module.exports = {
  txA: function() {
    return {
      "hex": "01000000017eb15ab57385cba5f3cf98c61aa539b0935310167f242e38b56ffc8df8d205af000000006a473044022067081a04ac02c066e3584f4fe4b0cf16ed25341234b0507fb3c2adf6e0b412d2022024e57e1882db5b25ad772d661f805dea48173f0b7769108805c52e671a8f4e0d012103c45f64a58623d6586c3316f4e810815d42ed1284ad5da2748f67e9440a242848ffffffff0200204aa9d10100001976a914c28b8eb72accf4a5674d09f9819822ceacbbcb5088ace09dae88ea0f00001976a9143e21d7f627a05504811ade3de943a09bd5bcb0be88ac00000000",
      "txid": "57a09665c67703f6be22e5e4725261e6e8a63c975237cf114c6c44d0e303f564",
      "version": 1,
      "locktime": 0,
      "vin": [
        {
          "txid": "af05d2f88dfc6fb5382e247f16105393b039a51ac698cff3a5cb8573b55ab17e",
          "vout": 0,
          "scriptSig": {
            "asm": "3044022067081a04ac02c066e3584f4fe4b0cf16ed25341234b0507fb3c2adf6e0b412d2022024e57e1882db5b25ad772d661f805dea48173f0b7769108805c52e671a8f4e0d01 03c45f64a58623d6586c3316f4e810815d42ed1284ad5da2748f67e9440a242848",
            "hex": "473044022067081a04ac02c066e3584f4fe4b0cf16ed25341234b0507fb3c2adf6e0b412d2022024e57e1882db5b25ad772d661f805dea48173f0b7769108805c52e671a8f4e0d012103c45f64a58623d6586c3316f4e810815d42ed1284ad5da2748f67e9440a242848"
          },
          "sequence": 4294967295
        }
      ],
      "vout": [
        {
          "value": 20000,
          "n": 0,
          "scriptPubKey": {
            "asm": "OP_DUP OP_HASH160 c28b8eb72accf4a5674d09f9819822ceacbbcb50 OP_EQUALVERIFY OP_CHECKSIG",
            "hex": "76a914c28b8eb72accf4a5674d09f9819822ceacbbcb5088ac",
            "reqSigs": 1,
            "type": "pubkeyhash",
            "addresses": [
              "EatZmRVp2RC1eWjDDs3T97qjHiRQd4fcY3"
            ]
          }
        },
        {
          "value": 174999.8990896,
          "n": 1,
          "scriptPubKey": {
            "asm": "OP_DUP OP_HASH160 3e21d7f627a05504811ade3de943a09bd5bcb0be OP_EQUALVERIFY OP_CHECKSIG",
            "hex": "76a9143e21d7f627a05504811ade3de943a09bd5bcb0be88ac",
            "reqSigs": 1,
            "type": "pubkeyhash",
            "addresses": [
              "ENpRvyLpLFEyrMZthAGABhxZi3N4Byk3Ab"
            ]
          }
        }
      ],
      "blockhash": "0000044ac8528db3bc14ec7f81a94b2f731d01f37e7a67352b315f1116f0a90b",
      "confirmations": 795824,
      "time": 1558978791,
      "blocktime": 1558978791
    };
  },
  txB: function() {
    return {
      "hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff05029a000102ffffffff01006921d702190000232103ccc28ef6edc7bd2d361cee574eeebe40ec84a0b0513bd98580af0d68926ce848ac00000000",
      "txid": "2e3dab17d71f8e53e8fa840469715622bb791a656419c47b56ceea695c6a082b",
      "version": 1,
      "locktime": 0,
      "vin": [
        {
          "coinbase": "029a000102",
          "sequence": 4294967295
        }
      ],
      "vout": [
        {
          "value": 274999.8992,
          "n": 0,
          "scriptPubKey": {
            "asm": "03ccc28ef6edc7bd2d361cee574eeebe40ec84a0b0513bd98580af0d68926ce848 OP_CHECKSIG",
            "hex": "2103ccc28ef6edc7bd2d361cee574eeebe40ec84a0b0513bd98580af0d68926ce848ac",
            "reqSigs": 1,
            "type": "pubkey",
            "addresses": [
              "ELZzVxeCjZi5Zry15hbe8NLMmTJQuegi26"
            ]
          }
        }
      ],
      "blockhash": "00000305e5aede3aa79ca07e5d3976f9cfac7098fcbcaea109c15ee4688ee409",
      "confirmations": 795794,
      "time": 1558980932,
      "blocktime": 1558980932
    };
  }
};