const fs = require('fs');
const path = require('path');
const lib = require('../lib/explorer');
const archiveSuffix = '.bak';
const backupLockName = 'backup';
const settings = require('../lib/settings');
let backupPath = path.join(path.dirname(__dirname), 'backups');
let backupFilename;
let singleCollection = '';
let lockCreated = false;

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

// verify that the collection exists
function verify_collection_exists(cb) {
  // check if the backup will be for a single collection
  if (singleCollection != null && singleCollection != '') {
    const mongoose = require('mongoose');
    const dbString = `mongodb://${encodeURIComponent(settings.dbsettings.user)}:${encodeURIComponent(settings.dbsettings.password)}@${settings.dbsettings.address}:${settings.dbsettings.port}/${settings.dbsettings.database}`;

    console.log('Connecting to database..');

    mongoose.set('strictQuery', true);

    // connect to mongo database
    mongoose.connect(dbString).then(() => {
      // lookup the collection in the list of collections
      mongoose.connection.db.listCollections({ name: singleCollection }).toArray().then((collections) => {
        // check if the collection exists
        if (collections.length > 0) {
          // collection exists
          return cb(false);
        } else {
          // collection not found
          return cb(true);
        }
      }).catch((err) => {
        console.log(err);
        return cb(true);
      });
    }).catch((err) => {
      console.log('Error: Unable to connect to database: %s', err);
      exit(999);
      return cb(true);
    });
  } else
    return cb(false);
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

// check if a collection name was passed into the script
if (process.argv[3] != null && process.argv[3] != '') {
  // save the collection name to a variable for later use
  singleCollection = process.argv[3];
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
    if (lib.is_locked(['restore', 'delete', 'index', 'markets', 'peers', 'masternodes', 'plugin']) == false) {
      // check if the collection name exists
      verify_collection_exists(function(collection_error) {
        // check if there was an error finding the collection by name
        if (!collection_error) {
          // all tests passed. OK to run backup
          console.log(`${settings.localization.script_launched }: ${process.pid}`);

          const { exec } = require('child_process');

          // execute backup
          const backupProcess = exec(`mongodump --host="${settings.dbsettings.address}" --port="${settings.dbsettings.port}" --username="${settings.dbsettings.user}" --password="${settings.dbsettings.password}" --db="${settings.dbsettings.database}" --archive="${path.join(backupPath, backupFilename + archiveSuffix)}" --gzip${singleCollection == null || singleCollection == '' ? '' : ` --collection ${singleCollection}`}`);

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
          // the collection does not exist
          console.log(`Collection "${singleCollection}" does not exist`);
          exit(2);
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