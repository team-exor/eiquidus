const settings = require('../lib/settings');
const { exec } = require('child_process');

function validate_port(port) {
  if (port == null || typeof port !== 'number' || port < 1 || port > 65535)
    return false;
  else
    return true;
}

function check_webserver_running(cb) {
  // determine operating system
  switch (process.platform) {
    case 'win32':
      // windows
      exec(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${settings.webserver.port} ^| findstr LISTENING') do @echo %~nxa`, (err, stdout, stderr) => {
        // check if the port is open
        if (stdout != null && stdout != '') {
          // split the results in case there are multiple (usually because of ipv4 and ipv6)
          split = stdout.split('\n');

          // return the kill cmd
          return cb(`taskkill /f /pid ${split[0]}`);
        } else
          return cb(null);
      });
      break;
    default:
      // linux, macos, etc.
      exec(`lsof -t -i:${settings.webserver.port}`, (err, stdout, stderr) => {
        // check if the port is open
        if (stdout != null && stdout != '') {
          // return the kill cmd
          return cb(`kill -2 ${stdout.trim()}`);
        } else
          return cb(null);
      });
  }
}

// check if the webserver.port value is a valid port #
if (validate_port(settings.webserver.port) == true) {
  // check if the server is currently running
  check_webserver_running(function(killcmd) {
    // check return value
    if (killcmd != null) {
      // send a kill signal to the process that is currently using the explorer's server port
      exec(killcmd, (err, stdout, stderr) => {
        // show shutdown msg
        console.log('Explorer shutting down... Please wait...');
        process.exit(0);
      });
    } else {
      // webserver is not running
      console.log('Error: Cannot stop explorer because it is not currently running');
      process.exit(1);
    }
  });
} else {
  // invalid port number
  console.log('Error: webserver.port value not found in settings.json.');
  process.exit(1);
}