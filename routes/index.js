var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Deal = require('../models/deal');
var StoreOwner = require('../models/storeOwner');
var Store = require('../models/store');
var Img = require('../models/image');
var fs = require('fs');
var multer = require('multer');
var mongoose = require('mongoose');
var router = express.Router();
var redis = require('redis');
var client = redis.createClient(); //creates a new client


client.on('connect', function () {
    console.log('connected');
});



/* GET home page. */
router.get('/', function (req, res) {
    res.send('Hello Maniak!');
});


/************************************* client *************************************/
/**********************************************************************************/
/**********************************************************************************/
/**********************************************************************************/
/**********************************************************************************/


// Registration of regular user
router.post('/register', function (req, res) {
    Account.register(new Account({username: req.body.username}),
        req.body.password, function (err) {
            if (err) {
                res.status(400).send('error');
            }
            passport.authenticate('user')(req, res, function () {
                res.send('registered successfully')
            });
        });
});


// Login
router.post('/login', passport.authenticate('user'), function (req, res) {
    var promise = Account.findOne({username: req.user.username}).exec();
    promise.then(function (user) {
        req.session.user_id = user._id;
        // NOTICE: session is saved immediately only if data is sent back to the user
        // or if it done manually

        // req.session.save();
        res.send('Yoa are logged in');
    });
});


// Get deals
router.get('/deals', checkAuth, function (req, res) {
    Deal.find({}).populate({path: 'storeID'}).exec(function (err, deals) {
        if (err) res.status(400).send('error');
        else res.send(deals);
    });
});


function checkAuth(req, res, next) {
    if (!req.session.user_id) {
        res.status(401).send('You must login first!');
    } else {
        next();
    }
}


// Logout
router.get('/logout', checkAuth, function (req, res) {
    delete req.session.user_id;
    req.logout();
    res.send('logout');
});


/********************************** Store Owner ***********************************/
/**********************************************************************************/
/**********************************************************************************/
/**********************************************************************************/
/**********************************************************************************/

var upload = multer({
    dest: 'uploads/'
});

// NOTE: when uploading a photo header content type should be "form-data"

var registerStore = function (store, req, res) {
    store.save(function (err, store1) {
        if (err) res.status(400).send('error');
        else {
            StoreOwner.register(new StoreOwner({
                    username: req.body.username, email: req.body.email,
                    mobile: req.body.mobile, storeID: store1._id
                }),
                req.body.password, function (err) {
                    if (err) res.status(400).send('error');
                    passport.authenticate('StoreOwner')(req, res, function () {
                        res.send('store registered successfully')
                    });
                });
        }
    });
};


// Registration of store owner user
router.post('/storeOwner/register', upload.single('userPhoto'), function (req, res) {
    var store = new Store({
        name: req.body.storeName,
        location: req.body.location
    });
    // if image is included
    if (req.file) {
        var newItem = new Img();
        newItem.img.data = fs.readFileSync(req.file.path);
        newItem.img.contentType = 'image/jpg';
        newItem.save(function (err, photo) {
            if (err) res.status(400).send('error');
            else {
                store.logoID = photo._id;
                registerStore(store, req, res);
            }
        });
    } else registerStore(store, req, res);
});


// Login for store owner
router.post('/storeOwner/login', passport.authenticate('StoreOwner'), function (req, res) {
    var promise = StoreOwner.findOne({username: req.user.username}).exec();
    promise.then(function (user) {
        req.session.user_id = user._id;
        // NOTICE: session is saved immediately only if data is sent back to the user
        // or if it done manually

        // req.session.save();
        res.send('Yoa are logged in');
    });
});


var addDeal = function (deal, res) {
    deal.save(function (err) {
        if (err) res.status(400).send('error');
        else res.send('deal added successfully!');
    });
};

// Add Deal
router.post('/storeOwner/addDeal', checkAuthOwner, upload.single('userPhoto'), function (req, res) {
    var promise = StoreOwner.findOne({_id: req.session.user_id}).exec();
    promise.then(function (owner) {
        var deal = new Deal();
        deal.storeOwnerID = owner._id;
        deal.storeID = owner.storeID;
        deal.preview = req.body.preview;
        deal.details = req.body.details;
        deal.time = req.body.time;
        if (req.file) {
            var newItem = new Img();
            newItem.img.data = fs.readFileSync(req.file.path);
            newItem.img.contentType = 'image/jpg';
            newItem.save(function (err, photo) {
                if (err) res.status(400).send('error');
                else {
                    deal.imgID = photo._id;
                    deal.path = 'images/'+ req.file.originalname;
                    addDeal(deal, res);
                }
            });
        } else addDeal(deal, res);
    });
});


// Get img by its id
router.get('/uploads/getImage', function (req, res) {
    var imgID = req.query.imgID;
    var id = mongoose.Types.ObjectId(imgID);
    client.get(imgID, function (err, reply) {
        if (err) res.status(400).send('error');
        //Img exist in cache
        else if (reply) {
            var obj = JSON.parse(reply);
            var buffer = Buffer.from(obj.data);
            res.contentType(obj.contentType);
            res.send(buffer);
        }
        //Img doesn't exist in cache
        else {
            Img.findOne({_id: id}).exec().then(function (doc, err) {
                if (err) res.status(400).send('error');
                else {
                    res.contentType(doc.img.contentType);
                    res.send(doc.img.data);
                    client.set(imgID, JSON.stringify(doc.img));
                }
            });
        }
    });
});


// Get deals per store owner
router.get('/storeOwner/getDeals', checkAuthOwner, function (req, res) {
    var promise = Deal.find({storeOwnerID: req.session.user_id}).populate({path: 'storeID'}).exec();
    promise.then(function (deals, err) {
        if (err) res.status(400).send('error');
        else res.send(deals);
    });
});


// delete deal by id
router.post('/storeOwner/deleteDeal', checkAuthOwner, function (req, res) {
    Deal.remove({ _id: req.body.id }, function(err) {
        if (err) res.status(500).send('error');
        else res.status(200).send('deal deleted successfully');
    });
});


// delete all deals
router.get('/storeOwner/deleteAllDeals', checkAuthOwner, function (req, res) {
    Deal.remove({}, function(err) {
        if (err) res.status(500).send('error');
        else res.status(200).send('all deals deleted');
    });
});


router.get('/storeOwner/logout', checkAuthOwner, function (req, res) {
    delete req.session.user_id;
    req.logout();
    res.send('logout');
});


function checkAuthOwner(req, res, next) {
    if (!req.session.user_id) {
        // 401 - Unauthorized
        res.status(401).send('You must login first!');
    } else {
        var promise = StoreOwner.findOne({_id: req.session.user_id}).exec();
        promise.then(function (user) {
            if (!user) res.status(401).send("you are not owner");
            else next();
        });
    }
}


module.exports = router;
