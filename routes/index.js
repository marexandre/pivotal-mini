require('rootpath')();
var config = require('yamljs').load('config.yml');

var router = require('express').Router();
var passport = require('passport');

/**
 * Index page
 */
router.get('/',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/features');
  }
);

/**
 * Feature request page
 */
router.get('/features',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res) {
    res.render('pages/features', {
      title: 'Features Requested',
      features: config.features.projects,
    });
  }
);

/**
 * Bug report page
 */
router.get('/bugs',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res) {
    res.render('pages/bugs', {
      title: 'Bugs Reported',
      bugs: config.bugs.projects,
    });
  }
);

module.exports = router;
