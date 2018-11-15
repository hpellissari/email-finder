var express = require('express');
var path = require('path');
var bodyParser = require('body-parser')
var debug = require('debug')('index');
var emailFinder = require('./lib/email-finder');
// var axios = require('axios');
var request = require('request-promise');
var app = express();

process.env.NODE_ENV = process.env.NODE_ENV || 'dev';

var rootDir = path.resolve(__dirname);

app.set('port', (process.env.PORT || 5000));

// Configure jade as template engine
app.set('views', rootDir + '/views');
app.set('view engine', 'ejs');
app.set("view options", {layout: false});

// Parse the body
// Warning: http://andrewkelley.me/post/do-not-use-bodyparser-with-express-js.html
// parse application/json
app.use(bodyParser.json());

// Serve static content from "public" directory
app.use(express.static(rootDir + '/public'));


app.get('/', function (req, res) {
    res.render('index', {
        GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID || ''
    });
});

app.post('/find', function (req, res) {
    var data = {
        name: req.body.first_name.trim() + ' ' + req.body.last_name.trim(),
        middle_name: req.body.middle_name.trim(),
        domain: req.body.domain.replace(/(https:\/\/|http:\/\/| |www.|^)|( |\/|$)/g, '')
    };

    emailFinder(data)
        .then(function (email) {
            return email
        })
        .then(function (email) {
            getDiscoverlyData(email)
                .then(function (result) {
                    res.send(result)
                })
        })

        .catch(function (err) {
            res.status(500).send(err);
        })


});

// All set, start listening!
app.listen(app.get('port'), function () {
    console.log(`Server running at http://localhost:${app.get('port')}`);
});


function getDiscoverlyData(checker_object) {
    return new Promise(function (resolve, reject) {

        var promises = [];

        for (k = 0; k < checker_object['email'].length; k++) {
            url = "http://discover.ly/papi/v1/lookup?token=3bc448a0&url=mailto:" + checker_object.email[k];
            promises.push(request(url))
        }

        Promise.all(promises).then(function (data) {
            console.log(data)
            result = {
                results_found: 0,
                full_name: 'not found',
                email: 'not found',
                twitter_url: 'not found',
                facebook_url: 'not found',
                linkedin_url: 'not found',
                angellist_url: 'not found',
                current_position: 'not found',
                location: 'not found',
                index: 0
            };

            for (k = 0; k < data.length; k++) {
                json = JSON.parse(data[k]);
                fields = ["full_name", "facebook_url", "linkedin_url", "twitter_url", "angellist_url", "current_position", "location"];
                for (var i = 0; i < json['result'].length; i++) {
                    r = json['result'][i];
                    for (var j = 0; j < fields.length; j++) {
                        if (r[fields[j]] !== undefined) {
                            result[fields[j]] = r[fields[j]];
                            result.results_found++;
                        }
                    }

                }
                console.log(result)
                result.full_name = checker_object.full_name;
                if (result.results_found > 0) {
                      result.email = checker_object.email[k];
                    if (result.full_name === 'not found') {
                        result.full_name = checker_object.first_name + ' ' + checker_object.middle_name + ' ' + checker_object.last_name
                    }
                    return resolve(result)
                }
            }
            result.email = checker_object.email;
            return resolve(result)
        })

    })
}
