/**
* ==============================================================================
* BTCz-Give
* ==============================================================================
*
* Version 0.1.2 (beta)
*
* BitcoinZ giveaway tool
* https://github.com/MarcelusCH/BTCz-Give
*
* ------------------------------------------------------------------------------
* website.js                                            Required by btcz-give.js
* ------------------------------------------------------------------------------
*
* Handles the website pages requests
* I.e. the requests for signin pages,
* the FAQ page, the index page or the qr code generating page.
* And all dashboard functions...
*
* ==============================================================================
*/


let express = require('express')
let session = require('express-session');
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
let storage = require('../models/storage')
let signer = require('../models/signer')
let blockchain = require('../models/blockchain')
let sessionlog = require('../models/sessionlog')

// define the login button
let UserBTNstr ='<li class="quote_btn" >'
UserBTNstr += '<a style="border-radius:20px; padding-left:8px;padding-right:8px" href="/dashboard" title="My Dashboard">'
UserBTNstr += '<img src="images/userICO.png" /></a></li>'


// Route for QR generating
router.get('/generate_qr/:text', function (req, res) {
  let filename
  let qrSvg
  filename = 'qr/' + crypto.createHash('sha1').update(decodeURIComponent(decodeURIComponent(req.params.text))).digest('hex') + '.png'
  qrSvg = qr.image(decodeURIComponent(decodeURIComponent(req.params.text)), { type: 'png' })
  qrSvg.pipe(fs.createWriteStream(filename))
  qrSvg.on('end', function () {
    res.redirect(301, '/' + filename)
    res.end()
  })
  qrSvg.on('error', function () {
    res.send('QR file error')
    res.end()
  })
})

// Route for the index main page
router.get('/', function (req, res) {
  (async function () {

    // Check if logged in, set user btn
    let userBTN =""
    if (sessionlog.IsSessionActive(req)) {userBTN=UserBTNstr}

    // Get the gift account stats (unspent total amount)
    let unspent = await blockchain.listunspent(config.tmp_address)
    let TotUnspent = 0
    for (value of unspent.result){
      TotUnspent += value.amount
    }

    // Get already gifted qty
    let GiftedGiveawayQty = await storage.GetGiftGiveawayQty()
    GiftedGiveawayQty=GiftedGiveawayQty.rows.length

    // Calculate the total of gift possible and available
    let GiftAvailable = Math.round(TotUnspent/config.gift_value)
    let TotGifts = GiftedGiveawayQty+GiftAvailable

    // Count stats for giveaway total
    let notTakenGiveaway = await storage.GetGiveawayByState(1)
    notTakenGiveaway=notTakenGiveaway.rows.length
    let expiredGiveaway = await storage.GetGiveawayByState(2)
    expiredGiveaway=expiredGiveaway.rows.length
    let acceptedGiveaway = await storage.GetGiveawayByState(3)
    acceptedGiveaway=acceptedGiveaway.rows.length
    let returnedGiveaway = await storage.GetGiveawayByState(4)
    returnedGiveaway=returnedGiveaway.rows.length

    // Render page
    return res.render(path.join(__dirname + '/../docs/index.html'), {
        GoogleAnalytics: config.GoogleAnalytics,
        userBTN: userBTN,
        TotGifts: TotGifts,
        GiftedGiveawayQty: GiftedGiveawayQty,
        GiftAvailable: GiftAvailable,
        GiftAddress: config.tmp_address,
        GiftValue: config.gift_value,
        totGiveaway: (notTakenGiveaway+expiredGiveaway+acceptedGiveaway+returnedGiveaway),
        expiredGiveaway: expiredGiveaway,
        acceptedGiveaway : acceptedGiveaway,
        returnedGiveaway : returnedGiveaway
    });

  })().catch((error) => {
    logger.error('/', [ req.id, error.message, error.stack ])
    res.status(500).send('500')
  }) // end async function
})

// Redirect signin to index (if land here from elsewhere without post)
router.get('/signin', function (req, res) {
  return res.redirect('/')
})

// Route for the FAQ page
router.get('/faq', function (req, res) {

  let userBTN =""
  if (sessionlog.IsSessionActive(req)) {userBTN=UserBTNstr}

  return res.render(path.join(__dirname + '/../docs/faq.html'),
    { GoogleAnalytics: config.GoogleAnalytics,
       RefreshRate: config.marketrate_refresh,
       SpeedSweepAmount: config.speedSweep_max,
       fee_tx: config.fee_tx,
       speed_sweep_fee: config.speed_sweep_fee,
       confirmation_before_forward: config.confirmation_before_forward,
       GatewayLimit: config.max_gateway_client,
       userBTN: userBTN
   });
})

// Route for the contactpage
router.get('/contact', function (req, res) {

  let userBTN =""
  if (sessionlog.IsSessionActive(req)) {userBTN=UserBTNstr}

  return res.render(path.join(__dirname + '/../docs/contact.html'),
    { GoogleAnalytics: config.GoogleAnalytics,
      userBTN: userBTN
  });
})



