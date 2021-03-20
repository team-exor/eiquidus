#!/bin/bash

# Find the absolute path to this script file
SCRIPT_PATH=`dirname "$0"`
SCRIPT_PATH=`( cd "$SCRIPT_PATH" && pwd )`
# Remove temp file if it exists from last time
if [ -f "${SCRIPT_PATH}/del.tmp" ]; then
  rm -f "${SCRIPT_PATH}/del.tmp"
fi
# Prompt for deleting database
echo "You are about to delete the entire eIquidus database."
echo "Are you sure you want to do this? [y/n]: ";
read -p "" DELETE_ANSWER
# Determine if the database should be deleted
case "$DELETE_ANSWER" in
  y|Y|yes|Yes|YES) ;;
  *) echo "Process aborted. Nothing was deleted." && exit ;;
esac
# Erase entire database
sudo touch "${SCRIPT_PATH}/del.tmp" && mongo <<EOF
use explorerdb
db.addresses.drop()
db.addresstxes.drop()
db.coinstats.drop()
db.heavies.drop()
db.markets.drop()
db.masternodes.drop()
db.peers.drop()
db.richlists.drop()
db.txes.drop()
exit
EOF
# Check if the temp file exists to determine if the delete was successful or not
if [ -f "${SCRIPT_PATH}/del.tmp" ]; then
  rm -f "${SCRIPT_PATH}/del.tmp"
  echo "Finished deleting database."
else
  echo "Process aborted. Nothing was deleted."
fi