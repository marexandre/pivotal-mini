require('rootpath')();
var config = require('yamljs').load('config.yml');

var express = require('express');
var expressLayouts = require('express-ejs-layouts');
var expressValidator = require('express-validator');
var path = require('path');
var url = require('url');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

var postcssMiddleware = require('postcss-middleware');
var postcssVars = require('postcss-simple-vars');
var postcssNested = require('postcss-nested');
var postcssCSSnext = require('postcss-cssnext');
var autoprefixer = require('autoprefixer');
var postcssImport = require('postcss-import');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'default');
app.use(expressLayouts);

// css/js setup
app.use('/css', postcssMiddleware({
  src: function(req) {
    return path.join('public/stylesheets', req.path);
  },
  plugins: [postcssImport, postcssVars, postcssNested, postcssCSSnext, autoprefixer]
}));
app.use(express.static(path.join(__dirname, 'public')));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(require('morgan')('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator());
app.use(require('cookie-parser')());

if (app.get('env') === 'production') {
  var store = new RedisStore({url: process.env.REDIS_URL});
} else {
  var store = new RedisStore({
    host: config.redis.host,
    port: config.redis.port,
  });
}

app.use(session({
  store: store,
  secret: '*6ucFw?oepkYtY(DN*wGJC6FoTJYYHJJxguwgt}d}X4vdAZXXR',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  var userName = null;

  if (req.user) {
    userName = req.user.name;
  }

  res.locals.userName = userName;
  res.locals.title = null;
  res.locals.header = true;
  res.locals.active = req.path.split('/')[1]; // [0] will be empty since routes start with '/'
  next();
});

/**
 * Routes
 */
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/api/', require('./routes/api/'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// In development will print stacktrace and
// in production no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: (app.get('env') === 'development') ? err : {},
    header: null,
  });
});

module.exports = app;
