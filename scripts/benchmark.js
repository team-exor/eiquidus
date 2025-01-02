const mongoose = require('mongoose');
const blkSync = require('../lib/block_sync');
const settings = require('../lib/settings');

let dbString = `mongodb://${settings.benchmark.address}:${settings.benchmark.port}/admin`

// prevent stopping of the sync script to be able to gracefully shut down
process.on('SIGINT', () => {
  console.log(`${settings.localization.stopping_sync_process}.. ${settings.localization.please_wait}..`);
  blkSync.setStopSync(true);
});

// prevent killing of the sync script to be able to gracefully shut down
process.on('SIGTERM', () => {
  console.log(`${settings.localization.stopping_sync_process}.. ${settings.localization.please_wait}..`);
  blkSync.setStopSync(true);
});

function exit(exitCode) {
  mongoose.disconnect();
  process.exit(exitCode);
}

function check_user_exists(exists, cb) {
  // check if the user exists
  if (exists) {
    // user already exists
    return cb();
  } else {
    // user does not exist so create it now
    mongoose.connection.client.db(settings.benchmark.database).command({
      createUser: settings.benchmark.user,
      pwd: settings.benchmark.password,
      roles: [
        {
          role: 'readWrite',
          db: settings.benchmark.database
        }
      ]
    })
    .then(() => {
      console.log('User created successfully');  
      return cb();
    })
    .catch((error) => {
      console.error('Error creating new user:', error);
      exit(2);
    });
  }
}

function check_create_user(cb) {
  // check if the benchmark database should be checked for the correct user
  if (settings.benchmark.auto_add_user) {
    // connect to the admin database without a username/password
    mongoose.connect(dbString).then(() => {
      // determine if the user already exists in the target database
      mongoose.connection.db
        .command({
          usersInfo: {
            user: settings.benchmark.user,
            db: settings.benchmark.database
          }
        })
        .then((userInfo) => {
          // check if the user already exists
          check_user_exists(userInfo.users.length > 0, function() {
            // disconnect the current database connection
            mongoose.disconnect().then(() => {
              // finished checking the benchmark database user
              return cb();
            })
            .catch((err) => {
              console.error('Error disconnecting from database:', err);
              exit(2);
            });
          });
        })
        .catch((err) => {
          console.error('Error checking if user exists:', err);
          exit(2);
        });
    })
    .catch((err) => {
      console.log('Error: Unable to connect to database: %s', dbString);
      exit(999);
    });
  } else
    return cb();
}

console.log(`${settings.localization.script_launched}: ${process.pid}`);

mongoose.set('strictQuery', true);

// ensure the benchmark database user exists
check_create_user(function() {
  // update db string to connect to benchmark database
  dbString = 'mongodb://' + encodeURIComponent(settings.benchmark.user);
  dbString = dbString + ':' + encodeURIComponent(settings.benchmark.password);
  dbString = dbString + '@' + settings.benchmark.address;
  dbString = dbString + ':' + settings.benchmark.port;
  dbString = dbString + '/' + settings.benchmark.database;

  // connect to the benchmark database
  mongoose.connect(dbString).then(() => {
    const Tx = require('../models/tx');

    // delete all previous transaction records from the benchmark database
    Tx.deleteMany({}).then(() => {
      const Address = require('../models/address');

      // delete all previous address records from the benchmark database
      Address.deleteMany({}).then(() => {
        // get starting timestamp
        const s_timer = new Date().getTime();

        // start the block sync
        blkSync.update_tx_db(settings.coin.name, 1, settings.benchmark.block_to_sync, 0, settings.sync.update_timeout, false, function() {
          // get ending timestamp
          const e_timer = new Date().getTime();

          // get count of transactions
          Tx.countDocuments({}).then((txcount) => {
            // get count of addresses
            Address.countDocuments({}).then((acount) => {
              // check if the script stopped prematurely
              if (blkSync.getStopSync())
                console.log('Block sync was stopped prematurely');

              // output final benchmark stats
              console.log({
                tx_count: txcount,
                address_count: acount,
                seconds: (e_timer - s_timer) / 1000,
              });
              exit(0);
            });
          });
        });
      });
    });
  }).catch((err) => {
    console.log('Error: Unable to connect to database: %s', dbString);
    exit(999);
  });
});