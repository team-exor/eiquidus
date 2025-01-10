const mongoose = require('mongoose');
const Address = require('../models/address');
const Tx = require('../models/tx');
const blkSync = require('../lib/block_sync');
const settings = require('../lib/settings');
const resumeSync = process.argv[2] == '1';

let dbString = `mongodb://${settings.benchmark.address}:${settings.benchmark.port}/admin`

// prevent stopping of the sync script to be able to gracefully shut down
process.on('SIGINT', () => {
  if (!blkSync.getStackSizeErrorId())
    console.log(`${settings.localization.stopping_sync_process}.. ${settings.localization.please_wait}..`);

  blkSync.setStopSync(true);
});

// prevent killing of the sync script to be able to gracefully shut down
process.on('SIGTERM', () => {
  if (!blkSync.getStackSizeErrorId())
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

function initialize_data_startup(cb) {
  console.log(`${settings.localization.initializing_database}.. ${settings.localization.please_wait}..`);

  const db = require('../lib/database');

  // check if stats collection is initialized
  db.check_stats(settings.coin.name, function(stats_exists) {
    let skip = true;

    // determine if stats collection already exists
    if (stats_exists == false) {
      console.log(`${settings.localization.creating_initial_entry.replace('{1}', 'stats')}.. ${settings.localization.please_wait}..`);
      skip = false;
    }

    // initialize the stats collection
    db.create_stats(settings.coin.name, skip, function() {
      // get the stats object from the database
      db.get_stats(settings.coin.name, function(stats) {
        // finished initializing startup data
        console.log('Database initialization complete');
        return cb(stats);
      });
    });
  });
}

function delete_txes(cb) {
  // check if the benchmark sync is being resumed
  if (resumeSync) {
    // do not delete the list of txes for a resume sync
    return cb();
  } else {
    // delete all previous transaction records from the benchmark database
    Tx.deleteMany({}).then(() => {
      return cb();
    });
  }
}

function delete_addresses(cb) {
  // check if the benchmark sync is being resumed
  if (resumeSync) {
    // do not delete the list of addresses for a resume sync
    return cb();
  } else {
    // delete all previous address records from the benchmark database
    Address.deleteMany({}).then(() => {
      return cb();
    });
  }
}

function delete_stats(cb) {
  // check if the benchmark sync is being resumed
  if (resumeSync) {
    // do not delete the database stats for a resume sync
    return cb();
  } else {
    const Stats = require('../models/stats');

    // delete all previous stat records from the benchmark database
    Stats.deleteMany({}).then(() => {
      return cb();
    });
  }
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
    // delete all previous transaction records from the benchmark database
    delete_txes(function() {
      // delete all previous address records from the benchmark database
      delete_addresses(function() {
        // delete all previous stat records from the benchmark database
        delete_stats(function() {
          // initialize the benchmark database
          initialize_data_startup(function(stats) {
            // get the last synced block index value
            const last = (stats.last ? stats.last : 0);

            // get starting timestamp
            const s_timer = new Date().getTime();

            // start the block sync
            blkSync.update_tx_db(settings.coin.name, last, settings.benchmark.block_to_sync, stats.txes, settings.sync.update_timeout, false, function() {
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

                  // check if the sync needed to be resumed
                  if (resumeSync) {
                    // output a warning msg
                    console.log(`\n${settings.localization.ex_warning}: The sync ran out of memory during processing and therefore the run time was affected. It is recommended to re-run the benchmark again using a larger stack size such as 25000 or higher with the cmd "node --stack-size=25000 scripts/benchmark.js" to help ensure an accurate benchmark time.`);
                  }

                  exit(0);
                });
              });
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