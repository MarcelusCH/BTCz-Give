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
* signer.js                                          Required by other processes
* ------------------------------------------------------------------------------
*
*
*
* ==============================================================================
*/

let bitcore = require('bitcore-lib-btcz')
let bitcoinjs = require('bitcoinjs-lib')
var validUrl = require('valid-url');


exports.createTransaction = function (utxos, toAddress, amount, fixedFee, WIF, changeAddress) {
  amount = parseInt((amount * 100000000).toFixed(0))
  fixedFee = parseInt((fixedFee * 100000000).toFixed(0))

  let pk = new bitcore.PrivateKey.fromWIF(WIF) // eslint-disable-line new-cap
  let fromAddress = (pk.toPublicKey()).toAddress(bitcore.Networks.livenet)

  changeAddress = changeAddress || fromAddress

  let transaction = new bitcore.Transaction()

  for (const utxo of utxos) {
    transaction.from({
      'address': fromAddress,
      'txid': utxo.txid,
      'vout': utxo.vout,
      'scriptPubKey': utxo.scriptPubKey,
      'satoshis': parseInt((utxo.amount * 100000000).toFixed(0))

    })
  }

  transaction
    .to(toAddress, amount - fixedFee)
    .fee(fixedFee)
    .change(changeAddress)
    .sign(pk)

  return transaction.uncheckedSerialize()
}

exports.createSegwitTransaction = function (utxos, toAddress, amount, fixedFee, WIF, changeAddress, sequence) {
  changeAddress = changeAddress || exports.WIF2segwitAddress(WIF)
  if (sequence === undefined) {
    sequence = bitcoinjs.Transaction.DEFAULT_SEQUENCE
  }

  let feeInSatoshis = parseInt((fixedFee * 100000000).toFixed(0))
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF)
  let pubKey = keyPair.getPublicKeyBuffer()
  let pubKeyHash = bitcoinjs.crypto.hash160(pubKey)
  let redeemScript = bitcoinjs.script.witnessPubKeyHash.output.encode(pubKeyHash)

  let txb = new bitcoinjs.TransactionBuilder()
  let unspentAmount = 0
  for (const unspent of utxos) {
    if (unspent.confirmations < 2) { // using only confirmed outputs
      continue
    }
    txb.addInput(unspent.txid, unspent.vout, sequence)
    unspentAmount += parseInt(((unspent.amount) * 100000000).toFixed(0))
  }
  let amountToOutput = parseInt(((amount - fixedFee) * 100000000).toFixed(0))
  txb.addOutput(toAddress, amountToOutput)
  if (amountToOutput + feeInSatoshis < unspentAmount) {
    // sending less than we have, so the rest should go back
    txb.addOutput(changeAddress, unspentAmount - amountToOutput - feeInSatoshis)
  }

  for (let c = 0; c < utxos.length; c++) {
    txb.sign(c, keyPair, redeemScript, null, parseInt((utxos[c].amount * 100000000).toFixed(0)))
  }

  let tx = txb.build()
  return tx.toHex()
}

exports.createRBFSegwitTransaction = function (txhex, addressReplaceMap, feeDelta, WIF, utxodata) {
  if (feeDelta < 0) {
    throw Error('replace-by-fee requires increased fee, not decreased')
  }

  let tx = bitcoinjs.Transaction.fromHex(txhex)

  // looking for latest sequence number in inputs
  let highestSequence = 0
  for (let i of tx.ins) {
    if (i.sequence > highestSequence) {
      highestSequence = i.sequence
    }
  }

  // creating TX
  let txb = new bitcoinjs.TransactionBuilder()
  for (let unspent of tx.ins) {
    txb.addInput(unspent.hash.reverse().toString('hex'), unspent.index, highestSequence + 1)
  }

  for (let o of tx.outs) {
    let outAddress = bitcoinjs.address.fromOutputScript(o.script)
    if (addressReplaceMap[outAddress]) {
      // means this is DESTINATION address, not messing with it's amount
      // but replacing the address itseld
      txb.addOutput(addressReplaceMap[outAddress], o.value)
    } else {
      // CHANGE address, so we deduct increased fee from here
      let feeDeltaInSatoshi = parseInt((feeDelta * 100000000).toFixed(0))
      txb.addOutput(outAddress, o.value - feeDeltaInSatoshi)
    }
  }

  // signing
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF)
  let pubKey = keyPair.getPublicKeyBuffer()
  let pubKeyHash = bitcoinjs.crypto.hash160(pubKey)
  let redeemScript = bitcoinjs.script.witnessPubKeyHash.output.encode(pubKeyHash)
  for (let c = 0; c < tx.ins.length; c++) {
    let txid = tx.ins[c].hash.reverse().toString('hex')
    let index = tx.ins[c].index
    let amount = utxodata[txid][index]
    txb.sign(c, keyPair, redeemScript, null, amount)
  }

  let newTx = txb.build()
  return newTx.toHex()
}

exports.generateNewSegwitAddress = function () {

  var privateKey = new bitcore.PrivateKey()
  var address = privateKey.toAddress().toString()

  return {
    'address': address,
    // 'WIF': keyPair.toWIF()
    'WIF': privateKey.toWIF()
  }
}

exports.isAddressValid = function (address) {
  return bitcore.Address.isValid(address)
}

exports.isUrlValid = function (ThisURL) {
  if (validUrl.isUri(ThisURL)){
      return true
  } else {
      return false
  }
}

exports.URI = function (paymentInfo) {
  let uri = 'bitcoinz:'
  uri += paymentInfo.address
  uri += '?amount='
  uri += parseFloat((paymentInfo.amount / 100000000))
  uri += '&message='
  uri += encodeURIComponent(paymentInfo.message)
  if (paymentInfo.label) {
    uri += '&label='
    uri += encodeURIComponent(paymentInfo.label)
  }

  return uri
}

exports.WIF2segwitAddress = function (WIF) {
  let keyPair = bitcoinjs.ECPair.fromWIF(WIF)
  let pubKey = keyPair.getPublicKeyBuffer()
  let witnessScript = bitcoinjs.script.witnessPubKeyHash.output.encode(bitcoinjs.crypto.hash160(pubKey))
  let scriptPubKey = bitcoinjs.script.scriptHash.output.encode(bitcoinjs.crypto.hash160(witnessScript))
  return bitcoinjs.address.fromOutputScript(scriptPubKey)
}
