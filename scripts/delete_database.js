const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function drop_collection(mongoose, colName, cb) {
  // attempt to delete the collection
  mongoose.connection.db.dropCollection(colName, function(err, result) {
    if (err || !result) {
      console.log(`Unable to delete the ${colName} collection`);
      console.log('Aborting');
      process.exit(1);
    } else
      return cb(true);
  });
}

function finished_deleting(mongoose) {
  console.log('Finished deleting database');

  // disconnect from mongo database
  mongoose.disconnect();

  // delete database complete
  process.exit(0);
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
      const settings = require('../lib/settings');
      const mongoose = require('mongoose');
      const dbString = `mongodb://${settings.dbsettings.user}:${settings.dbsettings.password}@${settings.dbsettings.address}:${settings.dbsettings.port}/${settings.dbsettings.database}`;

      console.log('Connecting to database..');

      // connect to mongo database
      mongoose.connect(dbString, function(err) {
        if (err) {
          console.log('Unable to connect to database: %s', dbString);
          console.log('Aborting');
          process.exit(1);
        } else {
          // get the list of collections
          mongoose.connection.db.listCollections().toArray(function (err, collections) {
            if (err) {
              console.log('Unable to list collections in database: %s', err);
              console.log('Aborting');
              process.exit(1);
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
                      finished_deleting(mongoose);
                    }
                  });
                });
              } else {
                // nothing to delete
                console.log('Nothing to delete, the database is already empty..');

                // finish the delete process
                finished_deleting(mongoose);
              }
            }
          });
        }
      });

      break;
    default:
      console.log('Process aborted. Nothing was deleted.');
      process.exit(1);
  }
});