// -----------------------------------------------------------------------------
// GET route for dashboard (if logged)
// -----------------------------------------------------------------------------
router.get('/dashboard', function (req, res) {

  let DateNow = Date.now();

  // Execute...
  (async function () {

    // Get user informations
    let eMail = req.session.email
    let address = req.session.address
    let userName = req.session.username
    let description = req.session.description
    if (address=="NA"){address=""}
    if (userName=="NA"){userName=""}
    if (description=="NA"){description=""}
    let UserInfo = [eMail, address, userName, description]

    if (sessionlog.IsSessionActive(req)) {

      // Get storage data for the logged user
      let account = await storage.GetAccountByMail(eMail)
      if (account.rows.length!=1) {
        logger.log('/dashboard', [req.id, 'Storage error : ' + eMail])
        return res.redirect('/?msg=1')
      }

      // Set user settings
      account=account.rows[0].doc
      let autoSweep = account.auto_sweep
      let noMailing = account.no_mail
      let UserSetting = [autoSweep, noMailing]

      // Set date and render dashboard
      req.session.activity=DateNow
      return res.render(path.join(__dirname + '/../docs/dashboard.html'), {
        GoogleAnalytics: config.GoogleAnalytics,
        userBTN: UserBTNstr,
        userInfo: UserInfo,
        userSetting: UserSetting,
        open_welcome: account.open_welcome,
        recieved_welcome_gift: account.recieved_welcome_gift,
        GiftAddress: config.tmp_address,
      });

    } else { // session expired
      req.session.destroy();
      return res.redirect('/?msg=6')
    }

  })().catch((error) => {
    logger.error('/dashboard', [ req.id, error.message, error.stack ])
    res.status(500).send('500')
  }) // end async function
}); // -------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// POST & GET logout                                                      Logout
// -----------------------------------------------------------------------------
router.post('/logout', function (req, res) {
  req.session.destroy();
  return res.redirect('/')
});
router.get('/logout', function (req, res) {
  req.session.destroy();
  return res.redirect('/')
});  // -------------------------------------------------------------------------





// -----------------------------------------------------------------------------
// POST route from dashboard setting                             Update settings
// -----------------------------------------------------------------------------
router.post('/dashboard/setting', function (req, res) {

  let DateNow = Date.now();

  // Execute...
  (async function () {

    if (sessionlog.IsSessionActive(req)) {

      let eMail = req.session.email
      let autoSweep = +req.body.setting_sweep
      let noMailing = +req.body.setting_mail


      // Check user data in storage
      let account = await storage.GetAccountByMail(eMail)
      if (account.rows.length==1) {

        // Save setting
        account=account.rows[0].doc
        account.auto_sweep=autoSweep
        account.no_mail=noMailing
        let resp = await storage.saveAccount(account)
        if (resp.error) {
          logger.error('/dashboard/setting', [req.id, 'Storage fail', resp.error, account])
          res.status(500).send('Unexpected error')
        }

        // Return success message
        req.session.activity=DateNow
        return res.send(JSON.stringify('The settings have been successfully updated.'))

      } else {
        logger.log('/dashboard/setting', [req.id, 'Storage error: ' + eMail])
        res.status(500).send('Unexpected error')
      } // end if/else account.rows.length==1

    } else { // session expired
      req.session.destroy();
      res.status(403).send('403')
    }

  })().catch((error) => {
    logger.error('/dashboard/setting', [ req.id, error.message, error.stack ])
    res.status(500).send('Unexpected error')
  }) // end async function
}); // -------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// POST route from dashboard profile                              Update profile
// -----------------------------------------------------------------------------
router.post('/dashboard/profile', function (req, res) {

  let DateNow = Date.now();

  // Execute...
  (async function () {

    if (sessionlog.IsSessionActive(req)) {

      let eMail = req.session.email
      let address = req.body.profile_address
      let userName = req.body.profile_userName
      let userAbout = req.body.profile_message

      if (userName.replace(/ /g, "")==""){userName="NA"}
      if (userAbout.replace(/ /g, "")==""){userAbout="NA"}

      // Check if address is valid
      if (!(signer.isAddressValid(address))){
        return res.send(JSON.stringify('Error: The BTCz address is not valide.'))
      }

      // Check user data in storage
      let account = await storage.GetAccountByMail(eMail)
      if (account.rows.length==1) {

        // Save account
        account=account.rows[0].doc
        account.user_address=address
        account.user_description=userAbout
        account.user_name=userName
        let resp = await storage.saveAccount(account)
        if (resp.error) {
          logger.error('/dashboard/profile', [req.id, 'Storage fail', resp.error, account])
          res.status(500).send('Unexpected error')
        }

        // Return success message
        req.session.activity=DateNow
        req.session.address=address
        req.session.username=userName
        req.session.description=userAbout
        return res.send(JSON.stringify('The profile has been successfully updated.'))

      } else {
        logger.log('/dashboard/profile', [req.id, 'Storage error : ' + eMail])
        res.status(500).send('Unexpected error')
      } // end if/else account.rows.length==1

    } else { // session expired
      req.session.destroy();
      res.status(403).send('403')
    }

  })().catch((error) => {
    logger.error('/dashboard/profile', [ req.id, error.message, error.stack ])
    res.status(500).send('Unexpected error')
  }) // end async function
}); // -------------------------------------------------------------------------








