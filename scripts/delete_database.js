const lib = require('../lib/explorer');
const readline = require('readline');
const deleteLockName = 'delete';
const settings = require('../lib/settings');
let lockCreated = false;
let preserveClaimAddressNames = false;

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

function delete_prompt(cb) {
  preserve_claimaddress_prompt(function() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Change the delete prompt based on whether this is a reindex or regular delete
    if (process.argv[2] != null && process.argv[2] == 'reindex') {
      console.log('You are about to delete all data from the entire eIquidus database');

      if (preserveClaimAddressNames)
        console.log('(claim address name data will not be deleted)');

      console.log('and resync from the genesis block.');
    } else {
      console.log('You are about to delete all data from the entire eIquidus database.');

      if (preserveClaimAddressNames)
        console.log('(claim address name data will not be deleted)');
    }

    // prompt for deleting explorer database
    rl.question(`${settings.localization.are_you_sure}: `, function (deleteAnswer) {
      // stop prompting
      rl.close();

      // determine if the explorer database should be deleted
      switch ((deleteAnswer == null ? '' : deleteAnswer).toLowerCase()) {
        case settings.localization.short_yes:
        case settings.localization.long_yes:
          return cb(true);
          break;
        default:
          return cb(false);
      }
    });
  });
}

function preserve_claimaddress_prompt(cb) {
  const ClaimAddress = require('../models/claimaddress');

  // check how many claim address records there are
  ClaimAddress.find({}).countDocuments().then((count) => {
    // display an additional prompt in the event the claimaddress collection has data
    if (count > 0) {
      console.log(`The current database has ${count} custom claim address names`);
      console.log('Would you like to preserve this data?');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      // prompt for deleting claim address data
      rl.question('y = keep claim address data, n = delete claim address data [y/n]: ', function (preserveClaimAddresses) {
        // stop prompting
        rl.close();

        // determine if the claim address data should be preserved
        switch (preserveClaimAddresses) {
          case 'y':
          case 'Y':
          case 'yes':
          case 'YES':
          case 'Yes':
            preserveClaimAddressNames = true;
            console.log('Claim address name data will be saved' + '\n');
            break;
          default:
            console.log('Claim address name data will be deleted' + '\n');
        }

        return cb();
      });
    } else
      return cb();
  });
}

// check if the "delete database" process is already running
if (lib.is_locked([deleteLockName]) == false) {
  // create a new delete lock before checking the rest of the locks to minimize problems with running scripts at the same time
  lib.create_lock(deleteLockName);
  // ensure the lock will be deleted on exit
  lockCreated = true;

  var lock_list = ['backup', 'restore', 'markets', 'peers', 'masternodes', 'plugin'];

  // do not check the index lock if this is called from the reindex process
  if (process.argv[2] == null || process.argv[2] != 'reindex') {
    lock_list.push('index');
  }

  // check all other possible locks since database deletion should not run at the same time that data is being changed
  if (lib.is_locked(lock_list) == false) {
    // all tests passed. OK to run delete

    // suppress the pid message when doing a reindex
    if (process.argv[2] == null || process.argv[2] != 'reindex')
      console.log(`${settings.localization.script_launched }: ${process.pid}`);

    const mongoose = require('mongoose');
    const dbString = `mongodb://${encodeURIComponent(settings.dbsettings.user)}:${encodeURIComponent(settings.dbsettings.password)}@${settings.dbsettings.address}:${settings.dbsettings.port}/${settings.dbsettings.database}`;

    console.log('Connecting to database..');

    mongoose.set('strictQuery', true);

    // connect to mongo database
    mongoose.connect(dbString).then(() => {
      console.log('Database connection successful' + '\n');

      // prompt for database delete
      delete_prompt(function(continue_process) {
        if (continue_process) {
          // get the list of collections
          mongoose.connection.db.listCollections().toArray().then((collections) => {
            // check if there are any collections
            if (collections.length > 0) {
              var counter = 0;

              // loop through all collections
              collections.forEach((collection) => {
                // check if this is the claim addres collection and that data is being preserved
                if (!preserveClaimAddressNames || collection.name != 'claimaddresses') {
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
                } else {
                  // skipped deleting of the claimaddresses collection
                  counter++;

                  // check if the last collection was deleted
                  if (counter == collections.length) {
                    // finish the delete process
                    console.log('Finished deleting database');
                    exit(mongoose, 0);
                  }
                }
              });
            } else {
              // nothing to delete
              console.log('Nothing to delete, the database is already empty..');

              // finish the delete process
              exit(mongoose, 0);
            }
          }).catch((err) => {
            console.log('Error: Unable to list collections in database: %s', err);
            exit(mongoose, 1);
          });
        } else {
          console.log(`${settings.localization.process_aborted}. ${settings.localization.nothing_was_deleted}.`);
          exit(null, 2);
        }
      });
    }).catch((err) => {
      console.log('Error: Unable to connect to database: %s', err);
      exit(mongoose, 999);
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