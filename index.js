var express = require('express');
var path = require('path');
var bodyParser = require('body-parser')
var debug = require('debug')('index');
var emailFinder = require('./lib/email-finder');
// var axios = require('axios');
var request = require('request');
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
//modifiquei o email-finder para enviar objetos dependendo do tipo de resultado - success qundo apenas um email é encontrado,
//catchall e not-found são autoexplicativos.
app.post('/find', function (req, res) {
    var data = {
        name: req.body.first_name.trim() + ' ' + req.body.last_name.trim(),
        middle_name: req.body.middle_name.trim(),
        domain: req.body.domain.replace(/(https:\/\/|http:\/\/| |www.|^)|( |\/|$)/g, '')
    };
    console.log(data.domain);
    emailFinder(data)
        .then(function (email) {
            res.send({email: email});
        })
        .catch(function (err) {
            res.status(500).send(err);
        })
});

// All set, start listening!
app.listen(app.get('port'), function () {
    console.log(`Server running at http://localhost:${app.get('port')}`);
});

//getDiscoverlyData deve receber esse objeto, call the api para puxar os dados social media.
//se houver dados disponiveis, deve retorna-los. Caso contrário, deve retornar o objeto que foi recebido.
//usando request para efetuar request - vale a pena mudar para Axios?
//Essa função funciona bem quando o status do checker_object é "success", e só é necessário fazer uma única busca
// Porém, nos status catchall e not-found, é recebido uma array de 5 emails ao invés de apenas um único. Qual seria
// a maneira mais rápida pra se fazer isso? recursividade? ou simplesmente passamos sempre uma array de emails
// (no caso, length == 1 para status success) e iteramos todas as vezes?
//

function getDiscoverlyData(checker_object) {
    url = "http://discover.ly/papi/v1/lookup?token=3bc448a0&url=mailto:" + checker_object.email;
    console.log(url);
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

    //Faz o request e procura os dados no objeto retornado para populate o objeto Result
    request(url, async function (error, response, body) {
        data = JSON.parse(body);
        //check how many credits are left and display message when credits = 00
        creditsLeft = data["credits"];
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
    });

    //checa resultado, se for encontrada alguma informação adicional utilizando esse email, deve retornar esse objeto
    //caso contrário, retorna checker_object
    if(result.results_found > 0){
        console.log(result);
        return result
    }else{
        console.log(checker_object);
        return checker_object
    }


}