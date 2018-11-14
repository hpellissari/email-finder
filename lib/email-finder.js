var swig = require('swig');
var async = require('async');
var template = swig.compileFile(__dirname + '/emails.txt');
var emailExistence = require('email-existence');

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
            emailExistence.check(email, function (err, res) {

                if (err) {
                    return callback();
                }

                if (res) {
                    console.log("%s is a valid email address", email);
                    checker_object = {
                        status: 'success',
                        full_name: firstname +' '+ middlename +' ' + lastname,
                        first_name: firstname,
                        middle_name: middlename,
                        last_name: lastname,
                        email: [email]
                    };
                    // Kill the queue
                    q.kill();
                    return resolve(checker_object)

                }

                callback();
            });

        }, 2);

        //Check if it's catchall
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
                console.log(domain + " is catch-all");
                checker_object = {
                    status: 'catch-all',
                    full_name: firstname +' '+ middlename +' ' + lastname,
                    first_name: firstname,
                    middle_name: middlename,
                    last_name: lastname,
                    email: []
                };
                if (middlename == '') {
                    checker_object.email = emailsArr.slice(0, 6)
                } else {
                    checker_object.email = emailsArr.slice(-6)
                }
                return resolve(checker_object);
            }
        });


        q.drain = function () {
            //Not found, return the 5 addresses on the list
            console.log('Not found: ', JSON.stringify(domain, firstname, lastname));
            // reject();
            checker_object = {
                status: 'not-found',
                full_name: firstname +' '+ middlename +' ' + lastname,
                first_name: firstname,
                middle_name: middlename,
                last_name: lastname,
                email: [],
            };
            if (middlename == '') {
                checker_object.email = emailsArr.slice(0, 6)
            } else {
                checker_object.email = emailsArr.slice(-6)
            }
            return resolve(checker_object)
        }
    });
}

module.exports = processParams;
