/**
 *
 * Helpers
 *
 */

function formatDate(date) {
  if (date === null) {
    return 'unknown';
  }
  if (!date || date === '') {
    return '';
  }
  return new Date(date).toISOString().substring(0, 10);
}

/**
 *
 * Bugs / Features page
 *
 */
/**
 * loadStroyRequestList
 * @param  {jQuery} $target  [description]
 * @param  {number} projects [description]
 * @param  {string} type     [description]
 * @param  {string} username [description]
 */
function loadStroyRequestList($target, projects, type, username) {
  $target.find('.loading-panel').show();

  $.ajax({
    url: '/api/get_requests',
    dataType: 'JSON',
    data: {
      projects: projects,
      type: type,
      username: username,
    }
  })
  .done(function(results) {
    onGetStoryListComplete(results, $target, 100);
  })
  .always(function() {
    $target.find('.loading-panel').hide();
  });
}

/**
 * getUsersList
 * @param  {jQuery} $target  [description]
 * @param  {number} projects [description]
 * @param  {string} type     [description]
 */
function getUsersList($target, projects, type) {
  var $userSelect = $target.find('.dropdown-user-select');

  $.ajax({
    url: '/api/get_users_list',
    dataType: 'JSON',
    data: {
      projects: projects
    }
  })
  .done(function(result) {
    $userSelect.find('.dropdown-menu').html(
      result.map(function(user) {
        return '<li><a href="#">' + user.name + '</a></li>';
      })
    );
  });

  $userSelect.find('.dropdown-menu').on('click', 'a', function(e) {
    e.preventDefault();
    var user = $(this).text();
    $userSelect.find('.dropdown-title').html(user);

    loadStroyRequestList($target, projects, type, user);
  });
}

/**
 * _updateProductStoryStatus
 * @param  {Object} story Pivotal story object
 */
function _updateProductStoryStatus(story) {
  switch (story.current_state) {
    case 'unscheduled':
      story.status = 'technical review';
      break;
    case 'unstarted':
      story.status = 'prioritized';
      break;
    case 'planned':
    case 'started':
    case 'finished':
    case 'delivered':
    case 'rejected':
      story.status = 'implementing';
      break;
    case 'accepted':
      var released = story.labels.filter(function(label) {
        return /released/.test(label.name);
      });
      if (released.length === 0) {
        story.status = 'ready for release';
        break;
      }
    default:
      story.status = '';
  }

  _updateRelesedState(story);
}

/**
 * _updateBugStoryStatus
 * @param  {Object} story Pivotal story object
 */
function _updateBugStoryStatus(story) {
  switch (story.current_state) {
    case 'unscheduled':
    case 'unstarted':
    case 'planned':
      story.status = 'requested';
      break;
    case 'started':
    case 'finished':
    case 'delivered':
    case 'accepted':
    case 'rejected':
      story.status = 'implementing';
      break;
    default:
      story.status = '';
  }

  _updateRelesedState(story);
};

/**
 * _updateRelesedState will add a new statuts field to story object
 * @param  {Object} story Pivotal story object
 */
function _updateRelesedState(story) {
  for (var i = 0, imax = story.labels.length; i < imax; i++) {
    if (story.labels[i].name === 'closed') {
      story.status = 'closed';
      story.released_at = '';
    } else if (story.labels[i].name === 'released') {
      story.status = 'released';
      story.released_at = null;
    } else if (story.labels[i].name.indexOf('released') !== -1) {
      story.status = 'released';
      story.released_at = story.labels[i].created_at;
    }
  }
}

/**
 * checkIfNewStory will return some HTML indicating that a srory is newly created
 * @param  {String} date Date string
 * @return {String}
 */
function checkIfNewStory(date) {
  var now = new Date().getTime();
  var created = new Date(date).getTime();
  var limit = 60 * 60 * 24 * 1000; // 24 hours

  if (now - created < limit) {
    return '<span class="label label-danger">New</span>';
  }
  return '';
}

function onGetStoryListComplete(results, target, limit) {
  var html = [];

  results = results.splice(0, limit);

  // Cleanup targetlist
  target
    .find('tbody').html('')
    .end()
    .find('.no-results').remove();

  if (results.length === 0) {
    target.find('.table').after('<h4 class="no-results text-center">No results found</h4>');
    return;
  }

  results.forEach(function(story, index) {
    if (story.story_type === 'feature') {
      _updateProductStoryStatus(story);
    }
    if (story.story_type === 'bug') {
      _updateBugStoryStatus(story);
    }

    html.push([
      '<tr class="' + story.status + '">',
        '<td>' + (index + 1) + '</td>',
        '<td class="ellipsis">' + checkIfNewStory(story.created_at) + '<a href="' + story.url + '" target="_blank">' + story.name + '</a></td>',
        '<td class="text-center status">' + story.status + '</td>',
        '<td class="text-center">' + formatDate(story.updated_at) + '</td>',
        '<td class="text-center ' + formatDate(story.released_at) + '">' + formatDate(story.released_at) + '</td>',
      '</tr>',
    ].join(''));
  });
  target.find('tbody').html(html.join(''));
}

/**
 * _onValidationErrors
 * @param {jQuery} $form  jQuery form object
 * @param {array} errors  Array of validation errors
 */
var _onValidationErrors = function($form, errors) {
  $.each(errors, function(i, err) {
    $form
      .find('input[name=' + err.param + '], textarea[name=' + err.param + '], select[name=' + err.param + ']')
      .addClass('error');
  });
};

var objToString = function(obj) {
  var str = '';
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str += p + ':: ' + obj[p] + '\n';
    }
  }
  return str;
};
/**
 * _onPivotalError
 * @param {Object} result Pivotal error object
 */
var _onPivotalError = function(result) {
  var messages = ['--- ERROR ---'];

  if (result.status === 400) {
    if (result.error) {
      messages.push('Error: ' + result.error);
    }

    if (result.generalProblem) {
      messages.push('Problem: ' + result.generalProblem);
    }

    if (result.message) {
      messages.push('Message: ' + result.message);
    }

    if (result.possibleFix) {
      messages.push('Possible fix: ' + result.possibleFix);
    }
  } else {
    messages.push(objToString(result));
  }

  if (messages.length !== 0) {
    alert(messages.join('\n'));
  }
};

/**
 * createDone runes when creating a story or bug is complete
 * @param {jQuery} Form jQuery object
 * @param {Object} result Object containing Data or Error information
 */
var createDone = function($form, result) {
  $form.find('input, textarea, select').removeClass('error');

  if (result.hasOwnProperty('error')) {
    // Handle validation errors
    if ($.isArray(result.error)) {
      _onValidationErrors($form, result.error);
      return;
    }
    // Handle pivotal errors
    _onPivotalError(result.error);

    return;
  }

  $form.closest('.modal')
    .on('hidden.bs.modal', function() {
      $form[0].reset();
    })
    .modal('hide');

  $(window).trigger('on.modal.submit.success');
};

$(function() {

  autosize($('textarea'));

  $('.create-btn').on('click', function(e) {
    e.preventDefault();

    var $this = $(this);

    if ($this.hasClass('disabled')) {
      return;
    }
    $this.button('loading');

    var $form = $(this).closest('.modal-content').find('form');

    $.ajax({
      url: $form.attr('action'),
      type: 'POST',
      dataType: 'json',
      data: $form.serialize(),
    })
    .fail(function(err) {
      console.error(err);
    })
    .done(function(result) {
      createDone($form, result);
    })
    .always(function() {
      setTimeout(function() {
        $this.button('reset');
      }, 100);
    });
  });

});
