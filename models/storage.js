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
* storage.js                                         Required by other processes
* ------------------------------------------------------------------------------
*
* This file define the storage call functions.
*
* ==============================================================================
*/

let request = require('request')
let config = require('../config')
let rp = require('request-promise')


exports.GetAccountByMail = function (eMail) {
  return rp.get({url: config.couchdb +
    '/_design/account/_view/get_account_by_mail?key="' + eMail + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetAccountByID = function (userID) {
  return rp.get({url: config.couchdb +
    '/_design/account/_view/get_account_by_id?key="' + userID + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.saveAccount = function (json) {
  return rp.put(config.couchdb + '/' + json._id, { 'json': json })
}








exports.GetGiveawayBySenderID = function (from_id) {
  return rp.get({url: config.couchdb +
    '/_design/giveaway/_view/get_giveaway_by_sender_id?key="' + from_id + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetGiveawayByRecieverID = function (from_id) {
  return rp.get({url: config.couchdb +
    '/_design/giveaway/_view/get_giveaway_by_reciever_id?key="' + from_id + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetGiveawayByID = function (giveaway_id) {
  return rp.get({url: config.couchdb +
    '/_design/giveaway/_view/get_giveaway_by_id?key="' + giveaway_id + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetGiftGiveawayQty = function () {
  return rp.get({url: config.couchdb +
    '/_design/giveaway/_view/get_giveaway_by_id?startkey="gift"&endkey="giftZ"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetGiveawayByState = function (state) {
  return rp.get({url: config.couchdb +
    '/_design/giveaway/_view/get_giveaway_by_state?key=' + state +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.saveGiveaway = function (json) {
  return rp.put(config.couchdb + '/' + json._id, { 'json': json })
}

exports.deleteGiveaway = function (json) {
  return rp.delete(config.couchdb+ '/' + json._id+'?rev='+json._rev)
}








exports.saveIP = function (json) {
  return rp.put(config.couchdb + '/' + json._id, { 'json': json })
}

exports.deleteIP = function (json) {
  return rp.delete(config.couchdb+ '/' + json._id+'?rev='+json._rev)
}

exports.GetIpByIp = function (ip) {
  return rp.get({url: config.couchdb +
    '/_design/ip/_view/get_ip_by_ip?key="' + ip  + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

exports.GetIpByDate = function (date) {
  return rp.get({url: config.couchdb +
    '/_design/ip/_view/get_ip_by_date?endkey=' + date  +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}















exports.saveDocumentPromise = function (body) {
  return new Promise(function (resolve, reject) {
    request.post(config.couchdb, { json: body },
      function (error, response, body) {
      if (error) {
        return reject(body)
      }
      return resolve(response.body)
    })
  })
}

// Get a document entry by id
exports.getDocumentPromise = function (_id) {
  return new Promise(function (resolve, reject) {
    request.get(config.couchdb + '/' + _id, function (error, response, body) {
      if (error) {return reject(error)}
      resolve(JSON.parse(body))
    })
  })
}
