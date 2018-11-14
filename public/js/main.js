// Get sesssion data from localStorage
var LOCAL_STORAGE_KEY = 'bp_session';
var sessionData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
sessionData = sessionData ? JSON.parse(sessionData) : {submissions: 0, email: false};

/*
 * On email modal submit handler
 */
function onEmailSubmit(e) {

    e.preventDefault();

    // Get data from form
    var data = buildData(e.target);

    if (!validate(data)) {
        return
    }

    // Disable form
    $('#email-capture input').attr('disabled', true);
    $('#email-capture button').attr('disabled', true);

    // $('#result').html;
    data.type = 'Email Finder';

    $.ajax({
        url: "https://7umdo22ge3.execute-api.us-west-2.amazonaws.com/dev/email",
        method: "POST",
        data: JSON.stringify(data),
        timeout: 20000,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
    })
        .done(function (data) {

            $('#email-capture input').attr('disabled', false);
            $('#email-capture button').attr('disabled', false);

            // Set that email has been submitted
            sessionData.email = true;

            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));

            $('#modal1').modal('close');
        })
        .fail(function (err) {

            $('#email-capture input').attr('disabled', false);
            $('#email-capture button').attr('disabled', false);
        });

    return false;
}

/*
 * Validate the form
 *
 * - Check that fields aren't empty, if so add invalid class
 */
function validate(data) {
    var valid = true;

    for (var key in data) {
        var input = $("input[name='" + key + "']");

        if (!data[key] && key != 'middle_name') {
            valid = false;
            input.addClass('invalid');
        }
        else {
            input.removeClass('invalid');
        }
    }

    return valid;
}

/*
 * Build data
 *
 * - Serialize form and build object
 */
function buildData(form) {
    return $(form).serializeArray().reduce(function (obj, item) {
        obj[item.name] = item.value.trim();

        if (obj[item.name]) {
            obj[item.name] = item.value.toLowerCase();
        }
        return obj;
    }, {});
}

/*
 * On submit handler
 */
function onSubmit(e) {

    e.preventDefault();

    // Get data from form
    var data = buildData(e.target);

    if (!validate(data)) {
        return
    }
    post(data, e)
        .done(function (data) {
            $('#result').html('Success! The email is:');
            $('.success-form').addClass('show');
            console.log(data);
            $('#single-result').append('<tr><th>Name</th><th>' + data.full_name + '</th></tr>');
            $('#single-result').append('<tr><th>Email</th><th>' + data.email + '</th></tr>');
            $('#single-result').append('<tr><th>Twitter</th><th>' + data.twitter_url + '</th></tr>');
            $('#single-result').append('<tr><th>Facebook</th><th>' + data.facebook_url + '</th></tr>');
            $('#single-result').append('<tr><th>Linkedin</th><th>' + data.linkedin_url + '</th></tr>');
            $('#single-result').append('<tr><th>Angellist</th><th>' + data.angellist_url  + '</th></tr>');
            $('#single-result').append('<tr><th>Current position</th><th>' + data.current_position + '</th></tr>');
            $('#single-result').append('<tr><th>Location</th><th>' + data.location + '</th></tr>');
        })
        .fail(function (data) {
            console.log(data)
            $('#results-table').html('');
            $('#result').html('There was a problem finding the email.');
        })
}


function post(data, e) {

    var loadingCover = $('.loading-cover');
    // Show loading screen
    $('.success-form').removeClass('show');
    loadingCover.addClass('show');

    // Clear old result
    $('#result').html('');
    $('#single-result').html('');
    $('#results-table').html('');

    return $.ajax({
        url: "/find",
        method: "POST",
        data: JSON.stringify(data),
        timeout: 200000,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
    })
        .done(function (data) {
            // Hide loading screen
            loadingCover.removeClass('show');

        })
        .fail(function (err) {
            // Hide loading screen
            loadingCover.removeClass('show');
        });

    return false;
}

function copyToClipboard() {
    var copyText = document.getElementById("success_field");
    copyText.select();
    document.execCommand("copy");
}


function readFile() {

    function parseAndRequest(csv) {
        var lines = csv.split("\n");
        var result = [];
        for (var i = 1; i < lines.length; i++) {
            // var obj = {};
            var currentline = lines[i].split(",");

            obj = {
                first_name: currentline[0],
                middle_name: currentline[1],
                last_name: currentline[2],
                domain: currentline[3]
            };

            post(obj)
                .done(function (data) {
                    if ($('#results-table').is(':empty')) {
                        $('#results-table').append('<tr><th>Name</th><th>Email Address</th><th>Twitter</th><th>Facebook</th><th>Linkedin</th><th>Angelist</th><th>Current Position</th><th>Location</th>/tr>');
                    }
                    $('#results-table tr:last').after('<tr><th>'+data.first_name +'</th><th>'+data.email+'</th><th>'+data.twitter_url+'</th><th>'+data.facebook_url+'</th><th>'+data.linkedin_url+'</th><th>'+data.angellist_url+'</th><th>'+data.current_position+'</th><th>'+data.location+'</th></tr>');
                })
                .fail(function (data) {
                    if ($('#results-table').is(':empty')) {
                        $('#results-table').append('<tr><th>Name</th><th>Email Address</th>/tr>');
                    }
                    // $('#results-table tr:last').after('<tr><th>' + data.email.name + '</th><th>not found</th></tr>');
                });
            result.push(obj);
        }
        return result; //JSON
    }

    var file = document.getElementById('file-input').files[0];
    //check file type
    if (file.type == "application/vnd.ms-excel" || file.type == "text/csv") {
        reader = new FileReader();
        reader.onload = function (e) {
            var text = reader.result;
            var json = parseAndRequest(text);
        };
        reader.readAsText(file)
    } else {
        alert("File format not supported")
    }

}


/*
 * Initialize
 */
function init() {

    $('#email-form').on('submit', onSubmit);
    $('#email-capture').on('submit', onEmailSubmit);

    $(".button-collapse").sideNav();

    $('.modal').modal({
            dismissible: false, // Modal can be dismissed by clicking outside of the modal
            opacity: .5, // Opacity of modal background
            in_duration: 300, // Transition in duration
            out_duration: 200, // Transition out duration
            starting_top: '4%', // Starting top style attribute
            ending_top: '10%', // Ending top style attribute
        }
    );

}

$(document).ready(init);




