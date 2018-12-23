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
* worker2.js                                           Independent nodejs worker
* ------------------------------------------------------------------------------
*
* worker2.js iterates through all giveaway and autosweep to receiver
* if option set in the user settings
*
* ==============================================================================
*/

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
    await wait(5*900*60) // all 5 minutes
  }
})()

async function processJob (giveaways) {
  try {

    console.log('worker2.js', ['Check for auto sweep to user...'])


    for(i=0; i<giveaways.rows.length; i++){
      let giveawayData = giveaways.rows[i].doc

      console.log('worker2.js', ['Giveaway id: ' + giveawayData._id])

      // Check recieved amount by the address - 0 unconfirmed / 1 confirmed
      let received = await blockchain.getReceivedByAddress(giveawayData.address)

      // Check auto sweep setting of the receiver
      let receiverData = await storage.GetAccountByID(giveawayData.to_id)
      receiverData=receiverData.rows[0].doc
      let autoSweep = receiverData.auto_sweep


      // Check if autoSweep set
      if (received[1].result > 0 && autoSweep == 1) {

        // get giveaway data
        let to_id = giveawayData.to_id
        let address = giveawayData.address
        let wifKey = giveawayData.WIF

        // Check if sender address is set
        let SweepAddress=receiverData.user_address
        if (SweepAddress == "" || SweepAddress == "NA") {

          // If not set, only log ...
          // TODO: Return it to main address (giveaway pot)
          logger.log('worker2.js', [giveawayData._id, 'Address not set for this account', receiverData ])

        } else {


          // List unspent and create tx
          let unspentOutputs = await blockchain.listunspent(address)
          let createTx = signer.createTransaction
          let tx = createTx(unspentOutputs.result, SweepAddress, received[1].result, config.fee_tx, wifKey)

          // broadcasting
          logger.log('worker2.js', [giveawayData._id, 'Broadcasting tx: ', tx ])
          let broadcastResult = await blockchain.broadcastTransaction(tx)

          // Log an store result
          giveawayData.state = 3
          giveawayData.sweep_result = giveawayData.sweep_result || {}
          giveawayData.sweep_result[Date.now()] = {
            'tx': tx,
            'broadcast': broadcastResult
          }
          logger.log('worker2.js', [giveawayData._id, 'Store result: ', JSON.stringify(broadcastResult) ])
          await storage.saveGiveaway(giveawayData)



        } // end if/else address not set
      } // end if auto sweep
    } // end for

  } catch (error) {
    logger.error('worker2.js', [ error.message, error.stack ])
  } // end try
}
