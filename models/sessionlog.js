/**
* ==============================================================================
* BTCz-Give
* ==============================================================================
*
* Version 0.1.1 (beta)
*
* BitcoinZ giveaway tool
* https://github.com/MarcelusCH/BTCz-Give
*
* ------------------------------------------------------------------------------
* session.js                                         Required by other processes
* ------------------------------------------------------------------------------
*
* This file define the session control functions.
*
* ==============================================================================
*/


let config = require('../config')



exports.IsSessionActive = function (request) {
  let DateNow = Date.now();
  if(request.session.activity+(config.session_time*60*1000)>DateNow){
    return true
  } else {
    return false
  }
}
