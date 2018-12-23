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






let d = new Date();
d.setDate(d.getDate()+3)
let day = d.getDate()
let month = d.getMonth()+1
let year =d.getFullYear()
let dateString=year+'-'+month+'-'+day

//let clientIp_t1 = req.headers['x-forwarded-for']

console.log(dateString)
