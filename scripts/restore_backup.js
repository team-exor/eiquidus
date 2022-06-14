const fs = require('fs');
const path = require('path');
const lib = require('../lib/explorer');
const archiveSuffix = '.bak';
const oldArchiveSuffix = '.tar.gz';
const restoreLockName = 'restore';
const defaultBackupPath = path.join(path.dirname(__dirname), 'backups');
var lockCreated = false;

// exit function used to cleanup lock before finishing script
function exit(mongoose, exitCode) {
  const db = require('../lib/database');

  // check if mongo was connected
  if (mongoose != null) {
    // check if this is a clean exit
    if (exitCode == 0) {
      // initialize the database
      db.initialize_data_startup(function() {
        // disconnect mongo connection
        mongoose.disconnect();

        // finish exit cleanup
        finishExit(db, exitCode);
      });
    } else {
      // disconnect mongo connection
      mongoose.disconnect();

      // finish exit cleanup
      finishExit(db, exitCode);
    }
  } else {
    // finish exit cleanup
    finishExit(db, exitCode);
  }
}

function finishExit(db, exitCode) {
  // always check for and remove the sync msg if exists
  db.remove_sync_message();

  // only remove restore lock if it was created in this session
  if (!lockCreated || lib.remove_lock(restoreLockName) == true) {
    // clean exit with previous exit code
    process.exit(exitCode);
  } else {
    // error removing lock
    process.exit(1);
  }
}

function check_module_directory_exists(dirName, cb) {
  // check if module directory exists
  if (!fs.existsSync(`./node_modules/${dirName}`)) {
    const { exec } = require('child_process');

    console.log('Installing tar package.. Please wait..');

    // install tar module
    exec('npm install tar', (err, stdout, stderr) => {
      // always return true for now without checking results
      return cb(true);
    });
  } else
    return cb(true);
}

function drop_collection(mongoose, colName, cb) {
  // attempt to delete the collection
  mongoose.connection.db.dropCollection(colName, function(err, result) {
    if (err || !result) {
      console.log(`Error: Unable to delete the ${colName} collection`);
      exit(mongoose, 1);
    } else
      return cb(true);
  });
}

function delete_database(mongoose, settings, cb) {
  const dbString = `mongodb://${encodeURIComponent(settings.dbsettings.user)}:${encodeURIComponent(settings.dbsettings.password)}@${settings.dbsettings.address}:${settings.dbsettings.port}/${settings.dbsettings.database}`;

  console.log('Connecting to database..');

  // connect to mongo database
  mongoose.connect(dbString, function(err) {
    if (err) {
      console.log('Error: Unable to connect to database: %s', dbString);
      exit(mongoose, 999);
    } else {
      // get the list of collections
      mongoose.connection.db.listCollections().toArray(function (err, collections) {
        if (err) {
          console.log('Error: Unable to list collections in database: %s', err);
          exit(mongoose, 1);
        } else {
          // check if there are any collections
          if (collections.length > 0) {
            var counter = 0;

            // loop through all collections
            collections.forEach((collection) => {
              console.log(`Deleting ${collection.name}..`);

              // delete this collection
              drop_collection(mongoose, collection.name, function(retVal) {
                // check if the collection was successfully deleted
                if (retVal)
                  counter++;

                // check if the last collection was deleted
                if (counter == collections.length) {
                  // finished the delete process
                  return cb(true);
                }
              });
            });
          } else {
            // nothing to delete
            return cb(true);
          }
        }
      });
    }
  });
}

function restore_backup(mongoose, settings, backupPath, extractedPath, gZip) {
  const { exec } = require('child_process');

  console.log('Restoring backup.. Please wait..');

  // restore mongo database from backup
  const restoreProcess = exec(`mongorestore --host="${settings.dbsettings.address}" --port="${settings.dbsettings.port}" --username="${settings.dbsettings.user}" --password="${settings.dbsettings.password}" --authenticationDatabase="${settings.dbsettings.database}" ${(gZip ? `--gzip --archive="${backupPath}"` : `"${extractedPath}"`)}`);

  restoreProcess.stdout.on('data', (data) => {
    console.log(data);
  });

  restoreProcess.stderr.on('data', (data) => {
    console.log(Buffer.from(data).toString());
  });

  restoreProcess.on('error', (error) => {
    console.log(error);
  });

  restoreProcess.on('exit', (code, signal) => {
    if (code) {
      console.log(`Process exit with code: ${code}`);
      exit(mongoose, code);
    } else if (signal) {
      console.log(`Process killed with signal: ${signal}`);
      exit(mongoose, 1);
    } else {
      // check if gZip is enabled
      if (!gZip) {
        // try to remove the backup directory
        try {
          fs.rmSync(extractedPath, { recursive: true });
        } catch {
          // do nothing
        }
      }

      // restore backup complete
      console.log(`Backup restored from ${path.basename(backupPath)} successfully`);
      exit(mongoose, 0);
    }
  });
}