// -----------------------------------------------------------------------------
// POST route from index signin form                               SignIn step 1
// -----------------------------------------------------------------------------
router.post('/signin', function (req, res) {

  let eMailBody = req.body.form1_email.toLowerCase().trim()
  let mailTXT = ""
  let mailHTML = ""
  let dateNow = Date.now()
  let clientIp =  (req.headers['x-forwarded-for'] || '' ).replace(' ','').split(',')

  // Generate the signin code & token
  let signinToken = crypto.randomBytes(64).toString('hex')
  let signinCode = ""
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let numPos = "6789"
  for (var i = 0; i < numPos.charAt(Math.floor(Math.random()*4)); i++) {
    signinCode += possible.charAt(Math.floor(Math.random()*possible.length))
  }

  // Execute...
  (async function () {

    // Log and set eMail txt
    req.session.destroy();
    logger.log('/signin', [req.id, 'Signin attemp...', 'IP: '+clientIp])
    mailHTML+='<span>Here is your signin code for BTCz Giveaway: </span><span><b>'+signinCode+'</b></span><br><br>'
    mailHTML+='<span>The BTCz Giveaway Team - https://give.btcz.app</span>'
    mailTXT+='Here is your signin code for BTCz Giveaway: '+signinCode+' \n\xA0 \n\xA0'
    mailTXT+='The BTCz Giveaway Team - https://give.btcz.app'

    // Store IP's
    for (var i=0; i < clientIp.length; i++){
      if (clientIp[i]!=""){
        let ipData = {
          '_id': 'ip'+i+'-'+(req.id).slice(0,30),
          'doctype': 'ip',
          'timestamp': dateNow,
          'ip': clientIp[i]
        }
        await storage.saveIP(ipData)
      }
    }

    // Check if eMail already exist
    let accountFirstLogin = false
    let account = await storage.GetAccountByMail(eMailBody)
    let accountData
    if (account.rows.length==0) { // new user

      accountFirstLogin = true
      logger.log('/signin', [req.id, 'Create new user: '+eMailBody ])

      // Set Account data
      accountData = {
        '_id': req.id,
        'first_login' : 0,
        'invited_by': 'NA',
        'open_welcome': 1,
        'recieved_welcome_gift': 0,
        'doctype': 'account',
        'timestamp': dateNow,
        'signin_mail': eMailBody,
        'signin_code': signinCode,
        'signin_date': dateNow,
        'signin_token': signinToken,
        'user_name': 'NA',
        'user_description': 'NA',
        'user_address': 'NA',
        'auto_sweep': 0,
        'no_mail': 0
      }

      // Set eMail text
      mailHTML='<span>Welcome,</span><br><br>'+mailHTML
      mailTXT='Welcome, \n\xA0 \n\xA0'+mailTXT

    } else { // existing user
      account=account.rows[0].doc

      // Check if invited by new giveaway creation
      if (account.first_login==1) {accountFirstLogin = true}

      // Set Account data
      accountData = {
        '_id': account._id,
        '_rev': account._rev,
        'first_login' : 0,
        'invited_by': account.invited_by,
        'open_welcome': account.open_welcome,
        'recieved_welcome_gift': 0,
        'doctype': 'account',
        'timestamp': account.timestamp,
        'signin_mail': account.signin_mail,
        'signin_code': signinCode,
        'signin_date': dateNow,
        'signin_token': signinToken,
        'user_name': account.user_name,
        'user_description': account.user_description,
        'user_address': account.user_address,
        'auto_sweep': account.auto_sweep,
        'no_mail': account.no_mail
      }

      // Set eMail text
      mailHTML='<span>Welcome back,</span><br><br>'+mailHTML
      mailTXT='Welcome back, \n\xA0 \n\xA0'+mailTXT

    }

    // Check if IP was used more than n time
    let GiveGift = true
    let IpToMuchUsed = false
    if (clientIp.length==1 && clientIp[0]=="") {GiveGift=false}
    for (var i=0; i < clientIp.length; i++){
      if (clientIp[i]!=""){
        let ip = await storage.GetIpByIp(clientIp[i])
        if (ip.rows.length>config.give_gift_same_ip) {
          GiveGift=false
          IpToMuchUsed=true
        }
      }
    }

    // Get the unspent total amount in the gift address
    let unspent = await blockchain.listunspent(config.tmp_address)
    let TotUnspent = 0
    for (value of unspent.result){
      TotUnspent += value.amount
    }

    // Spend Gift...
    // -------------------------------------------------------------------------
    // If gift amount is suffisant and GiveGift true and accountFirstLogin true.
    if (TotUnspent>=(config.gift_value+config.fee_tx) && GiveGift && accountFirstLogin) {
      logger.log('/signin', [req.id, 'Spend gift to user: '+eMailBody ])

      // Set param to 1 if gift received
      accountData.recieved_welcome_gift = 1

      // Set expire date
      let d = new Date();
      d.setDate(d.getDate()+config.gift_valid)
      let day = d.getDate()
      let month = d.getMonth()+1
      let year =d.getFullYear()
      let dateString=year+'-'+month+'-'+day

      // Generate giveaway address and set DB fields infos
      let giveawayAddress = signer.generateNewSegwitAddress()
      let giveawayData = {
        '_id': 'gift-'+(req.id).slice(0,30),
        'timestamp': dateNow,
        'WIF': giveawayAddress.WIF,
        'address': giveawayAddress.address,
        'doctype': 'giveaway',
        'state': 1,
        'from_id':'BTCz-Give-Base-Account',
        'to_id':accountData._id,
        'give_sender_mail':0,
        'give_sender_name':1,
        'expire':dateString,
        'message':"Thanks for registering your account and using BTCz."
      }

      // Save giveaway and import address
      await storage.saveGiveaway(giveawayData)
      await blockchain.importaddress(giveawayAddress.address)

      // Send amount of gift
      let createTx = signer.createTransaction
      let tx = createTx(unspent.result, giveawayAddress.address, (config.gift_value+config.fee_tx+config.fee_tx), config.fee_tx, config.tmp_address_WIF)
      let broadcastResult = await blockchain.broadcastTransaction(tx)
      logger.log('/signin', [req.id, 'Giveaway gift created : '+'gift-'+(req.id).slice(0,30), broadcastResult ])

    // If to much time used this IP
    } else if (TotUnspent>=(config.gift_value+config.fee_tx) && IpToMuchUsed && accountFirstLogin) {
      logger.log('/signin', [req.id, 'Ip to much used for a gift: '+clientIp , 'new user : '+eMailBody ])
    }

    // Save user to DB
    let resp = await storage.saveAccount(accountData)
    if (resp.error) {
      logger.error('/signin', [req.id, 'Storage fail', resp.error, accountData])
      return res.redirect('/?msg=0')
    }

    // Send login code
    let smtpTrans = nodemailer.createTransport(config.smtp);
    let mailOpts = {
      from: config.smtp.auth.user,
      to: eMailBody,
      subject: 'BTCz Giveaway - Signin code',
      text: mailTXT,
      html: mailHTML
    }
    smtpTrans.sendMail(mailOpts, function (error, response) {
      if (error) {
        logger.error('/signin', [req.id, 'signin code not sent', mailOpts, error.message, error.stack ])
        return res.redirect('/?msg=0')
      } else {

        // Redirect to signin code validation page
        logger.log('/signin', [req.id, 'signin code sent' ])
        return res.render(path.join(__dirname + '/../docs/signin.html'), {
          GoogleAnalytics: config.GoogleAnalytics,
          signin_mail: eMailBody,
          signin_token: signinToken
        });
      } // end if/else error sendMail
    });

  })().catch((error) => {
    logger.error('/signin', [ req.id, error.message, error.stack ])
    res.status(500).send('500')
  }) // end async function
}); // -------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// POST route from signin page form                                SignIn step 2
// -----------------------------------------------------------------------------
router.post('/dashboard', function (req, res) {

  let eMailBody = req.body.form2_mail
  let signinToken = req.body.form2_token
  let signinCode = req.body.form2_code
  let dateNow = Date.now();

  // Execute...
  (async function () {

    // Check user data in storage
    let account = await storage.GetAccountByMail(eMailBody)
    if (account.rows.length==0) {

      // User not exist, redirect to index
      logger.log('/dashboard', [req.id, 'Signin fail, user not exist.'])
      return res.redirect('/?msg=1')

    } else {

      // Check if auth code and token are correct. Check time also.
      account=account.rows[0].doc
      if (account.signin_code == signinCode && account.signin_token == signinToken && account.signin_mail.toLowerCase() == eMailBody) {

        // Code expired, redirect to index
        if ((account.signin_date + (30*60*1000)) < dateNow) {
          logger.log('/dashboard', [req.id, 'Signin fail, sign in code expired.'])
          return res.redirect('/?msg=2')
        }

        // Signin ok. Save new date/time.
        account.signin_date=dateNow
        let resp = await storage.saveAccount(account)
        if (resp.error) {
          logger.error('/signin', [req.id, 'Storage fail', resp.error, account])
          return res.redirect('/?msg=0')
        }

        // Save session and redirect to dashboard
        req.session.email=account.signin_mail.toLowerCase().trim()
        req.session.address=account.user_address
        req.session.username=account.user_name
        req.session.description=account.user_description
        req.session.token=signinToken
        req.session.activity=dateNow
        logger.log('/dashboard', [req.id, 'Signin success.', eMailBody])
        return res.redirect('/dashboard')

      } else {

        // Nothing correct redirect to index
        logger.log('/dashboard', [req.id, 'Signin fail, signin code not correct.'])
        return res.redirect('/?msg=3')

      } // End if accout.signin_code...
    } // account.rows.length==0

  })().catch((error) => {
    logger.error('/signin', [ req.id, error.message, error.stack ])
    res.status(500).send('500')
  }) // end async function
}); // -------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// POST route close welcome inf and not see it again
// -----------------------------------------------------------------------------
router.post('/dashboard/killwelcomeinfo', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.body.eMail.toLowerCase()
  let giveawayID = req.body._id

  // Check if logged is session eMail
  if (req.session.email!=userEmail) {
    req.session.destroy();
    return res.status(403).send('Session error')
  }

  // Check if session expired
  if ((req.session.activity+(config.session_time*60*1000))<dateNow) {
    req.session.destroy();
    return res.status(403).send('Session expired')
  }

  // Execute...
  (async function () {

    // Check user data in storage
    let account = await storage.GetAccountByMail(userEmail)


    account=account.rows[0].doc
    account.open_welcome=0
    await storage.saveAccount(account)



  })().catch((error) => {
    logger.error('/signin', [ req.id, error.message, error.stack ])
    res.status(500).send('500')
  }) // end async function
}); // -------------------------------------------------------------------------





