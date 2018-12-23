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
* worker3.js                                           Independent nodejs worker
* ------------------------------------------------------------------------------
*
* Worker iterates through all IP,
* Delete Ip's older than n houre
*
* ==============================================================================
*/

let rp = require('request-promise')
let storage = require('./models/storage')       // Load db call functions
let blockchain = require('./models/blockchain') // Load blockchain functions
let config = require('./config')                // Load configuration file
let logger = require('./utils/logger')          // Load the logger module
let signer = require('./models/signer')
require('./smoke-test')                         // Checking DB & BtcZ node RPC

;(async () => {
  while (1) {
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    let job = await storage.GetIpByDate(Date.now()-(config.give_gift_same_ip_time*1000*60*60))
    await processJob(job)
    await wait(60*950*60) // all 60 minutes
  }
})()

async function processJob (IPs) {
  try {

    console.log('worker3.js', ['Check for expired IP register...'])


    for(i=0; i<IPs.rows.length; i++){
      let IPitem = IPs.rows[i].doc

      console.log('worker3.js', ['Delete IP id: ' + IPitem._id])
      await storage.deleteIP(IPitem)


    } // end for

  } catch (error) {
    logger.error('worker.js', [ error.message, error.stack ])
  } // end try
}
