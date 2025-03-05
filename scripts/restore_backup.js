const fs = require('fs');
const path = require('path');
const lib = require('../lib/explorer');
const archiveSuffix = '.bak';
const oldArchiveSuffix = '.tar.gz';
const restoreLockName = 'restore';
const tarModule = 'tar';
const defaultBackupPath = path.join(path.dirname(__dirname), 'backups');
const settings = require('../lib/settings');
let singleCollection = '';
let lockCreated = false;

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

    console.log(`${settings.localization.installing_module.replace('{1}', tarModule)}.. ${settings.localization.please_wait}..`);

    // install tar module
    exec(`npm install ${tarModule}`, (err, stdout, stderr) => {
      // always return true for now without checking results
      return cb(true);
    });
  } else
    return cb(true);
}

function drop_collection(mongoose, colName, cb) {
  // attempt to delete the collection
  mongoose.connection.db.dropCollection(colName).then((result) => {
    if (!result) {
      console.log(`Error: Unable to delete the ${colName} collection`);
      exit(mongoose, 1);
    } else
      return cb(true);
  }).catch((err) => {
    console.log(err);
    exit(mongoose, 1);
  });
}

function delete_database(mongoose, cb) {
  // check if a single collection is being restored
  if (singleCollection != null && singleCollection == '') {
    // get the list of collections
    mongoose.connection.db.listCollections().toArray().then((collections) => {
      // check if there are any collections
      if (collections.length > 0) {
        let counter = 0;

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
    }).catch((err) => {
      console.log(err);
      return cb(true);
    });
  } else {
    // do not delete any collections since mongorestore will drop the collection automatically
    return cb(true);
  }
}

function restore_backup(mongoose, backupPath, extractedPath, gZip) {
  const { exec } = require('child_process');

  console.log(`${settings.localization.restoring_backup}.. ${settings.localization.please_wait}..`);

  // restore mongo database from backup
  const restoreProcess = exec(`mongorestore --host="${settings.dbsettings.address}" --port="${settings.dbsettings.port}" --username="${settings.dbsettings.user}" --password="${settings.dbsettings.password}" --authenticationDatabase="${settings.dbsettings.database}" ${(gZip ? `--gzip --archive="${backupPath}"` : `"${extractedPath}"`)}${singleCollection == null || singleCollection == '' ? '' : ` --drop --db explorerdb --collection ${singleCollection}`}`);

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

function delete_prompt(cb) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // check if a single collection is being restored
  if (singleCollection != null && singleCollection != '')
    console.log(`You are about to delete and restore the "${singleCollection}" collection from backup.`);
  else
    console.log('You are about to delete the current eIquidus database and restore from backup.');

  // prompt for restoring explorer database
  rl.question(`${settings.localization.are_you_sure}: `, function (restoreAnswer) {
    // stop prompting
    rl.close();

    // return the answer
    return cb(restoreAnswer);
  });
}

// verify that the collection exists
function verify_collection_exists(mongoose, cb) {
  const dbString = `mongodb://${encodeURIComponent(settings.dbsettings.user)}:${encodeURIComponent(settings.dbsettings.password)}@${settings.dbsettings.address}:${settings.dbsettings.port}/${settings.dbsettings.database}`;

  console.log('Connecting to database..');

  mongoose.set('strictQuery', true);

  // connect to mongo database
  mongoose.connect(dbString).then(() => {
    // check if the restore will be for a single collection
    if (singleCollection != null && singleCollection != '') {
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
    } else
      return cb(false);
  }).catch((err) => {
    console.log('Error: Unable to connect to database: %s', err);
    exit(999);
    return cb(true);
  });
}

// check if a backup filename was passed into the script
if (process.argv[2] != null && process.argv[2] != '') {
  let backupPath = process.argv[2];

  // check if a collection name was passed into the script
  if (process.argv[3] != null && process.argv[3] != '') {
    // save the collection name to a variable for later use
    singleCollection = process.argv[3];
  }

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
    const mongoose = require('mongoose');

    // check if the collection name exists
    verify_collection_exists(mongoose, function(collection_error) {
      // check if there was an error finding the collection by name
      if (!collection_error) {
        // prompt for deleting and restoring the database
        delete_prompt(function(restoreAnswer) {
          // determine if the explorer database should be restored
          switch ((restoreAnswer == null ? '' : restoreAnswer).toLowerCase()) {
            case settings.localization.short_yes:
            case settings.localization.long_yes:
              // check if the "restore backup" process is already running
              if (lib.is_locked([restoreLockName]) == false) {
                // create a new restore lock before checking the rest of the locks to minimize problems with running scripts at the same time
                lib.create_lock(restoreLockName);

                // ensure the lock will be deleted on exit
                lockCreated = true;

                // check all other possible locks since restoring backups should not run at the same time that data is being changed
                if (lib.is_locked(['backup', 'delete', 'index', 'markets', 'peers', 'masternodes', 'plugin']) == false) {
                  // all tests passed. OK to run restore
                  console.log(`${settings.localization.script_launched }: ${process.pid}`);

                  // check if this is a tar.gz (older explorer backup format)
                  if (!backupPath.endsWith(oldArchiveSuffix)) {
                    const mongoose = require('mongoose');

                    // newer backup format (.bak)
                    // delete all collections from existing database
                    delete_database(mongoose, function(retVal) {
                      if (retVal) {
                        // move on to the restore process
                        restore_backup(mongoose, backupPath, backupPath, true);
                      }
                    });
                  } else {
                    // older backup format (.tar.gz)
                    // check if the tar module is already installed
                    check_module_directory_exists(tarModule, function(retVal) {
                      const tar = require(tarModule);

                      console.log(`${settings.localization.extracting_backup_files}.. ${settings.localization.please_wait}..`);

                      // extract the backup archive
                      tar.x({ file: backupPath, cwd: defaultBackupPath, gzip: true }, function() {
                        var extractedPath = path.join(defaultBackupPath, path.basename(backupPath).replace(oldArchiveSuffix, ''));

                        // check if this is a valid backup archive now that the files have been extracted
                        if (fs.existsSync(`${path.join(extractedPath, settings.dbsettings.database)}`)) {
                          // delete all collections from existing database
                          delete_database(mongoose, function(retVal) {
                            if (retVal) {
                              // move on to the restore process
                              restore_backup(mongoose, backupPath, extractedPath, false);
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
                            exit(mongoose, 1);
                          }
                        }
                      });
                    });
                  }
                } else {
                  // another script process is currently running
                  console.log("Restore aborted");
                  exit(mongoose, 2);
                }
              } else {
                // restore process is already running
                console.log("Restore aborted");
                exit(mongoose, 2);
              }

              break;
            default:
              console.log(`${settings.localization.process_aborted}. ${settings.localization.nothing_was_restored}.`);
              exit(mongoose, 2);
          }
        });
      } else {
        // the collection does not exist
        console.log(`Collection "${singleCollection}" does not exist`);
        exit(mongoose, 2);
      }
    });
  } else {
    // backup does not exist
    console.log(settings.localization.path_cannot_be_found.replace('{1}', backupPath));
    exit(null, 2);
  }
} else {
  console.log('No backup file specified');
  exit(null, 2);
}