// -----------------------------------------------------------------------------
// POST route from contact form                                       Contact US
// -----------------------------------------------------------------------------
router.post('/contact', function (req, res) {


  let mailOpts, smtpTrans;
  smtpTrans = nodemailer.createTransport(config.smtp);
  mailOpts = {
    from: config.smtp.auth.user,
    to: config.smtp.auth.user,
    subject: 'New message from contact form at give.btcz.app',
    text: `${req.body.name} (${req.body.email}) says: ${req.body.message}`
  };
  smtpTrans.sendMail(mailOpts, function (error, response) {
    if (error) {
      logger.error('/contact', ['eMail not sent', mailOpts, error.message, error.stack ])
      return res.redirect('/contact?msg=0')
    }
    else {
      logger.log('/contact', ['eMail sent', mailOpts ])
      return res.redirect('/contact?msg=1')
    }
  });

}); // -------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// POST route from dashboard Create new Giveaway                    New Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/newgiveaway', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.body.new_giveaway_mail.toLowerCase()

  // Check if logged is session eMail
  if (req.session.email!=userEmail) {
    req.session.destroy();
    return res.status(403).send('Session error')
  }

  // Check if session expired
  if ((req.session.activity+(config.session_time*60*1000))<dateNow) {
    req.session.destroy();
    return res.status(403).send('Session expired')
  }

  // Execute...
  (async function () {

    // get user data
    let account = await storage.GetAccountByMail(userEmail)
    if (account.rows.length==0) {
      logger.error('/dashboard/newgiveaway', [req.id, 'Storage fail, user not fund :'+userEmail])
      return res.status(500).send('Unexpected error')
    }
    account=account.rows[0].doc

    // Generate giveaway address and set DB fields infos
    let giveawayAddress = signer.generateNewSegwitAddress()
    let giveawayData = {
      '_id': req.id,
      'timestamp': dateNow,
      'WIF': giveawayAddress.WIF,
      'address': giveawayAddress.address,
      'doctype': 'giveaway',
      'state': 0
    }

    // Save giveaway infos & import address in local BC node
    let resp = await storage.saveGiveaway(giveawayData)
    if (resp.error) {
      logger.error('/dashboard/newgiveaway', [req.id, 'Storage fail', resp.error, giveawayData])
      return res.status(500).send('Unexpected error')
    }
    await blockchain.importaddress(giveawayAddress.address)

    // Set return answer
    let answer = {
      'giveaway_id': req.id,
      'address': giveawayData.address
    }

    // Log and return data
    req.session.activity=dateNow
    logger.log('/dashboard/newgiveaway', [ req.id, 'Returned new giveaway data for user: '+userEmail])
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/newgiveaway', [ req.id, error.message, error.stack ])
    return res.status(500).send('Unexpected error')
  }) // end async function
}); // -------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// POST route from dashboard update New Giveaway                 Update Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/updatenewgiveaway', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.session.email
  let giveawayID = req.body.new_giveaway_id_hidden.toLowerCase()

  // if session expired
  if ((req.session.activity+(30*60*1000))<dateNow) {
    req.session.destroy();
    return res.redirect('/?msg=6')
  }

  // Execute...
  (async function () {

    // get giveaway data
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData=giveawayData.rows[0].doc

    // Get amount recieved
    let recievedAmount = await blockchain.getReceivedByAddress(giveawayData.address)

    let answer = {
      'confirmed': recievedAmount[1].result,
      'unconfirmed': recievedAmount[0].result,
      'address': giveawayData.address
    }

    // return data
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/updatenewgiveaway', [ req.id, error.message, error.stack ])
    return res.redirect('/?msg=0')
  }) // end async function
}); // -------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// POST route from dashboard confirming new Giveaway               Save Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/confirmegiveaway', function (req, res) {

  let dateNow = Date.now();
  let senderEmail = req.body.new_giveaway_sender_mail_hidden.toLowerCase().trim()
  let giveawayID = req.body.new_giveaway_id_hidden
  let sendToMail = req.body.new_giveaway_sendto.toLowerCase().trim()
  let giveMail = req.body.new_giveaway_givemail
  let giveName = req.body.new_giveaway_givename
  let dateExpire = req.body.new_giveaway_expire
  let message = req.body.new_giveaway_message

  // Check if logged eMail
  if (req.session.email!=senderEmail) {
    logger.error('/dashboard/confirmegiveaway', [req.id, 'eMail is not logged.'])
    return res.redirect('/?msg=0')
  }

  // if session expired
  if ((req.session.activity+(30*60*1000))<dateNow) {
    req.session.destroy();
    return res.redirect('/?msg=6')
  }

  // Execute...
  (async function () {

    // get user data
    let account = await storage.GetAccountByMail(senderEmail)
    if (account.rows.length==0) {
      logger.error('/dashboard/confirmegiveaway', [req.id, 'Storage fail, user not fund', userEmail])
      return res.redirect('/?msg=0')
    }
    account=account.rows[0].doc

    // Check if reciever already existi
    let newAccount = await storage.GetAccountByMail(sendToMail)
    if (newAccount.rows.length==0) {

      // Create new user in DB for reciever
      newAccount = {
        '_id': req.id,
        'first_login' : 1,
        'invited_by': account._id,
        'open_welcome': 1,
        'doctype': 'account',
        'timestamp': dateNow,
        'signin_mail': sendToMail,
        'user_name': 'NA',
        'user_description': 'NA',
        'user_address': 'NA',
        'auto_sweep': 0,
        'no_mail': 0
      }

      // Save new accout to DB
      let respAccount = await storage.saveAccount(newAccount)
      if (respAccount.error) {
        logger.error('/dashboard/confirmegiveaway', [req.id, 'Storage fail', respAccount.error, newAccount])
        return res.redirect('/?msg=0')
      }

    } else {
      newAccount=newAccount.rows[0].doc
    }

    // get giveaway data
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData = giveawayData.rows[0].doc

    // update giveaway data
    giveawayData.state=1
    giveawayData.from_id=account._id
    giveawayData.to_id=newAccount._id
    giveawayData.give_sender_mail=giveMail
    giveawayData.give_sender_name=giveName
    giveawayData.expire=dateExpire
    giveawayData.message=message

    // Save giveaway infos
    let respGiveaway = await storage.saveGiveaway(giveawayData)
    if (respGiveaway.error) {
      logger.error('/dashboard/confirmegiveaway', [req.id, 'Storage fail', respGiveaway.error, giveawayData])
      return res.redirect('/?msg=0')
    }

    // Create reciever text mail Body
    let mailTXT ="Hello dear friend, \n\xA0 \n\xA0"
    if (giveName==1 && account.user_name!='NA') { mailTXT += account.user_name+" "}
    if (giveMail==1) { mailTXT += "("+account.signin_mail+") "}
    if ((giveName==0 || account.user_name=='NA') && giveMail==0) {mailTXT += "Someone "}
    mailTXT +="gifted you some BitcoinZ to try this amazing technology. \n\xA0"
    mailTXT +="This gift is valid until "+dateExpire.toString("d")+", "
    mailTXT +="so please enjoy it before by registering on https://give.btcz.app \n\xA0 \n\xA0"
    if (message!='') {
      mailTXT += "He left you a message: \n\xA0"
      mailTXT += message+" \n\xA0 \n\xA0"
    }
    mailTXT +="The BTCz giveaway team wishes you a good day!"

    // Create reciever html mail Body
    let mailHTML ="<span>Hello dear friend, </span><br><br><span>"
    if (giveName==1 && account.user_name!='NA') { mailHTML += account.user_name+" "}
    if (giveMail==1) { mailHTML += "("+account.signin_mail+") "}
    if ((giveName==0 || account.user_name=='NA') && giveMail==0) {mailHTML += "Someone "}
    mailHTML +="gifted you some BitcoinZ to try this amazing technology. </span><br>"
    mailHTML +="<span>This gift is valid until "+dateExpire.toString("d")+", "
    mailHTML +="so please enjoy it before by registering on https://give.btcz.app </span><br><br>"
    if (message!='') {
      mailHTML += "<span>He left you a message: </span><br><span>"
      mailHTML += message+" </span><br><br>"
    }
    mailHTML +="The BTCz giveaway team wishes you a good day!"

    // Send eMail to reciever
    let smtpTrans = nodemailer.createTransport(config.smtp);
    let mailOpts = {
      from: config.smtp.auth.user,
      to: sendToMail,
      subject: 'BTCz Giveaway - You recieved a gift',
      text: mailTXT,
      html: mailHTML
    }

    // Send mail only to new user and if existing one not checked option
    if (newAccount.no_mail==0) {
      smtpTrans.sendMail(mailOpts, function (error, response) {
        if (error) {
          logger.error('/dashboard/confirmegiveaway', [req.id, 'eMail not sent', mailOpts, error.message, error.stack ])
        }
      }); // end smtpTrans
    }

    // Log and return answer
    let answer = "Giveaway sent to "+sendToMail+" successfully."
    req.session.activity=dateNow
    logger.log('/dashboard/confirmegiveaway', [ req.id, 'Giveaway created and sent.', giveawayData])
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/confirmegiveaway', [ req.id, error.message, error.stack ])
    return res.redirect('/?msg=0')
  }) // end async function
}); // -------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// POST route from dashboard Delete Giveaway                        DEL Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/delgiveaway', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.session.email.toLowerCase()
  let giveawayID = req.body.new_giveaway_id_hidden

  // if session expired
  if ((req.session.activity+(30*60*1000))<dateNow) {
    req.session.destroy();
    return res.redirect('/?msg=6')
  }

  // Execute...
  (async function () {

    // get giveaway data
    let answer="Giveaway successfully removed."
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData=giveawayData.rows[0].doc

    // Check if amount already loaded, if not, delete giveaway
    let recievedAmount = await blockchain.getReceivedByAddress(giveawayData.address)
    if (recievedAmount[0].result<=0) {

      // Delete giveaway
      let resp = await storage.deleteGiveaway(giveawayData)
      if (resp.error) {
        logger.error('/dashboard/delgiveaway', [ req.id, resp.error, resp, giveawayData ])
        answer="Error: Giveaway was not removed."
      }
    } else {
      answer+="</br>Thanks for donation."
    }

    // Log and return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/delgiveaway', [ req.id, error.message, error.stack ])
    return res.redirect('/?msg=0')
  })
}); // -------------------------------------------------------------------------





