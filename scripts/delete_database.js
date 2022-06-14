const lib = require('../lib/explorer');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const deleteLockName = 'delete';
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

  // only remove delete lock if it was created in this session
  if (!lockCreated || lib.remove_lock(deleteLockName) == true) {
    // clean exit with previous exit code
    process.exit(exitCode);
  } else {
    // error removing lock
    process.exit(1);
  }  
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

console.log('You are about to delete the entire eIquidus database.');

// prompt for deleting explorer database
rl.question('Are you sure you want to do this? [y/n]: ', function (deleteAnswer) {
  // stop prompting
  rl.close();

  // determine if the explorer database should be deleted
  switch (deleteAnswer) {
    case 'y':
    case 'Y':
    case 'yes':
    case 'YES':
    case 'Yes':
      // check if the "delete database" process is already running
      if (lib.is_locked([deleteLockName]) == false) {
        // create a new delete lock before checking the rest of the locks to minimize problems with running scripts at the same time
        lib.create_lock(deleteLockName);
        // ensure the lock will be deleted on exit
        lockCreated = true;
        // check all other possible locks since database deletion should not run at the same time that data is being changed
        if (lib.is_locked(['backup', 'restore', 'index', 'markets', 'peers', 'masternodes']) == false) {
          // all tests passed. OK to run delete
          console.log("Script launched with pid: " + process.pid);

          const settings = require('../lib/settings');
          const mongoose = require('mongoose');
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
                          // finish the delete process
                          console.log('Finished deleting database');
                          exit(mongoose, 0);
                        }
                      });
                    });
                  } else {
                    // nothing to delete
                    console.log('Nothing to delete, the database is already empty..');

                    // finish the delete process
                    exit(mongoose, 0);
                  }
                }
              });
            }
          });
        } else {
          // another script process is currently running
          console.log("Delete aborted");
          exit(null, 2);
        }
      } else {
        // delete process is already running
        console.log("Delete aborted");
        exit(null, 2);
      }

      break;
    default:
      console.log('Process aborted. Nothing was deleted.');
      exit(null, 2);
  }
});