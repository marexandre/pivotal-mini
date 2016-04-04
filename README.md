# pivotal-mini
A simple application that uses [Pivotal Tracker API](https://www.pivotaltracker.com/help/api/rest/v5#top) to make peoples lives a bit easier to submit feature requests or bug reports.

##### Features Page
![Features Page](https://cloud.githubusercontent.com/assets/228359/14236854/bd556892-fa56-11e5-8c31-16f0bfee3df1.png)

##### Feature submit modal
![Feature submit modal](https://cloud.githubusercontent.com/assets/228359/14236863/cd6985ec-fa56-11e5-9d0c-987c46bca5b7.png)

##### Bugs Page
![Bugs Page](https://cloud.githubusercontent.com/assets/228359/14236869/dd231156-fa56-11e5-958f-c73fd2d568a8.png)

##### Bug submit modal
![Bug submit modal](https://cloud.githubusercontent.com/assets/228359/14236873/e761461a-fa56-11e5-9be9-a63321c26c57.png)

### Installation
- Install [nodejs](https://nodejs.org/) development environment
- Run `npm install`

### Develop
Rename `congig.sample.yml` to `congig.yml` and add your Pivotal projects ID's, also if necessary update redis setting.

Recommended to install [nodemon](http://nodemon.io/), nodemon is a utility that will monitor for any changes in your source and automatically restart your server.
To start the dev server run this command:

```
nodemon bin/www
```

Or if using nodejs then:
```
node bin/www
```

Access `localhost:4649` in you browser :pray:

### Heroku
This App is made to run on Heroku, but you can serve it on your server too. Read more [here](https://devcenter.heroku.com/articles/git) for how to deploy to Heroku.