// -----------------------------------------------------------------------------
// POST route from dashboard update Giveaway list           Update Giveaway list
// -----------------------------------------------------------------------------
router.post('/dashboard/updategiveawaylist', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.session.email.toLowerCase()

  // if session expired
  if ((req.session.activity+(30*60*1000))<dateNow) {
    req.session.destroy();
    return res.redirect('/?msg=6')
  }

  // Execute...
  (async function () {

    // get user data
    let account = await storage.GetAccountByMail(userEmail)
    if (account.rows.length==0) {
      logger.error('/dashboard/updategiveaway', [req.id, 'Storage fail, user not fund', userEmail])
      return res.redirect('/?msg=0')
    }
    let userID=account.rows[0].doc._id


    // Set table header info
    let sTable='<table><tr><th>Sent Giveaway ID</th><th>Amount</th><th>Receipt address</th>'
	  sTable+='<th>Receipt eMail / phone</th><th>Expire</th><th></th></tr>'



    // Retrieve the giveaways given by this user
    let giveaways = await storage.GetGiveawayBySenderID(userID)
    for(i=0; i<giveaways.rows.length; i++){
      let giveaway=giveaways.rows[i].doc

      // Set variable from db
      let giveID = giveaway._id
      let giveAddress = giveaway.address
      let giveToID = giveaway.to_id
      let giveExpire = giveaway.expire
      let giveState = giveaway.state
      let giveAmount = await blockchain.getReceivedByAddress(giveAddress)

      // Get the reciever eMail
      let giveToMail ="undefined"
      let reciever = await storage.GetAccountByID(giveToID)
      if (reciever.rows.length!=0) {
        giveToMail=reciever.rows[0].doc.signin_mail
      }

      // Set table row
      sTable+='<tr>'
      sTable+='<td><a class="td_giveaway">'+giveID+'</a></td>'
      sTable+='<td>'+giveAmount[0].result+'</td>'
      sTable+='<td>'+giveAddress+'</td>'
      sTable+='<td>'+giveToMail+'</td>'
      sTable+='<td>'+giveExpire+'</td>'
      sTable+='<td>'+giveState+'</td>'
      sTable+='</tr>'


    }



    // Set return answer
    sTable+='</table>'
    let answer = {
      'html': sTable,
      'count': giveaways.rows.length
    }

    // Log and return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/updategiveaway', [ req.id, error.message, error.stack ])
    return res.redirect('/?msg=0')
  }) // end async function
}); // -------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// POST route from dashboard update Received list           Update Received list
// -----------------------------------------------------------------------------
router.post('/dashboard/updaterecievedlist', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.session.email.toLowerCase()

  // if session expired
  if ((req.session.activity+(30*60*1000))<dateNow) {
    req.session.destroy();
    return res.redirect('/?msg=6')
  }

  // Execute...
  (async function () {

    // get user data
    let account = await storage.GetAccountByMail(userEmail)
    if (account.rows.length==0) {
      logger.error('/dashboard/updaterecievedlist', [req.id, 'Storage fail, user not fund', userEmail])
      return res.redirect('/?msg=0')
    }
    let userID=account.rows[0].doc._id


    // Set table header info
    let sTable='<table><tr><th>Received Giveaway ID</th><th>Amount</th><th>Receipt address</th>'
	  sTable+='<th>Sender eMail / phone</th><th>Expire</th><th></th></tr>'



    // Retrieve the giveaways given by this user
    let giveaways = await storage.GetGiveawayByRecieverID(userID)
    for(i=0; i<giveaways.rows.length; i++){
      let giveaway=giveaways.rows[i].doc

      // Set variable from db
      let giveID = giveaway._id
      let giveAddress = giveaway.address
      let giveFromID = giveaway.from_id
      let giveExpire = giveaway.expire
      let giveState = giveaway.state
      let giveShowFromUser = giveaway.give_sender_name
      let giveShowFromMail = giveaway.give_sender_mail
      let giveAmount = await blockchain.getReceivedByAddress(giveAddress)

      // Get the reciever eMail
      let giveFromMail =""
      let sender = await storage.GetAccountByID(giveFromID)
      if (sender.rows.length!=0) {
        sender=sender.rows[0].doc
        if (giveShowFromUser==1 && sender.user_name!='NA') { giveFromMail = sender.user_name+" "}
        if (giveShowFromMail==1) { giveFromMail += "("+sender.signin_mail+") "}
        if ((giveShowFromUser==0 || sender.user_name=='NA') && giveShowFromMail==0) {giveFromMail = "anonymous "}
      }

      // Set table row
      sTable+='<tr>'
      sTable+='<td><a class="td_recieved">'+giveID+'</a></td>'
      sTable+='<td>'+giveAmount[0].result+'</td>'
      sTable+='<td>'+giveAddress+'</td>'
      sTable+='<td>'+giveFromMail+'</td>'
      sTable+='<td>'+giveExpire+'</td>'
      sTable+='<td>'+giveState+'</td>'
      sTable+='</tr>'


    }



    // Set return answer
    sTable+='</table>'
    let answer = {
      'html': sTable,
      'count': giveaways.rows.length
    }

    // Log and return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/updaterecievedlist', [ req.id, error.message, error.stack ])
    return res.redirect('/?msg=0')
  }) // end async function
}); // -------------------------------------------------------------------------





