var swig = require('swig');
var async = require('async');
var template = swig.compileFile(__dirname + '/emails.txt');
var emailExistence = require('email-existence');
var request = require('request');

function processParams(program) {

    if (!program.name) {
        console.log('Please provide the full name of the person surrounded by quotation marks.');
        return Promise.reject();
    }
    else if (!program.domain) {
        console.log('Please provide the company\'s domain');
        return Promise.reject();
    }
    else {

        var nameArr = program.name.split(" ");

        if (nameArr.length != 2 || nameArr[0].length == 0 || nameArr[1].length == 0) {
            console.error('You must provide a full name %s', program.name);
            return Promise.reject();
        }
        else {
            var firstname = nameArr[0].toLowerCase();
            var lastname = nameArr[1].toLowerCase();
            var middlename = program.middle_name.toLowerCase();

            return createEmailsList(program.domain, firstname, lastname, middlename);
        }
    }
}

function createEmailsList(domain, firstname, lastname, middlename) {
    var fi = firstname.charAt(0);
    var li = lastname.charAt(0);
    var mi = middlename.charAt(0);

    var output = template({
        li: li,
        fi: fi,
        mi: mi,
        fn: firstname,
        ln: lastname,
        mn: middlename,
        domain: domain
    });

    var emailsArr = output.split('\n');

    return new Promise(function (resolve, reject) {

        var q = async.queue(function (email, callback) {

            console.log('Testing %s...', email);
            emailExistence.check(email,function (err, res) {

                if (err) {
                    return callback();
                }

                if (res) {
                    console.log("%s is a valid email address", email);
                    // result = {name: firstname + ' ' + middlename + ' ' + lastname, email: email, response: res};

                    // Kill the queue
                    q.kill();

                    //baseado no resultado do emailExistance, preciso chamar essa função e retornar o objeto que ela gerou
                    //obviamente o negócio não tá funfando - já tentei de mil maneiras, mas o bagulho não vai
                    //OFFTOPIC: passar o full_name pela função me parece deselegante. Estou passando essr resultado,
                    // pois caso o resultado minimo que eu precisaria retornar seria full_name e email - esse call só
                    //tentaria reunit mais informações sobre
                    full_name = firstname + ' ' + middlename;
                    getDiscoverlyData(full_name, email).then(result);
                    return resolve(result)

                }

                callback();
            });

        }, 2);

        emailExistence.check("catchalltest123@" + domain, function (err, res) {
            if (err) {
                return callback();
            }
            if (!res) {
                emailsArr.forEach(function (email) {
                    q.push(email, function (err) {
                    });
                });
            } else {
                //get five combinations and fields on discoverly
                console.log(domain + " is catch-all");
            }
        });


        q.drain = function () {
            //Not found, return the 5 addresses on the list
            console.log('Not found: ', JSON.stringify(domain, firstname, lastname));
            reject();
        }
    });
}

// getDiscoverlyData('mahidhar.akella@freshworks.com');

async function getDiscoverlyData(name, email) {
    url = "http://discover.ly/papi/v1/lookup?token=3bc448a0&url=mailto:" + email;

    result = {
        full_name: name,
        email: email,
        twitter_url: 'not found',
        facebook_url: 'not found',
        linkedin_url: 'not found',
        angellist_url: 'not found',
        current_position: 'not found',
        location: 'not found'
    };

    await request(url, async function (error, response, body) {
        data = JSON.parse(body);
        //check how many credits are left and display message when credits = 00
        creditsLeft = data["credits"];
        fields = [,"facebook_url","linkedin_url","twitter_url","angellist_url","current_position","location"];

        for (var i = 0; i < data['result'].length; i++) {
            r = data['result'][i];
            for (var j = 0; j<fields.length; j++) {
                if(r[fields[j]] !== undefined) {
                    result[fields[j]] = r[fields[j]]
                }
            }
        }
        console.log(result);
        return await result
    });
}

module.exports = processParams;
