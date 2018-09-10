var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var StoreOwner = new Schema({
    username: {type: String, unique: true},
    password: String,
    email: String,
    storeID: {type: Schema.ObjectId, ref: 'Store', required: true},
    mobile: String,
    isMaster: {type: Boolean, default: false}
});

StoreOwner.plugin(passportLocalMongoose);

module.exports = mongoose.model('StoreOwner', StoreOwner);