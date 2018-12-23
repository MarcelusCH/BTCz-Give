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
* smoke-test.js                                      Required by other processes
* ------------------------------------------------------------------------------
*
* Simple smoke tests to check accessibility of database and RPC
* Log error into consol and exit on error with code 1 or 2
*
* ==============================================================================
*/

let bitcoind = require('./models/blockchain')
let rp = require('request-promise')
let config = require('./config')
let assert = require('assert')

;(async () => {
  try {
    let info = await bitcoind.getblockchaininfo()
    assert(info.result.chain)
  } catch (err) {
    console.log('BitcoinZ Core RPC problem: ', err)
    process.exit(1)
  }

  try {
    let couchdb = await rp.get({url: config.couchdb, json: true})
    assert(couchdb.db_name)
  } catch (err) {
    console.log('Couchdb problem: ', err)
    process.exit(2)
  }
})()