// -----------------------------------------------------------------------------
// POST route from dashboard update Giveaway Item           Update Giveaway item
// -----------------------------------------------------------------------------
router.post('/dashboard/updategiveawayitem', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.body.eMail
  let giveawayID = req.body._id

  // Check if logged is session eMail
  if (req.session.email!=userEmail) {
    req.session.destroy();
    return res.status(403).send('Session error')
  }

  // Check if session expired
  if ((req.session.activity+(config.session_time*60*1000))<dateNow) {
    req.session.destroy();
    return res.status(403).send('Session expired')
  }

  // Execute...
  (async function () {

    // get giveaway data
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData=giveawayData.rows[0].doc

    let from_id = giveawayData.from_id
    let to_id = giveawayData.to_id
    let message = giveawayData.message
    let expire = giveawayData.expire
    let state = giveawayData.state
    let address = giveawayData.address
    let giveShowFromMail = giveawayData.give_sender_mail
    let giveShowFromUser = giveawayData.give_sender_name

    // Get the sender userName (eMail)
    let giveFromMail =""
    let sender = await storage.GetAccountByID(from_id)
    if (sender.rows.length!=0) {
      sender=sender.rows[0].doc
      if (giveShowFromUser==1 && sender.user_name!='NA') { giveFromMail = sender.user_name+" "}
      if (giveShowFromMail==1) { giveFromMail += "("+sender.signin_mail+") "}
      if ((giveShowFromUser==0 || sender.user_name=='NA') && giveShowFromMail==0) {giveFromMail = "anonymous "}
    }

    if (giveShowFromMail==1) { giveShowFromMail = "Yes"} else { giveShowFromMail = "No"}
    if (giveShowFromUser==1) { giveShowFromUser = "Yes"} else { giveShowFromUser = "No"}

    // Get the receiver eMail
    let giveToMail =""
    let reciever = await storage.GetAccountByID(to_id)
    if (reciever.rows.length!=0) {
      reciever=reciever.rows[0].doc
      giveToMail = reciever.signin_mail
    }

    // Set state to text
    let stateTXT = ""
    if (state==1) { stateTXT = "Sent / Not yet accepted"}
    if (state==2) { stateTXT = "Expired / Returned to sender"}
    if (state==3) { stateTXT = "Accepted / sweeped to receiver"}
    if (state==4) { stateTXT = "Not accepted / Returned to sender"}

    // Get amount recieved
    let recievedAmount = await blockchain.getReceivedByAddress(address)

    // Set answer
    let answer = {
      'giveawayID': giveawayID,
      'confirmed': recievedAmount[1].result,
      'unconfirmed': recievedAmount[0].result,
      'address': address,
      'message': message,
      'expire': expire,
      'state': state,
      'stateTXT': stateTXT,
      'giveToMail': giveToMail,
      'giveFromMail': giveFromMail,
      'giveShowFromMail': giveShowFromMail,
      'giveShowFromUser': giveShowFromUser
    }

    // return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/updategiveawayitem', [ req.id, error.message, error.stack ])
    return res.status(500).send('Internal error')
  }) // end async function
}); // -------------------------------------------------------------------------






