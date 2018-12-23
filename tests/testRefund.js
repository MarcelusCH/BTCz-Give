/**
* ==============================================================================
* BTCz-Pay
* ==============================================================================
*
* Version 0.2.0 (production v1.0)
*
* Self-hosted bitcoinZ payment gateway
* https://github.com/MarcelusCH/BTCz-Pay
*
* ------------------------------------------------------------------------------
* testRefund.js                                                          For test only
* ------------------------------------------------------------------------------
*
* for tests the refund address
*
* ==============================================================================
*/

let storage = require('../models/storage')       // Load db call functions
let blockchain = require('../models/blockchain') // Load blockchain functions
let config = require('../config')                // Load configuration file
let logger = require('../utils/logger')          // Load the logger module
let signer = require('../models/signer')
require('../smoke-test')                         // Checking DB & BtcZ node RPC

;(async () => {


  // t1SskmnP1jipxQ6szoDpvocFB7nwJKyw7Wr      payed by      t1QjxjMkoqNBEYdYk2STikVJMhP5h8s1WG9
  // t1WAVDWesopTBWne1dWc5ZA99Cc85DHy3rf      payed by      t1YV3zcx5BW8CS7QziB8nUhEtDb3AUJmMzW
  // t1TPVwZPusNiTSHSwSXLCd5bTaJKP2jKveU      payed by      t1Pa3QnXaDiVLyjL2vSxN3nbJJzg9S6ZPhX
  // t1UMVAn3XTzN41vMjxAG2x8ztNVLXNbn1Fj      payed by      t1Pa3QnXaDiVLyjL2vSxN3nbJJzg9S6ZPhX
  // t1SvZZD6mc7xX4SR9bd1yAhJoLAdDZYYaJN      payed by      t1MtNzHTt9KQpmyZbxUxvPUzwQBN6ia8j5D
  // t1YGKdVRetsqLuNbv9UVzQWUrvyxs9kGhUW      payed by      t1RaG48M6K238jsb1Qco4paiGLjvJDJKHUk
  // t1YGKdVRetsqLuNbv9UVzQWUrvyxs9kGhUW      payed by      t1RaG48M6K238jsb1Qco4paiGLjvJDJKHUk
  // t1KkKYqDXX14hj6bmFmGoMCqvNUNtG22imn      payed by      t1V6rbvzRpZEmshYZM6ESJ13sRxrx8F1Uj9 / t1QGaHBs6U583RfcBjMbeLPCiwk261Jw7Vb
  // t1V5JR2Xt1ULu9XsgFaJVwc9NG7MkRC7ex9      payed by      t1faLDqLjkj8qmU7Xsc5z9vKaG2bZ9u8bdD
  // t1RJGAcGJ3mNwUeUNAg6LZpywzAxZoFstCP      payed by      t1WGDCRVTi62Hf9LR9s6foK2Xak98XZ7Qan

  let address = "t1RJGAcGJ3mNwUeUNAg6LZpywzAxZoFstCP"
  await processJob(address)




})()


async function processJob (address) {


  // Get the unspent total amount
  let unspent = await blockchain.listunspent(address)
  let TotUnspent = 0
  for (value of unspent.result){
    TotUnspent += value.amount
  }


  // Continue if TotUnspent is > 0
  console.log('total unspent amund: '+TotUnspent)
  console.log('')
  if (TotUnspent>0) {

    // Get the transactions of the address
    console.log('Liste transactions...')
    console.log('')
    let transactions = await blockchain.listTransactions(address)

    let counterTMP=0
    transactions.result.forEach(function(value){
      counterTMP += 1
      console.log('Transaction ' +counterTMP + ' :')
      console.log(value)
      console.log('')
    })




    // Check the first transaction
    if (transactions.result[0] != undefined){


      console.log('Get TXID of the first transaction...')
      console.log('TXID : ' + transactions.result[0].txid)
      console.log('')



      // Get the first TXID and decode raw hex (to go back in block)
      let transaction = await blockchain.getRawTransaction(transactions.result[0].txid)
      console.log('Get details of the transaction :')
      console.log(transaction.result)
      console.log('')



      console.log('Decode RAW transaction (of hex string)...')
      console.log('')
      let decodeRaw = await blockchain.decodeRawTransaction(transaction.result)


      Object.keys(decodeRaw.result).forEach(function(key) {
        var val = decodeRaw.result[key];
        if (key !== 'vin' && key !== 'vout'){
          console.log(key + ' : ' + val )
        } else {

          val.forEach(function(value){
            console.log(key + ' :')
            console.log(value)
          })

        }
      })
      console.log('')


      console.log('Get TXID of the first vin transaction...')
      console.log('TXID : ' + decodeRaw.result.vin[0].txid)
      console.log('')


      console.log('Get RAW transaction (by vin TXID)...')
      console.log('')
      let RawTransactionVin = await blockchain.getRawTransaction(decodeRaw.result.vin[0].txid)


      console.log('RAW transaction result :')
      console.log(RawTransactionVin.result)
      console.log('')

      console.log('Decode RAW transaction (hex)...')
      console.log('')
      let decodeRawTransactionVin = await blockchain.decodeRawTransaction(RawTransactionVin.result)

      Object.keys(decodeRawTransactionVin.result).forEach(function(key) {
        var val = decodeRawTransactionVin.result[key];
        if (key !== 'vin' && key !== 'vout'){
          console.log(key + ' : ' + val )
        } else {

          val.forEach(function(value){
            console.log(key + ' :')
            console.log(value)
          })

        }
      })
      console.log('')


      console.log('Check if address in local DB ...')
      console.log('')
      let returnAddress = ""
      for (let value of decodeRawTransactionVin.result.vout) {

          let retAddressTmp = value.scriptPubKey.addresses[0]
          let gatewayByAddress = await storage.CheckIfAddressExist(retAddressTmp)
          let AddressInDB=gatewayByAddress.rows.length //-gatewayByAddress.offset

          // if not in DB, asign it to return address
          if (AddressInDB==0){
            returnAddress=retAddressTmp
            break
          }
      }


      console.log('Paid at address : ' + address)
      console.log('Amount to refund : ' + TotUnspent)
      console.log('Refound to : ' + returnAddress)
      console.log('')

      console.log('end script')




    } // end if/else transactions.result[0] == undefined


  } // end if/else unspent > 0




}
