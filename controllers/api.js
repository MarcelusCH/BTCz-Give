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
* api.js                                                Required by btcz-give.js
* ------------------------------------------------------------------------------
*
* No API call for now...
*
* ==============================================================================
*/


let express = require('express')
let crypto = require('crypto')
let router = express.Router()
let config = require('../config')
let blockchain = require('../models/blockchain')
let storage = require('../models/storage')
let signer = require('../models/signer')
let logger = require('../utils/logger')
let rp = require('request-promise')




module.exports = router
