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
* worker.js                                            Independent nodejs worker
* ------------------------------------------------------------------------------
*
* Worker iterates through all giveaway,
* marks expired and return back founds
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
    let job = await storage.GetGiveawayByState(1)
    await processJob(job)
    await wait(60*1000*60) // all 60 minutes
  }
})()

async function processJob (giveaways) {
  try {

    console.log('worker.js', ['Check for expired giveaway...'])


    for(i=0; i<giveaways.rows.length; i++){
      let giveawayData = giveaways.rows[i].doc

      console.log('worker.js', ['Giveaway id: ' + giveawayData._id])

      // Check recieved amount by the address - 0 unconfirmed / 1 confirmed
      let received = await blockchain.getReceivedByAddress(giveawayData.address)

      // Check if expired date
      if (received[1].result > 0 && new Date(giveawayData.expire)<new Date()) {

        // get giveaway data
        let from_id = giveawayData.from_id
        let address = giveawayData.address
        let wifKey = giveawayData.WIF

        // Get the user data
        let senderData = await storage.GetAccountByID(from_id)
        senderData=senderData.rows[0].doc
        let ReturnAddress=senderData.user_address

        // Check if sender address is set
        if (ReturnAddress == "" || ReturnAddress == "NA") {

          // If not set, only log ...
          // TODO: Return it to main address (giveaway pot)
          logger.log('worker.js', [giveawayData._id, 'Address not set for this account', senderData ])

        } else {

          // List unspent and create tx
          let unspentOutputs = await blockchain.listunspent(address)
          let createTx = signer.createTransaction
          let tx = createTx(unspentOutputs.result, ReturnAddress, received[1].result, config.fee_tx, wifKey)

          // broadcasting
          logger.log('worker.js', [giveawayData._id, 'Broadcasting tx: ', tx ])
          let broadcastResult = await blockchain.broadcastTransaction(tx)

          // Log an store result
          giveawayData.state = 2
          giveawayData.sweep_result = giveawayData.sweep_result || {}
          giveawayData.sweep_result[Date.now()] = {
            'tx': tx,
            'broadcast': broadcastResult
          }
          logger.log('worker.js', [giveawayData._id, 'Store result: ', JSON.stringify(broadcastResult) ])
          await storage.saveGiveaway(giveawayData)


        } // end if/else address not set
      } // end if epire
    } // end for

  } catch (error) {
    logger.error('worker.js', [ error.message, error.stack ])
  } // end try
}
