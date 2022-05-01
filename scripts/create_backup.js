const fs = require('fs');
const path = require('path');
const lib = require('../lib/explorer');
const archiveSuffix = '.bak';
const backupLockName = 'backup';
var backupPath = path.join(path.dirname(__dirname), 'backups');
var backupFilename;
var lockCreated = false;

// exit function used to cleanup lock before finishing script
function exit(exitCode) {
  // only remove backup lock if it was created in this session
  if (!lockCreated || lib.remove_lock(backupLockName) == true) {
    // clean exit with previous exit code
    process.exit(exitCode);
  } else {
    // error removing lock
    process.exit(1);
  }
}

// check if a backup filename was passed into the script
if (process.argv[2] != null && process.argv[2] != '') {
  // use the backup filename passed into this script
  backupFilename = process.argv[2];
} else {
  const systemDate = new Date();
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // no backup filename passed in. use todays date as the backup filename
  backupFilename = `${systemDate.getFullYear()}-${monthName[systemDate.getMonth()]}-${systemDate.getDate()}`;
}

// check if backup filename has the archive suffix already
if (backupFilename.endsWith(archiveSuffix)) {
  // remove the archive suffix from the backup filename
  backupFilename = backupFilename.substring(0, backupFilename.length - archiveSuffix.length);
}

// check if the backup filename already has a path
if (path.isAbsolute(backupFilename)) {
  // the backup filename is a full path
  // split out the path and filename
  backupPath = path.dirname(backupFilename);
  backupFilename = path.basename(backupFilename);
}

// check if the backup directory exists
if (!fs.existsSync(backupPath)) {
  // attempt to create the directory
  fs.mkdirSync(backupPath);
}

// check if backup file already exists
if (!fs.existsSync(path.join(backupPath, `${backupFilename}${archiveSuffix}`))) {
  // check if the "create backup" process is already running
  if (lib.is_locked([backupLockName]) == false) {
    // create a new backup lock before checking the rest of the locks to minimize problems with running scripts at the same time
    lib.create_lock(backupLockName);
    // ensure the lock will be deleted on exit
    lockCreated = true;
    // check all other possible locks since backups should not run at the same time that data is being changed
    if (lib.is_locked(['restore', 'delete', 'index', 'markets', 'peers', 'masternodes']) == false) {
      // all tests passed. OK to run backup
      console.log("Script launched with pid: " + process.pid);

      const { exec } = require('child_process');
      const settings = require('../lib/settings');
      const randomDirectoryName = Math.random().toString(36).substring(2, 15) + Math.random().toString(23).substring(2, 5);

      // execute backup
      const backupProcess = exec(`mongodump --host="${settings.dbsettings.address}" --port="${settings.dbsettings.port}" --username="${settings.dbsettings.user}" --password="${settings.dbsettings.password}" --db="${settings.dbsettings.database}" --archive="${path.join(backupPath, backupFilename + archiveSuffix)}" --gzip`);

      backupProcess.stdout.on('data', (data) => {
        console.log(data);
      });

      backupProcess.stderr.on('data', (data) => {
        console.log(Buffer.from(data).toString());
      });

      backupProcess.on('error', (error) => {
        console.log(error);
      });

      backupProcess.on('exit', (code, signal) => {
        if (code) {
          console.log(`Process exit with code: ${code}`);
          exit(code);
        } else if (signal) {
          console.log(`Process killed with signal: ${signal}`);
          exit(1);
        } else {
          console.log(`Backup saved successfully to ${path.join(backupPath, backupFilename + archiveSuffix)}`);
          exit(0);
        }
      });
    } else {
      // another script process is currently running
      console.log("Backup aborted");
      exit(2);
    }
  } else {
    // backup process is already running
    console.log("Backup aborted");
    exit(2);
  }
} else {
  // backup already exists
  console.log(`A backup named ${backupFilename}${archiveSuffix} already exists`);
  exit(2);
}