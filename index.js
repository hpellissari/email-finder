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
            // res.send({email: email});
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

//TODO IUterate getDiscoverlyData
//getDiscoverlyData deve receber esse objeto, call the api para puxar os dados social media.
//se houver dados disponiveis, deve retorna-los. Caso contrário, deve retornar o objeto que foi recebido.
//usando request para efetuar request - vale a pena mudar para Axios?
//Essa função funciona bem quando o status do checker_object é "success", e só é necessário fazer uma única busca
// Porém, nos status catchall e not-found, é recebido uma array de 5 emails ao invés de apenas um único. Qual seria
// a maneira mais rápida pra se fazer isso? recursividade? ou simplesmente passamos sempre uma array de emails
// (no caso, length == 1 para status success) e iteramos todas as vezes?
//

function getDiscoverlyData(checker_object) {
    return new Promise(function (resolve, reject) {
        result = {
            results_found: 0,
            full_name: 'not found',
            email: checker_object.email,
            twitter_url: 'not found',
            facebook_url: 'not found',
            linkedin_url: 'not found',
            angellist_url: 'not found',
            current_position: 'not found',
            location: 'not found'
        };
        url = "http://discover.ly/papi/v1/lookup?token=3bc448a0&url=mailto:" + checker_object.email;
        request(url, async function (error, response, body) {
            if (error) return reject(error);
            try {
                data = JSON.parse(body);
                fields = ["full_name", "facebook_url", "linkedin_url", "twitter_url", "angellist_url", "current_position", "location"];

                for (var i = 0; i < data['result'].length; i++) {
                    r = data['result'][i];
                    for (var j = 0; j < fields.length; j++) {
                        if (r[fields[j]] !== undefined) {
                            result[fields[j]] = r[fields[j]];
                            result.results_found++;
                        }
                    }
                }

                if (result.results_found > 0) {
                    resolve(result)
                } else {
                    resolve(checker_object)
                }
            } catch (e) {
                reject(e)
            }
        });
    })
}


