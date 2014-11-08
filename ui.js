// Workarounds for legacy browsers

// Courtesy: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
if ( !Date.prototype.toISOString ) {
  ( function() {
    function pad(number) {
      var r = String(number);
      if ( r.length === 1 ) {
        r = '0' + r;
      }
      return r;
    }
    Date.prototype.toISOString = function() {
      return this.getUTCFullYear()
        + '-' + pad( this.getUTCMonth() + 1 )
        + '-' + pad( this.getUTCDate() )
        + 'T' + pad( this.getUTCHours() )
        + ':' + pad( this.getUTCMinutes() )
        + ':' + pad( this.getUTCSeconds() )
        + '.' + String( (this.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
        + 'Z';
    };
  }() );
}

// btoa (worry about this) IE10+ 
// see: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_.22Unicode_Problem.22
// JSON.stringify (don't worry about this) IE8+
// see: https://github.com/douglascrockford/JSON-js/blob/master/json2.js


// The M in MVC
var model = {
    // Name of the repository
    repo: function() {
        return $("#repository").val();
    },
    // Who's the instructor? (i.e., github login)
    instructor: function() {
        return $("#instructor").val();
    },
    // User's login at their machine
    hostLogin: function() {
        return $("#host").val();
    },
    // User's public key
    publicKey: function() {
        return $("#public-key").val();
    },
    // The user's full name
    name: function() {
        // Is the name valid?
        var isValid = function(value) {
            var regex = /[^ ]+( [^ ]+)+/;
            return regex.test(value);
        };
        // Get name from localStorage (user confirmed value)
        if (localStorage.hasOwnProperty("User.name") && isValid(localStorage.getItem("User.name"))) {
            return localStorage.getItem("User.name");
        }
        // Otherwise, get name from the form element
        else if (isValid($("#name").val().trim())) {
            localStorage.setItem("User.name", $("#name").val().trim());
            return $("#name").val().trim();
        }
        // FAIL
        return "";
    },
    // The user's school email address
    email: function() {
        // Is the user's email valid?
        var isValid = function(value) {
            var regex1 = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            var regex2 = /edu$/;
            return regex1.test(value) && regex2.test(value);
        };
        // Get email from localStorage (user confirmed value)
        if (localStorage.hasOwnProperty("User.email") && isValid(localStorage.getItem("User.email"))) {
            return localStorage.getItem("User.email");
        }
        // Otherwise, get email from the form element
        else if (isValid($("#email").val().toLowerCase().trim())) {
            localStorage.setItem("User.email", $("#email").val().toLowerCase().trim());
            return $("#email").val().toLowerCase().trim();
        }
        // FAIL
        return "";
    },
    // Gravatar ID
    gravatarId: function() {
        return SparkMD5.hash(model.email());
    },
};

// The C in MVC :-)
var controller = {
    // Show class and hide its opposite
    update: function(klass, value) {
        $(((value) ? "." : ".no-")+klass).show();
        $(((value) ? ".no-" : ".")+klass).hide();
    },
    // Update name view on change
    name: function() {
        $( "#git-config-name" ).html('git config --global user.name "' + model.name() + '"');
    },
    // Update email view on change
    email: function() {
        $( "#git-config-email" ).html('git config --global user.email ' + model.email());
        
        $("#visible-gravatar").attr('src', 'http://www.gravatar.com/avatar/' + model.gravatarId() + '?d=retro&s=140');
        $.ajax({
            method: "GET",
            dataType: "jsonp",
            crossDomain: true,
            processData: false,
            url: 'https://en.gravatar.com/' + model.gravatarId() + '.json',
            success: function(response) {
                localStorage.setItem("Gravatar", model.gravatarId());
                controller.update('gravatar-account',true);
            },
            error: function(response) {
                localStorage.removeItem("Gravatar");
                controller.update('gravatar-account',false);
            }
        });
    },
    gravatar: function() {
        controller.update('gravatar-authenticated',false);
    },
    github: function() {
        if (Github.authenticated()) {
            $("#github-login").val(Github.getUsername());
            setupUser();
            setupEmail();
//            setupSSH();
            setupRepo();
            $(".origin-href").attr("href", "https://github.com/" + Github.getUsername() + "/" + model.repo());
            $("#collaborator-href").attr("href", "https://github.com/" + Github.getUsername() + "/" + model.repo() + "/settings/collaboration");
            $("#origin-code").html("git remote add origin git@github.com:" + Github.getUsername() + "/" + model.repo() + ".git");
            controller.update('github-authenticated', true);
        } else {
            controller.update('github-authenticated', false);
        }
    },
};
$( "#name" ).on( "change", function( event ) {
    controller.name();
});
$( "#email" ).on( "change", function( event ) {
    controller.email();
});
$( "#github-password" ).on( "change", function( event) {
    controller.github();
});

$(function() {
    $("#name").val(model.name());
    $("#email").val(model.email());
    controller.name();
    controller.email();
    controller.gravatar();
    controller.github();
});

function setupUser() {
    // Nag the user if they're not on an upgraded plan
    Github.getUser({
        success: function(response) {
            controller.update('github-upgraded', (response.plan.name.toLowerCase() != "free"));
        }
    });
    Github.setUser({
        data: { name: model.name() },
        success: function(response) {
            controller.update('github-profile',true);
        },
        fail: function(response) {
            controller.update('github-profile',false);
        }
    });
    // Set the company for the instructor's benefit
    // (if a company isn't already set)
    // TODO: http://www.whoisxmlapi.com/whois-api-doc.php
    /*
    if (response.hasOwnProperty("company") && response.company == "") {
        Github.setUser({
            data: {company: ""},
            success: function(response) {},
            fail: function(response) {
            // TODO: tell the user what to do if this breaks
            }
        });
    }
    */
}
function setupEmail() {
    // Setup email
    Github.getEmail({
        email: model.email(),
        added: function() {
            controller.update('github-email-found',true);
        },
        verified: function() {
            controller.update('github-email-verified',true);
        },
        unverified: function() {
            controller.update('github-email-verified',false);
        },
        missing: function() {
            // The user needs to verify their email
            controller.update('github-email-verified',false);
            Github.setEmail({
                email: model.email(),
                success: function() {
                    controller.update('github-email-found',true);
                },
                fail: function() {
                    controller.update('github-email-found',false);
                }
            });
        }
    });
}
function setupSSH() {
    Github.shareKey({
        title: model.hostLogin(),
        key: model.publicKey(),
        success: function() {
            controller.update('github-key',true);
        },
        fail: function() {
            controller.update('github-key',false);
        }
    });
}
function setupRepo() {
    Github.createRepo({
        repo: model.repo(),
        success: function(response) {
            controller.update('github-repository',true);
        },
        fail: function(response) {
            controller.update('github-repository',false);
        }
    });
    Github.addCollaborator({
        repo: model.repo(),
        collaborator: model.instructor(),
        success: function(response) {
            controller.update('github-collaborator', true);
        },
        fail: function(response) {
            controller.update('github-collaborator', false);
        }
    });
}
function login(event) {
    Github.login({
        username: $("#email").val(),
        password: $("#github-password").val(),
        otp: $("#otp").val(),
        authenticated: function(login) {
            controller.github();
        },
        badCredential: function() {
            // Clear the password
            $("#password").attr('value', '');
            controller.github();
        },
        twoFactor: function() {
            $('.github-two-factor').show();
            $('#otp').focus();
        }
    });
}
function logout(event) {
    Github.logout();
    controller.update('github-authenticated', false);
}