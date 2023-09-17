const minNodeVersionMajor = '16';
const minNodeVersionMinor = '20';
const minNodeVersionRevision = '1';

// get the nodejs version
var nodeVersion = process.version;
var nodeVersionMajor = '0';
var nodeVersionMinor = '0';
var nodeVersionRevision = '0';

// check if the nodejs version # is blank or a very long string as that would usually indicate a problem
if (nodeVersion != null && nodeVersion != '' && nodeVersion.length < 16) {
  // remove the 'v' from the beginning of the version string
  if (nodeVersion.indexOf('v') == 0)
    nodeVersion = nodeVersion.slice(1);

  // split node version string into major, minor and revision
  var splitVersion = nodeVersion.split('.');

  nodeVersionMajor = splitVersion[0];

  if (splitVersion.length > 1)
    nodeVersionMinor = splitVersion[1];

  if (splitVersion.length > 2)
    nodeVersionRevision = splitVersion[2];
}

// check if the installed nodejs is an older version than supported by the explorer
if (!(nodeVersionMajor > minNodeVersionMajor || (nodeVersionMajor == minNodeVersionMajor && (nodeVersionMinor > minNodeVersionMinor || (nodeVersionMinor == minNodeVersionMinor && nodeVersionRevision >= minNodeVersionRevision))))) {
  console.log(`Please install an updated version of nodejs.\n\nInstalled: ${nodeVersion}\nRequired:  ${minNodeVersionMajor}.${minNodeVersionMinor}.${minNodeVersionRevision}`);
  process.exit(1);
}

function check_arguments_passed(cb) {
  const arguments = (process.argv[2] == null ? '' : process.argv[2]).split(' ');
  const pidName = (arguments != null && arguments.length > 0 && arguments[0] != null && arguments[0] != '' && (arguments[0] == 'pm2' || arguments[0] == 'forever') ? arguments[0] : 'node');
  const node_env = (arguments != null && arguments.length > 0 && arguments[1] != null && arguments[1] != '' ? arguments[1] : 'development');

  // check 1st argument
  if (pidName != null) {
    const { exec } = require('child_process');

    // determine which argument was passed
    switch (pidName) {
      case 'pm2':
        // windows pm2 has problem loading locally, but other os's should work fine
        const isWinOS = process.platform == 'win32';
        
        // run a cmd to check if pm2 is installed
        exec(`npm list${(isWinOS ? ' -g' : '')} pm2`, (err, stdout, stderr) => {
          // split stdout string by new line
          var splitResponse = (stdout == null ? '' : stdout.trim()).split('\n').filter(element => element);

          // check if the cmd result contains an @ symbol
          if (splitResponse[1].indexOf('@') == -1) {
            console.log('Installing pm2 module.. Please wait..');

            // install pm2
            exec(`npm install pm2@latest${(isWinOS ? ' -g' : '')}`, (err, stdout, stderr) => {
              // always return the pidName and node_env value for now without checking results
              return cb(pidName, node_env);
            });
          } else
            return cb(pidName, node_env);
        });
        break;
      case 'forever':
        // run a cmd to check if forever is installed
        exec('npm list forever', (err, stdout, stderr) => {
          // split stdout string by new line
          var splitResponse = (stdout == null ? '' : stdout.trim()).split('\n').filter(element => element);

          // check if the cmd result contains an @ symbol
          if (splitResponse[1].indexOf('@') == -1) {
            console.log('Installing forever module.. Please wait..');
            
            // install forever
            exec('npm install forever', (err, stdout, stderr) => {
              // always return the pidName and node_env value for now without checking results
              return cb(pidName, node_env);
            });
          } else
            return cb(pidName, node_env);
        });
        break;
      default:
        // argument not passed or unknown argument
        return cb(pidName, node_env);
    }
  } else
    return cb(pidName, node_env);
}

// check if arguments were passed into this script
check_arguments_passed(function(pidName, node_env) {
  const execSync = require('child_process').execSync;

  // compile scss to css
  execSync('node ./scripts/compile_css.js', {stdio : 'inherit'});

  const db = require('../lib/database');

  // connect to the mongo database
  db.connect(null, function() {
    // initialize the database
    db.initialize_data_startup(function() {
      // check if the webserver should be started from here based on the pidName
      switch (pidName) {
        case 'pm2':
          let startOrReload = 'start';

          // get a json list of pm2 processes
          let result = execSync(`pm2 jlist`);

          // check if the result is null
          if (result != null) {
            try {
              // convert return result to JSON
              result = JSON.parse(result);

              // loop through the results
              for (let i = 0; i < result.length; i++) {
                // check if this is an explorer process
                if (result[i].name == 'explorer') {
                  // explorer process exists, so reload the process
                  startOrReload = 'reload';
                  break;
                }
              }
            } catch(e) {
              // do nothing
            }
          }

          // Setting the NODE_ENV variable is more easily done from here seeing at the syntax changes slightly depending on operating system
          execSync(`${(process.platform == 'win32' ? 'set' : 'export')} NODE_ENV=${node_env} && pm2 ${startOrReload} ./bin/instance -i 0 -n explorer -p "./tmp/pm2.pid" --node-args="--stack-size=10000" --update-env`, {stdio : 'inherit'});
          break;
        case 'forever':
          const path = require('path');

          // there is a long-time bug or shortcoming in forever that still exists in the latest version which requires the absolute path to the pid file option
          // more info: https://github.com/foreversd/forever/issues/421
          // forever is therefore started from here to be able to more easily resolve the absolute path
          // also, setting the NODE_ENV variable is more easily done from here as well seeing at the syntax changes slightly depending on operating system
          execSync(`${(process.platform == 'win32' ? 'set' : 'export')} NODE_ENV=${node_env} && forever start --append --uid "explorer" --pidFile "${path.resolve('./tmp/forever.pid')}" ./bin/cluster`, {stdio : 'inherit'});    
          break;
      }

      // finished pre-loading
      process.exit(0);
    });
  });
});