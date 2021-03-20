#!/bin/bash

ARCHIVE_SUFFIX=".tar.gz"

# Check if a backup file was specified
if [ -n "${1}" ]; then
  BACKUP_PATH="${1}"
  # Check if the backup file exists as a full path
  if [ ! -f "${BACKUP_PATH}" ]; then
    # Check if the backup is valid by adding the archive suffix
    if [ -f "${BACKUP_PATH}${ARCHIVE_SUFFIX}" ]; then
      # The backup file is valid after adding the archive suffix
      BACKUP_PATH="${BACKUP_PATH}${ARCHIVE_SUFFIX}"
    else
      # Prepend the default backup path
      BACKUP_PATH="$(dirname $(dirname $(readlink -f "$0")))/backups/${BACKUP_PATH}"
    fi
  fi
  # Check for the backup file (again)
  if [ ! -f "${BACKUP_PATH}" ]; then
    # Append the default archive suffix
    BACKUP_PATH="${BACKUP_PATH}${ARCHIVE_SUFFIX}"
  fi
  # Check for the backup file (last time)
  if [ -f "${BACKUP_PATH}" ]; then
    # Extract the backup archive
    DIR_NAME=$(dirname "${BACKUP_PATH}")
    tar -zxvf "${BACKUP_PATH}" -C "${DIR_NAME}"
    # Check if this is a valid backup archive now that the files have been extracted
    if [ -d ${BACKUP_PATH%"${ARCHIVE_SUFFIX}"}/explorerdb ]; then
      BACKUP_DIR=${BACKUP_PATH%"${ARCHIVE_SUFFIX}"}
      # Erase entire database
sudo mongo <<EOF
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
      # Restore mongo database from the backup directory
      eval "mongorestore -d explorerdb ${BACKUP_DIR}/explorerdb"
      # Remove the backup directory
      rm -rf "${BACKUP_DIR}"
      # Finished msg
      echo "Backup restored from ${BACKUP_PATH} successfully."
    else
      # Backup file is not a valid mongo database backup
      echo "${BACKUP_PATH} is not a valid backup file."
    fi
  else
    # Backup does not exist
    echo "${BACKUP_PATH} cannot be found."
  fi
else
  echo "no backup file specified."
fi