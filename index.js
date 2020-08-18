var express = require('express');
var session = require('express-session');
var fetch = require('node-fetch');
var handlebars = require('handlebars');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

const NODE_APP_PORT = 8080;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_SECRET = process.env.TWITCH_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;
const TWITCH_OAUTH2_URL = 'https://id.twitch.tv/oauth2';
const TWITCH_TOKEN_URL = TWITCH_OAUTH2_URL + '/token';
const TWITCH_AUTH_URL = TWITCH_OAUTH2_URL + '/authorize';
const TWTICH_API_USERS = 'https://api.twitch.tv/helix/users';

var app = express();
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: TWTICH_API_USERS,
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };
  
  (async () => {    
    const response = await fetch(TWTICH_API_USERS, options);
    const json = await response.json();

    if (response && response.ok) {
      done(null, json);
    } else {
      done(json);
    }
  })();
};

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: TWITCH_AUTH_URL,
    tokenURL: TWITCH_TOKEN_URL,
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    done(null, profile);
  }
));

// Set route to start OAuth link with scope
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'channel:read:redemptions' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

var template = handlebars.compile(`
<html><head><title>Twitch Bot Auth</title></head>
<table>
    <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
    <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
</table></html>`);

app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    res.send(template(req.session.passport.user));
  } else {
    res.send('<html><head><title>Twitch Bot Auth</title></head><a href="/auth/twitch"><img src="https://assets.help.twitch.tv/favicon.ico"></a></html>');
  }
});

app.listen(NODE_APP_PORT, function () {
  console.log('Twitch Bot auth listening on port ' + NODE_APP_PORT);
});
