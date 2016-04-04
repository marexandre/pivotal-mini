require('rootpath')();
var config = require('yamljs').load('config.yml');

var router = require('express').Router();
var passport = require('passport');
var util = require('util');
var request = require('request');
var Q = require('q');


function _onRequestSubmitComplete(err, res, response) {
  if (err) {
    return _res.json({ error: err });
  }
  if (response.kind === 'error') {
    return res.json({ error: response });
  }

  setTimeout(function() {
    res.json({ data: response });
  }, 4 * 1000);
};

router.post('/create_story',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res) {
    var _res = res;

    req.assert('titleWho', 'required').notEmpty();
    req.assert('titleWhat', 'required').notEmpty();
    req.assert('titleWhy', 'required').notEmpty();
    req.assert('detailWhat', 'required').notEmpty();
    req.assert('detailWhy', 'required').notEmpty();
    req.assert('detailImpact', 'required').notEmpty();

    if (req.validationErrors().length > 0) {
      return res.json({ error: req.validationErrors() });
    }

    var b = req.body;
    var data = {
      'story_type': 'feature',
      'requested_by_id': req.user.id,
      'labels': ['f_req'],
      'name': util.format(
        config.features.template.title,
        b.titleWho.trim(),
        b.titleWhat.trim(),
        b.titleWhy.trim()
      ),
      'description': util.format(
        config.features.template.description,
        b.detailWhat.trim(),
        b.detailWhy.trim(),
        b.detailImpact.trim()
      ),
    };

    // console.log(data);
    // res.json({ data: data });

    var options = {
      method: 'POST',
      url: 'https://www.pivotaltracker.com/services/v5/projects/' + config.features.project + '/stories',
      headers: {
        'Content-Type': 'application/json',
        'X-TrackerToken': req.user.token,
      },
      json: data,
    };
    request(options, function(err, res, response) {
      _onRequestSubmitComplete(err, _res, response);
    });
  }
);

router.post('/create_bug',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res) {
    var _res = res;

    req.assert('title', 'required').notEmpty();
    req.assert('reproductionSteps', 'required').notEmpty();
    req.assert('actualResults', 'required').notEmpty();
    req.assert('expectedResults', 'required').notEmpty();
    req.assert('reproductionRate', 'required').notEmpty();

    if (req.validationErrors().length > 0) {
      return res.json({ error: req.validationErrors() });
    }

    var b = req.body;
    var data = {
      'story_type': 'bug',
      'requested_by_id': req.user.id,
      'labels': ['f_req'],
      'name': util.format(config.bugs.template.title, b.title.trim()),
      'description': util.format(
        config.bugs.template.description,
        b.reproductionSteps.trim(),
        b.actualResults.trim(),
        b.expectedResults.trim(),
        b.reproductionRate
      ),
    };

    if (b.productArea && b.productArea !== 'other') {
      data.labels.push(b.productArea);
    }

    if (b.isP0 && b.isP0_accept) {
      data.labels.push('p0');
    }

    // console.log(data);
    // res.json({ data: data });

    var options = {
      method: 'POST',
      url: 'https://www.pivotaltracker.com/services/v5/projects/' + config.bugs.project + '/stories',
      headers: {
        'Content-Type': 'application/json',
        'X-TrackerToken': req.user.token,
      },
      json: data,
    };
    request(options, function(err, res, response) {
      _onRequestSubmitComplete(err, _res, response);
    });
  }
);

router.get('/get_requests',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res, next) {
    var _req = req;
    var _res = res;

    var projects = req.query.projects;
    var type = req.query.type;
    var username = req.query.username || req.user.name;

    // requester:dg includedone:true
    var qList = [];
    for (var i = 0, imax = projects.length; i < imax; i++) {
      qList.push((function() {
        var d = Q.defer();
        var query = 'type:' + type + ' requester:' + username + ' includedone:true';
        var options = {
          method: 'GET',
          url: 'https://www.pivotaltracker.com/services/v5/projects/' + projects[i] + '/search?query=' + query,
          headers: {
            'Content-Type': 'application/json',
            'X-TrackerToken': req.user.token,
          },
        };

        request(options, function(err, res, data) {
          if (err) {
            d.reject(err);
          } else {
            d.resolve(JSON.parse(data).stories.stories);
          }
        });

        return d.promise;
      })());
    }

    Q.all(qList).then(function(results) {
      var list = [].concat.apply([], results);
      list = list
        .filter(function(story) {
          return story.story_type !== 'chore';
        })
        .filter(function(story) {
          return story.story_type !== 'release';
        })
        .filter(function(story) {
          return !/\[* TEMPLATE\]/.test(story.name);
        })
        .filter(function(story) {
          return !(story.project_id === config.bugs.project && story.story_type === 'feature');
        })
        .sort(function(b, a) {
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        });

      _res.json(list);
    });
  }
);

function getMemberships(token, project) {
  return (function() {
    var d = Q.defer();

    var options = {
      method: 'GET',
      url: 'https://www.pivotaltracker.com/services/v5/projects/' + project + '/memberships',
      headers: {
        'Content-Type': 'application/json',
        'X-TrackerToken': token,
      }
    };

    request(options, function(err, res, data) {
      if (err) {
        d.reject(err);
      } else {
        var dataJSON = JSON.parse(data);
        dataJSON = dataJSON.map(function(user) {
          return user.person;
        });
        d.resolve(dataJSON);
      }
    });

    return d.promise;
  })();
}

function removeDopeObjectsFromArray(list, key) {
  var keys = [];
  return list.filter(function(v) {
    if (keys.indexOf(v[key]) < 0) {
      keys.push(v[key]);
      return true;
    }

    return false;
  });
}

router.get('/get_users_list',
  passport.authenticate('custom', { failureRedirect: '/login' }),
  function(req, res, next) {
    var _res = res;
    // var projects = [1122490, 1419374, 969040];
    var projects = req.query.projects;

    var qList = [];
    for (var i = 0, imax = projects.length; i < imax; i++) {
      qList.push(getMemberships(req.user.token, projects[i]));
    }

    Q.all(qList).then(function(result) {
      var list = [].concat.apply([], result);
      // list = removeDopeObjectsFromArray(list, 'email');
      list = removeDopeObjectsFromArray(list, 'name');
      list = list.sort(function(a, b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

      _res.json(list);
    });
  }
);


module.exports = router;
