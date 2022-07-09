const { execSync } = require('child_process');
const fs = require('fs');
const argument = (process.argv[2] != null && process.argv[2] != '' && (process.argv[2] == 'explorer-only' || process.argv[2] == 'dependencies-only') ? process.argv[2] : '');

var reloadWebserver = false;

function exit() {
  console.log('Explorer update complete');
  process.exit(0);
}

function compile_css() {
  // compile scss to css
  execSync('node ./scripts/compile_css.js', {stdio : 'inherit'});
}

// check if the script should check for code updates
if (argument == '' || argument == 'explorer-only') {
  // check if the .git directory and .git/refs/heads/master file exist
  if (fs.existsSync('./.git') && fs.existsSync('./.git/refs/heads/master')) {
    // get the current commit hash
    var commit = fs.readFileSync('./.git/refs/heads/master');

    // update to newest explorer source
    console.log('Downloading newest explorer code.. Please wait..\n');

    try {
      console.log('Git response:');
      execSync('git pull', {stdio : 'inherit'});

      // get the current commit hash to see if it has changed
      var new_commit = fs.readFileSync('./.git/refs/heads/master');

      // check if the commit values are the same
      if (new_commit.toString() == commit.toString()) {
        // explorer code was already up-to-date
        console.log('\nExplorer code is already up-to-date');
      } else {
        console.log('\nExplorer code successfully updated');
        reloadWebserver = true;
      }
    } catch(err) {
      console.log('\nError updating explorer code. Maybe git is not installed globally or you made some custom changes to the explorer code?');
    }
  } else {
    console.log('WARNING: Explorer code not cloned from github and cannot be automatically updated!');
    console.log('Skipping explorer code update');
  }

  // check if this was an explorer-only update
  if (argument == 'explorer-only') {
    // add a new line for better spacing
    console.log('');
  }
}

// check if the script should check for outdated dependencies
if (argument == '' || argument == 'dependencies-only') {
  var outdatedPkgs = null;

  // check for outdated packages
  try {
    console.log((argument == 'dependencies-only' ? '' : '\n') +'Checking for outdated packages.. Please wait..');
    execSync('npm outdated');

    // all packages are up-to-date
    console.log('\nAll explorer packages are up-to-date');
  } catch (err) {
    outdatedPkgs = err.stdout.toString().trim();
  }

  // add a new line for better spacing
  console.log('');

  // check if there were any outdated packages
  if (outdatedPkgs != null) {
    // update npm modules to latest versions according to package.json rules
    console.log('Updating out-of-date explorer packages.. Please wait..\n');
    execSync('npm update');

    // check for outdated packages (again)
    try {
      execSync('npm outdated');

      // all packages are up-to-date
      console.log('All explorer packages are up-to-date\n');
      reloadWebserver = true;
    } catch (err) {
      console.log(`The following packages are still out-of-date:\n${err.stdout.toString().trim()}\n`);

      // check if any of the packages were updated
      if (err.stdout.toString().trim() == outdatedPkgs)
        reloadWebserver = true;
    }
  }
}

// check if the web server should be reloaded
if (reloadWebserver == true) {
  console.log('Checking if webserver is running.. Please wait..\n');

  const path = require('path');
  const lib = require('../lib/explorer');
  var pidActive = false;

  // get a list of all files in the tmp directory
  var tmpFiles = fs.readdirSync('./tmp');

  // get a list of all pm2 pid files
  var pm2Files = tmpFiles
    .filter(file => file.startsWith('pm2') && file.endsWith('.pid'))
    .map(file => path.basename(file, '.pid'));

  // loop through the pm2 pid files and check if at least one is valid/active by testing the pid to see if it is running
  for (var i = 0; i < pm2Files.length; i++) {
    // check if the current pm2.pid file is valid
    if (lib.is_locked([pm2Files[i]], true) == true) {
      // this pid is active so stop checking
      pidActive = true;
      break;
    }
  }

  // check if any pm2 pids were active
  if (pidActive == true) {
    // compile css
    compile_css();

    console.log('\nReloading the explorer.. Please wait..\n');

    // reload pm2 using the zero-downtime reload function
    execSync(`pm2 reload explorer`, {stdio : 'inherit'});

    // add a new line for better spacing
    console.log('');

    // finish the script
    exit();
  } else {
    // check if the forever pid file exists and is valid
    if (fs.existsSync('./tmp/forever.pid') && lib.is_locked(['forever'], true) == true) {
      // this pid is active
      pidActive = true;
    }

    // check if the forever.pid is active
    if (pidActive == true) {
      // compile css
      compile_css();
    
      console.log('\nReloading the explorer.. Please wait..\n');

      // reload forever using the restart function
      execSync(`forever restart explorer`, {stdio : 'inherit'});

      // add a new line for better spacing
      console.log('');

      // finish the script
      exit();
    } else {
      const request = require('postman-request');
      const settings = require('../lib/settings');

      // try executing the restart explorer api
      request({uri: `http://localhost:${settings.webserver.port}/system/restartexplorer`, timeout: 1000}, function (error, response, summary) {
        // check if there was an error
        if (error != null)
          console.log('Webserver is not runnning\n');
        else {
          // compile css
          compile_css();

          console.log('\nReloading the explorer.. Please wait..\n');
        }

        // finish the script
        exit();
      });
    }
  }
} else {
  // finish the script
  exit();
}