// check if a backup filename was passed into the script
if (process.argv[2] != null && process.argv[2] != '') {
  var backupPath = process.argv[2];

  // check if the backup filename already has a path
  if (!fs.existsSync(`${backupPath}`)) {
    // check if the backup is valid by adding the archive suffix
    if (fs.existsSync(`${backupPath}${archiveSuffix}`)) {
      // the backup file is valid after adding the archive suffix
      backupPath = `${backupPath}${archiveSuffix}`;
    } else {
      // prepend the default backup path
      backupPath = path.join(defaultBackupPath, backupPath);
    }
  }

  // check for the backup file (again)
  if (!fs.existsSync(`${backupPath}`)) {
    // append the default archive suffix
    backupPath = `${backupPath}${archiveSuffix}`;
  }

  // check for the backup file (last time)
  if (fs.existsSync(`${backupPath}`)) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('You are about to delete the current eIquidus database and restore from backup.');

    // prompt for restoring explorer database
    rl.question('Are you sure you want to do this? [y/n]: ', function (restoreAnswer) {
      // stop prompting
      rl.close();

      // determine if the explorer database should be restored
      switch (restoreAnswer) {
        case 'y':
        case 'Y':
        case 'yes':
        case 'YES':
        case 'Yes':
          // check if the "restore backup" process is already running
          if (lib.is_locked([restoreLockName]) == false) {
            // create a new restore lock before checking the rest of the locks to minimize problems with running scripts at the same time
            lib.create_lock(restoreLockName);
            // ensure the lock will be deleted on exit
            lockCreated = true;
            // check all other possible locks since restoring backups should not run at the same time that data is being changed
            if (lib.is_locked(['backup', 'delete', 'index', 'markets', 'peers', 'masternodes']) == false) {
              // all tests passed. OK to run restore
              console.log("Script launched with pid: " + process.pid);

              const settings = require('../lib/settings');

              // check if this is a tar.gz (older explorer backup format)
              if (!backupPath.endsWith(oldArchiveSuffix)) {
                const mongoose = require('mongoose');

                // newer backup format (.bak)
                // delete all collections from existing database
                delete_database(mongoose, settings, function(retVal) {
                  if (retVal) {
                    // move on to the restore process
                    restore_backup(mongoose, settings, backupPath, backupPath, true);
                  }
                });
              } else {
                // older backup format (.tar.gz)
                // check if the tar module is already installed
                check_module_directory_exists('tar', function(retVal) {
                  const tar = require('tar');

                  console.log('Extracting backup files.. Please wait..');

                  // extract the backup archive
                  tar.x({ file: backupPath, cwd: defaultBackupPath, gzip: true }, function() {
                    var extractedPath = path.join(defaultBackupPath, path.basename(backupPath).replace(oldArchiveSuffix, ''));

                    // check if this is a valid backup archive now that the files have been extracted
                    if (fs.existsSync(`${path.join(extractedPath, settings.dbsettings.database)}`)) {
                      const mongoose = require('mongoose');

                      // delete all collections from existing database
                      delete_database(mongoose, settings, function(retVal) {
                        if (retVal) {
                          // move on to the restore process
                          restore_backup(mongoose, settings, backupPath, extractedPath, false);
                        }
                      });
                    } else {
                      // backup file is not a valid mongo database backup
                      // try to remove the backup directory
                      try {
                        fs.rmSync(extractedPath, { recursive: true });
                      } catch {
                        // do nothing
                      } finally {
                        console.log(`${path.basename(backupPath)} is not a valid backup file`);
                        exit(null, 1);
                      }
                    }
                  });
                });
              }
            } else {
              // another script process is currently running
              console.log("Restore aborted");
              exit(null, 2);
            }
          } else {
            // restore process is already running
            console.log("Restore aborted");
            exit(null, 2);
          }

          break;
        default:
          console.log('Process aborted. Nothing was restored.');
          exit(null, 2);
      }
    });
  } else {
    // backup does not exist
    console.log(`${backupPath} cannot be found`);
    exit(null, 2);
  }
} else {
  console.log('No backup file specified');
  exit(null, 2);
}