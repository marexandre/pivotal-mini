var router = require('express').Router();
var tracker = require('pivotaltracker');
var request = require('request');

var passport = require('passport');
var CustomStrategy = require('passport-custom');
passport.use('custom', new CustomStrategy(
  function(req, done) {
    if (req.user) {
      return done(null, req.user);
    }

    return done(null, false);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

/**
 * Login page
 */
router.get('/login', function(req, res) {
  // If user loged in then redirect
  if (req.user) {
    return res.redirect('/');
  }

  res.render('pages/login', {
    message: req.session.message || null,
    header: false,
    title: 'Login',
  });

  req.session.message = null;
  req.session.save();
});

var LOGIN_FAIL_MESSAGE = 'Email or password did not match. Please try again.';

/**
 * Login logic
 */
router.post('/login', function(req, res, next) {
  var _req = req;
  var _res = res;

  req.assert('email', 'required').notEmpty();
  req.assert('email', 'valid email required').isEmail();
  req.assert('password', 'required').notEmpty();

  if (req.validationErrors().length > 0) {
    req.session.message = LOGIN_FAIL_MESSAGE;
    return res.redirect('/login');
  }

  var options = {
    method: 'GET',
    url: 'https://www.pivotaltracker.com/services/v5/me',
    headers: {
      'Content-Type': 'application/json',
    },
    auth: {
      user: req.body.email,
      pass: req.body.password,
    }
  };
  request(options, function(err, res, data) {
    if (err) {
      return next(err);
    }

    var body = JSON.parse(data);
    if (body.kind === 'error') {
      _req.session.message = LOGIN_FAIL_MESSAGE;
      return _res.redirect('/login');
    }

    _req.login(_getUserLoginSession(body), function(err) {
      if (err) {
        return next(err);
      }

      return _res.redirect('/');
    });
  });
});

/**
 * _getUserLoginSession returns object with used data that we store in redis
 *
 * @param  {Object} body Response from pivotal API
 * @return {Object}      User object
 */
function _getUserLoginSession(body) {
  return {
    id: body.id,
    token: body.api_token,
    name: body.name,
  };
}

/**
 * Logout logic
 */
router.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
