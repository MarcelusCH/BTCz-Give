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





let eMail ="  buob.MarCel "

console.log(eMail)
console.log(eMail.toLowerCase()+"---")
console.log(eMail.toLowerCase().trim()+"---")
