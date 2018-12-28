let express = require('express')
let router = express.Router()
let qr = require('qr-image')
let crypto = require('crypto')
let fs = require('fs')
let path = require('path');
let app = express();
let config = require('../config');
let nodemailer = require('nodemailer');
let logger = require('../utils/logger');
let rp = require('request-promise');
let storage = require('../models/storage')       // Load db call functions
let blockchain = require('../models/blockchain') // Load blockchain functions


;(async () => {

  await processJob()

})()




function GetAllAccount() {
  return rp.get({url: config.couchdb +
    '/_design/account/_view/get_account_by_mail?' +
    'inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}

function GetAccountByMail(eMail) {
  return rp.get({url: config.couchdb +
    '/_design/account/_view/get_account_by_mail?key="' + eMail.toLowerCase().trim() + '"' +
    '&inclusive_end=true&limit=10000&reduce=false&include_docs=true',
    json: true})
}


async function processJob () {

  // get user data
  let accounts = await GetAllAccount()
  console.log('Accounts count: '+accounts.rows.length)
  console.log(' ')

  // Loop all acount
  for(i=0; i<accounts.rows.length; i++){
    console.log('----------------------------------')
    console.log('Check account Nb : ' + (i+1))
    console.log('ID : ' + accounts.rows[i].doc._id)
    console.log('eMail : ' + accounts.rows[i].doc.signin_mail)
    console.log(' ')

    // Check if more than on eMail
    let eMail=accounts.rows[i].doc.signin_mail

    let accounts2 = await GetAccountByMail(eMail)
    console.log('Login count: '+accounts2.rows.length)
    console.log(' ')

    // If more than on Login
    if (accounts2.rows.length>1) {
      console.log('    ----------------------------------')
      console.log('    More than one login...')
      console.log(' ')

      // Keep the first data and erease the others
      console.log('    Keep ID : ' +accounts2.rows[0].doc._id)
      console.log(' ')
      let accountToKeep = accounts2.rows[0].doc._id
      for(j=0; j<accounts2.rows.length; j++){
        if (j==0){
          accountToKeep = accounts2.rows[j].doc._id
        } else {


          // Check dependenties Sender
          let giveaways = await storage.GetGiveawayBySenderID(accounts2.rows[j].doc._id)
          for(k=0; k<giveaways.rows.length; k++){
            let giveaway=giveaways.rows[k].doc

            console.log('        ----------------------------------')
            console.log('        Check giveaway...')

            // Change from fields from_id
            console.log('        from_id changed...')
            giveaway.from_id = accountToKeep
            await storage.saveGiveaway(giveaway)


            console.log('        ----------------------------------')
          }


          // Check dependenties Reciever
          giveaways = await storage.GetGiveawayByRecieverID(accounts2.rows[j].doc._id)
          for(k=0; k<giveaways.rows.length; k++){
            let giveaway=giveaways.rows[k].doc

            console.log('        ----------------------------------')
            console.log('        Check reciever...')

            // Change from fields from_id
            console.log('        to_id changed...')
            giveaway.to_id = accountToKeep
            await storage.saveGiveaway(giveaway)


            console.log('        ----------------------------------')
          }

          console.log(' ')
          console.log('    Delete ID : ' +accounts2.rows[j].doc._id)
          await storage.deleteGiveaway(accounts2.rows[j].doc)
          console.log(' ')


        }


      }
      console.log('    ----------------------------------')
    }
    console.log('----------------------------------')
  }






}
