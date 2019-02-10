BTCz-Give (v0.1.3 beta)
===================

Self-hosted Node.js BitcoinZ Giveaway Tool.
Test phase for the gateway with login.

You can use this tool to send BitcoinZ to your friends using their eMail addresses. The give.btcz.app BTCz Giveaway Tool is an free service that provides you end-to-end-user BTCz payment control. It generates a new address (and QR) for each payment. A expiration date is set in case your freinds do not take the payment, in which case it will be returned to your address. This is an open-sourced solution available as a baseline for further development by anyone.  Intended to push user acceptance, this project can be a great lever for entrepreneurship people to use in their BTCz promotion efforts.  The BTCz Giveaway Tool allows anyone and everyone to promote BTCz in the easiest possible way.


Installation
------------

* Install [bitcoinz-insight-patched](https://github.com/btcz/bitcoinz-insight-patched)

Install nodejs 8.x
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install nodejs libzmq3-dev
```

Clone & install project:
```
git clone https://github.com/MarcelusCH/BTCz-Give && cd BTCz-Give
npm install
cp config.js.dev config.js
```

Install & configure Couchdb:
```
sudo apt-get install couchdb
curl -s -X PUT http://localhost:5984/_config/admins/User_Name -d '"Pass_Word"'
curl -u User_Name -X PUT localhost:5984/btczgive
```

Edit `config.js`:
* Point it to a new Couchdb database
* Point it to a BitcoinZ Core RPC server
* Add tmp wallet with founds for speed payment



Running
-------

```
nodejs btcz-give.js
nodejs worker.js
nodejs worker2.js
nodejs worker3.js
```
(For production use [pm2](https://www.npmjs.com/package/pm2))


Open [http://localhost:2222](http://localhost:2223) in browser, you should see the website sample.
That's it, ready to use.

License
-------

MIT

Author
------

Marcelus (BTCZ community)


TODO
----
- Aggregate funds on final (aggregational) address.
- TBD


UPDATES
=======

Version 0.1.3 (beta)
---
- Updated Title and About text (Thanks to @SJ Improvement).
- CSS Style update for mobile devices.
- Added address copy function and link to open wallet (if configured).
- Forced email field type in contact form.


Version 0.1.2 (beta)
---
- Corrected Welcome eMail.
- Corrected Giveaway stats.
- Rewrite some code parts.


Version 0.1.1 (beta)
---
- Updated Login issue (eMail sensitive case).
- Added Readme in the github.