// -----------------------------------------------------------------------------
// POST route from dashboard sweep Giveaway                       Sweep Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/sweepgiveaway', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.body.eMail.toLowerCase()
  let giveawayID = req.body._id

  // Check if logged is session eMail
  if (req.session.email.toLowerCase()!=userEmail) {
    req.session.destroy();
    return res.status(403).send('Session error')
  }

  // Check if session expired
  if ((req.session.activity+(config.session_time*60*1000))<dateNow) {
    req.session.destroy();
    return res.status(403).send('Session expired')
  }

  // Execute...
  (async function () {

    // get giveaway data
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData=giveawayData.rows[0].doc

    let to_id = giveawayData.to_id
    let address = giveawayData.address
    let wifKey = giveawayData.WIF

    // Get the user data
    let receiverData = await storage.GetAccountByID(to_id)
    if (receiverData.rows.length!=0) {
      receiverData=receiverData.rows[0].doc
    }
    let SweepAddress=receiverData.user_address

    // Get amount recieved
    let recievedAmount = await blockchain.getReceivedByAddress(address)

    // If not minimum 1 confirmation
    if (recievedAmount[1].result <= 0) {
      return res.send(JSON.stringify("Error: No confirmed amount."))
    }

    // List unspent and create tx
    let unspentOutputs = await blockchain.listunspent(address)
    let createTx = signer.createTransaction
    let tx = createTx(unspentOutputs.result, SweepAddress, recievedAmount[1].result, config.fee_tx, wifKey)

    // broadcasting
    logger.log('/dashboard/sweepgiveaway', [giveawayID, 'Broadcasting tx: ', tx ])
    let broadcastResult = await blockchain.broadcastTransaction(tx)

    // Log an store result
    giveawayData.state = 3
    giveawayData.sweep_result = giveawayData.sweep_result || {}
    giveawayData.sweep_result[Date.now()] = {
      'tx': tx,
      'broadcast': broadcastResult
    }
    logger.log('/dashboard/sweepgiveaway', [giveawayID, 'Store result: ', JSON.stringify(broadcastResult) ])
    await storage.saveGiveaway(giveawayData)

    // Set answer
    let answer = "Giveaway was sent to your wallet successfully."

    // return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/sweepgiveaway', [ req.id, error.message, error.stack ])
    return res.status(500).send('Internal error')
  }) // end async function
}); // -------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// POST route from dashboard return Giveaway                     Return Giveaway
// -----------------------------------------------------------------------------
router.post('/dashboard/returngiveaway', function (req, res) {

  let dateNow = Date.now();
  let userEmail = req.body.eMail.toLowerCase()
  let giveawayID = req.body._id

  // Check if logged is session eMail
  if (req.session.email.toLowerCase()!=userEmail) {
    req.session.destroy();
    return res.status(403).send('Session error')
  }

  // Check if session expired
  if ((req.session.activity+(config.session_time*60*1000))<dateNow) {
    req.session.destroy();
    return res.status(403).send('Session expired')
  }

  // Execute...
  (async function () {

    // get giveaway data
    let giveawayData = await storage.GetGiveawayByID(giveawayID)
    giveawayData=giveawayData.rows[0].doc

    let from_id = giveawayData.from_id
    let address = giveawayData.address
    let wifKey = giveawayData.WIF

    // Get the user data
    let senderData = await storage.GetAccountByID(from_id)
    if (senderData.rows.length!=0) {
      senderData=senderData.rows[0].doc
    }
    let ReturnAddress=senderData.user_address

    // Check if sender address is set
    if (ReturnAddress == "" || ReturnAddress == "NA") {
      return res.send(JSON.stringify("Error: Sender's address is not set."))
    }

    // Get amount recieved
    let recievedAmount = await blockchain.getReceivedByAddress(address)

    // If not minimum 1 confirmation
    if (recievedAmount[1].result <= 0) {
      return res.send(JSON.stringify("Error: No confirmed amount."))
    }

    // List unspent and create tx
    let unspentOutputs = await blockchain.listunspent(address)
    let createTx = signer.createTransaction
    let tx = createTx(unspentOutputs.result, ReturnAddress, recievedAmount[1].result, config.fee_tx, wifKey)

    // broadcasting
    logger.log('/dashboard/returngiveaway', [giveawayID, 'Broadcasting tx: ', tx ])
    let broadcastResult = await blockchain.broadcastTransaction(tx)

    // Log an store result
    giveawayData.state = 4
    giveawayData.sweep_result = giveawayData.sweep_result || {}
    giveawayData.sweep_result[Date.now()] = {
      'tx': tx,
      'broadcast': broadcastResult
    }
    logger.log('/dashboard/returngiveaway', [giveawayID, 'Store result: ', JSON.stringify(broadcastResult) ])
    await storage.saveGiveaway(giveawayData)

    // Set answer
    let answer = "Giveaway was returned to the sender's wallet successfully."

    // return data
    req.session.activity=dateNow
    return res.send(JSON.stringify(answer))

  })().catch((error) => {
    logger.error('/dashboard/returngiveaway', [ req.id, error.message, error.stack ])
    return res.status(500).send('Internal error')
  }) // end async function
}); // -------------------------------------------------------------------------








router.use(function (req, res) {
  res.status(404).send('404')
})

module.exports = router
