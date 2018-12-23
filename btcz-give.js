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
* btcz-give.js                                                 Main nodejs start
* ------------------------------------------------------------------------------
*
* Load the application server and set options
* Set the WebApp needed path (css, js, images,...)
* Load the API controlers
* Load/set currency exchange rate refreshing
* Startup the application server
*
* ==============================================================================
*/

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
let express = require('express')
let session = require('express-session');
let morgan = require('morgan')
let uuid = require('node-uuid')
let bodyParser = require('body-parser')
let rp = require('request-promise')


let logger = require('./utils/logger')      // Load the logger module
let config = require('./config')            // Load configuration file
require('./smoke-test')                     // Checking DB & BtcZ node RPC
require('./deploy-design-docs')             // Checking design docs in Couchdb

morgan.token('id', function getId (req) {
  return req.id
})

let app = express()
app.use(function (req, res, next) {
  req.id = uuid.v4()
  next()
})

// Application options
app.use(morgan(':id :remote-addr - :remote-user [:date[clf]] \
    ":method :url HTTP/:http-version" :status :res[content-length] \
    ":referrer" ":user-agent"'))
app.set('trust proxy', 'loopback')

app.use(session({
    secret: 'uU5jSD4f3nnmDfGFFf21mp9rTZtuIo09',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 1800000
    }
}));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json(null))

// WebApp needed path
app.use('/qr', express.static('qr'))
app.use('/css', express.static('docs/css'))
app.use('/js', express.static('docs/js'))
app.use('/images', express.static('docs/images'))

// For EJS rendering
app.set('views', __dirname + '/docs');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Load API controlers
app.use(require('./controllers/api'))
app.use(require('./controllers/website'))



// Startup server
let server = app.listen(config.port, '127.0.0.1', function () {
  logger.log('BOOTING UP', ['Listening on port %d', config.port])
})

module.exports = server
