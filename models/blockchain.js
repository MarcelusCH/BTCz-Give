/**
* ==============================================================================
* BTCz-Give
* ==============================================================================
*
* Version 0.1.0 (beta)
*
* BitcoinZ giveaway tool
* https://github.com/MarcelusCH/BTCz-Give
*
* ------------------------------------------------------------------------------
* blockchain.js                                      Required by other processes
* ------------------------------------------------------------------------------
*
* This file define the blockchain call functions.
*
* ==============================================================================
*/

let config = require('../config')
let jayson = require('jayson/promise')
let url = require('url')
let rpc = url.parse(config.bitcoind.rpc)
rpc.timeout = 5000
let client = jayson.client.http(rpc)

function importaddress (address) {
  return client.request('importaddress', [address, address, false])
}


// -----------------------------------------------------------------------------
// Return the amount received (and confirmation up to 5) by address
// -----------------------------------------------------------------------------
exports.getReceivedByAddress = function (address) {
  let reqs = [
    client.request('getreceivedbyaddress', [address, 0]),
    client.request('getreceivedbyaddress', [address, 1]),
    client.request('getreceivedbyaddress', [address, 2]),
    client.request('getreceivedbyaddress', [address, 3]),
    client.request('getreceivedbyaddress', [address, 4]),
    client.request('getreceivedbyaddress', [address, 5]),
  ]
  return Promise.all(reqs)
} // ---------------------------------------------------------------------------


//./bitcoinz-cli listtransactions t1UzbNHHGMKso77RCHMZBqUTWUdzqoZJVKa 10 0 true
exports.listTransactions = function (address) {
  return client.request('listtransactions', [address, 10, 0, true])
}

//./bitcoinz-cli  gettransaction 685f2a4146ce61351a7e6f1e8db63241911dccce05f548460d4d19f29c7deed4
exports.getTransaction = function (txid) {
  return client.request('gettransaction', [txid])
}
exports.getRawTransaction = function (txid) {
  return client.request('getrawtransaction', [txid])
}

// ./bitcoinz-cli decoderawtransaction 01000000029c1fda7f486be8f03f20d57d0f9e772ca4e1403f01a287d67674aa9974e7e2a5000000006b483045022100aeae3e0ad718a4f65a72080ede97a4e4a12a7f59ee9e1e40159409263f58a715022038214dacbc26a209aaebbd72c7e9b86b698b57f48c3141275b5dc1dee0b997f20121036fd78a054339c77e4b8bad2e2a8696fa9dc634c0e16d0ce98282264dd10f3b2bffffffffcfb498fb80f7d5e20dc17a200a9252fa9b1af35421507021ecc4558d06280b88000000006a473044022055083e48601f8abd240832beebe9f2ce710bbb63a8533b07cbd7b7e71540741e02201ec4412801dcab61c4926a00b2b52c4d96752fd32b5d650c7b2de265d1bf0843012103dbf024f889e1b3f36745883ede89b8f2de9f73a06fc793847331f7917061ef90ffffffff02405df305000000001976a9147b2af9c49fc22e44da2a7ee8e9c4b4b7b57c7f7088ac00e1f505000000001976a91479fbc3163ae054d672bdea23836dfc54d71158ff88ac00000000
exports.decodeRawTransaction = function (hex) {
  return client.request('decoderawtransaction', [hex])
}




function getblockchaininfo () {
  return client.request('getblockchaininfo', [])
}

function listunspent (address) {
  return client.request('listunspent', [0, 9999999, [address]])
}

function broadcastTransaction (tx) {
  return client.request('sendrawtransaction', [tx])
}

exports.importaddress = importaddress
exports.getblockchaininfo = getblockchaininfo
exports.listunspent = listunspent
exports.broadcastTransaction = broadcastTransaction
