const { execSync } = require('child_process');
const fs = require('fs');
const mongoose = require('mongoose');

// exit function used to cleanup before finishing script
function exit(exitCode) {
  // disconnect mongo connection
  mongoose.disconnect();

  // exit process
  process.exit(exitCode);
}

var response;

// check if the .git directory exists
if (fs.existsSync('./.git')) {
  // update to newest explorer source
  console.log('Downloading newest explorer code.. Please wait..');

  try {
    response = execSync('git pull');

    // split response string by new line
    var splitResponse = (response == null ? '' : response.toString()).split('\n').filter(element => element);

    // check if the response was a single line which indicates it was already up-to-date
    if (splitResponse.length == 1) {
      // explorer code was already up-to-date
      console.log('Explorer code is already up-to-date');
    } else {
      console.log(response.toString().trim());
      console.log('Explorer code successfully updated');
    }
  } catch(err) {
    console.log('Error updating explorer code. Maybe git is not installed globally?');
  }
} else {
  console.log('WARNING: Explorer code not cloned from github and cannot be automatically updated!');
  console.log('Skipping explorer code update');
}

// update npm modules to latest versions according to package.json rules
console.log('Updating out-of-date explorer packages.. Please wait..');
execSync('npm update');

// check for outdated packages
try {
  execSync('npm outdated');

  // all packages are up-to-date
  console.log('All explorer packages are up-to-date');
} catch (err) {
  console.log(`The following packages are still out-of-date:\n${err.stdout.toString().trim()}`);
}

// load database and settings files after being updated
const db = require('../lib/database');
const settings = require('../lib/settings');

var dbString = 'mongodb://' + encodeURIComponent(settings.dbsettings.user);
dbString = dbString + ':' + encodeURIComponent(settings.dbsettings.password);
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

// connect to mongo database
mongoose.connect(dbString, function(err) {
  if (err) {
    console.log('Error: Unable to connect to database: %s', dbString);
    exit(999);
  } else {
    // initialize the database
    db.initialize_data_startup(function() {
      exit(0);
    });
  }
});