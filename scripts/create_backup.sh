#!/bin/bash

ends_with() { case $2 in *"$1") true;; *) false;; esac; }
BACKUP_PATH="$(dirname $(dirname $(readlink -f "$0")))/backups"
ARCHIVE_SUFFIX=".tar.gz"

if [ -n "${1}" ]; then
  # use the backup filename passed into this script
  BACKUP_FILENAME="${1}"
else
  # no backup filename passed in, use todays date as the backup filename
  BACKUP_FILENAME=$(date +"%Y-%b-%d")
fi

if ends_with "${ARCHIVE_SUFFIX}" "${BACKUP_FILENAME}"; then
  # remove the archive suffix from the backup filename
  BACKUP_FILENAME=${BACKUP_FILENAME%"${ARCHIVE_SUFFIX}"}
fi

if [ $(dirname "${BACKUP_FILENAME}") != "." ]; then
  # The backup filename is a full path
  # Split out the path and filename
  BACKUP_DIR="$(dirname ${BACKUP_FILENAME})"
  TEMP_FILENAME=${BACKUP_FILENAME#"${BACKUP_DIR}/"}
  BACKUP_PATH=${BACKUP_FILENAME%"/${TEMP_FILENAME}"}
  BACKUP_FILENAME="${TEMP_FILENAME}"
fi

if [ ! -f "${BACKUP_PATH}/${BACKUP_FILENAME}${ARCHIVE_SUFFIX}" ]; then
  # execute backup
  eval "mongodump -d explorerdb -o ${BACKUP_PATH}/${BACKUP_FILENAME}"
  # archive the backup
  cd "${BACKUP_PATH}" && tar -cvzf "${BACKUP_PATH}/${BACKUP_FILENAME}${ARCHIVE_SUFFIX}" "${BACKUP_FILENAME}"
  # delete the uncompressed backup directory
  rm -rf "${BACKUP_PATH}/${BACKUP_FILENAME}"
  # finished msg
  echo "Backup saved successfully to ${BACKUP_PATH}/${BACKUP_FILENAME}${ARCHIVE_SUFFIX}."
else
  # backup already exists
  echo "A backup named ${BACKUP_FILENAME}${ARCHIVE_SUFFIX} already exists."
fi