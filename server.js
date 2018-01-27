'use strict';

var mongoose = require('mongoose');
var async = require('async');
var dbsObject = {};
var models = require('./helpers/models')(dbsObject);
var dbsNames = {};
var connectOptions;
var mainDb;
var app;
const fs = require('fs-extra')

require('pmx').init();

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./config/environment/' + process.env.NODE_ENV);

connectOptions = {
    db: {
        native_parser: true
    },
    server: {
        poolSize: 5
    },
    w: 1,
    j: true
};
mainDb = mongoose.createConnection(process.env.MAIN_DB_HOST, process.env.MAIN_DB_NAME, process.env.DB_PORT, connectOptions);
mainDb.on('error', function (err) {
    err = err || 'connection error';
    console.error(err);

    process.exit(1, err);
});
mainDb.once('open', function callback() {
    var mainDBSchema;
    var port = parseInt(process.env.PORT, 10) || 8089;
    var instance = parseInt(process.env.NODE_APP_INSTANCE, 10) || 0;
    var main;

    port += instance;
    mainDb.dbsObject = dbsObject;

    dbsObject.mainDB = mainDb;

    console.log('Connection to mainDB is success');

    require('./models/index.js');

    mainDBSchema = mongoose.Schema({
        _id: Number,
        url: {
            type: String,
            default: 'localhost'
        },
        DBname: {
            type: String,
            default: ''
        },
        pass: {
            type: String,
            default: ''
        },
        user: {
            type: String,
            default: ''
        },
        port: Number
    }, {
        collection: 'easyErpDBS'
    });

    main = mainDb.model('easyErpDBS', mainDBSchema);
    main.find().exec(function (err, result) {
        var result = [{
                "_id": 3,
                "url": "localhost",
                "DBname": "saas",
                "user": "easyErp",
                "pass": "1q2w3e!@#",
                "port": 27017
            },
            {
                "_id": 4,
                "url": "localhost",
                "DBname": "CRM",
                "user": "",
                "pass": "",
                "port": 27017
            }
        ]
        if (err) {
            process.exit(1, err);
        }

        async.each(result, function (_db, eachCb) {
            var dbInfo = {
                DBname: '',
                url: ''
            };
            var opts = {
                db: {
                    native_parser: true
                },
                server: {
                    poolSize: 5
                },
                w: 1,
                j: true
            };
            var dbObject = mongoose.createConnection(_db.url, _db.DBname, _db.port, opts);

            dbObject.on('error', function (err) {
                console.error(err);
                eachCb(err);
            });
            dbObject.once('open', function () {
                console.log('Connection to ' + _db.DBname + ' is success');

                dbInfo.url = _db.url;
                dbInfo.DBname = _db.DBname;
                dbsObject[_db.DBname] = dbObject;
                dbsNames[_db.DBname] = dbInfo;

                eachCb();
            });
        }, function (err) {
            if (err) {
                return console.error(err);
            }
            app = require('./app')(mainDb, dbsNames);

            //DICUS
            var Natinality = dbsObject['CRM'].model('nationality');
            var CurrencyStore=dbsObject['saas'].model('CurrencyStore')
            // Natinality.remove(function(err,res){
            //     console.log(err,res)
            // });

            Natinality.findOneAndUpdate({
                name: "peruvian"
            }, {
                name: "peruvian"
            }, {
                upsert: true,
                'new': true
            }, function (err, res) {
                console.log(res);
            });

            var Workflow = dbsObject['CRM'].model('workflows');
            // Workflow.find((err,res)=>{
            //     console.log(err,res,"respuesta")
            // })

            Workflow.findOneAndUpdate({
                status: "In Progress",
                wId: "DealTasks",
                mid: 39
            }, {
                color: "#2C3E50",
                name: "To be discussed",
                sequence: 1,
                status: "In Progress",
                visible: true,
                wId: "DealTasks",
                mid: 39
            }, {
                upsert: true,
                'new': true
            }, function (err, res) {
                console.log(err, res);
            });

            CurrencyStore.find().then(res => {
                var file = './bin/CurrencyStore.json'
                // fs.writeJson(file, res, err => {
                //     if (err) return console.error(err)
                //     console.log('success!')
                // })
            })







            app.listen(port, function () {
                var Scheduler = require('./services/scheduler')(models);
                var scheduler = new Scheduler(dbsObject);

                console.log('==============================================================');
                console.log('|| server instance=' + instance + ' start success on port=' + port + ' in ' + process.env.NODE_ENV + ' version ||');
                console.log('==============================================================\n');

                if (result.length > 0) {
                    scheduler.initEveryDayScheduler();
                }
            });
        });
    });

    mainDb.mongoose = mongoose;
});