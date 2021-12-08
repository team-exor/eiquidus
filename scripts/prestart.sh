#!/bin/bash

readonly MIN_NODE_VERSION_MAJOR="14"
readonly MIN_NODE_VERSION_MINOR="13"
readonly MIN_NODE_VERSION_REVISION="1"
readonly NONE="\033[00m"
readonly RED="\033[01;31m"

begins_with() { case $2 in "$1"*) true;; *) false;; esac; }
error_message() { echo "${RED}Error:${NONE} $1" && echo && exit 1; }

# Get the nodejs version
NODE_VERSION="$(node -v)"
NODE_VERSION_MAJOR="0"
NODE_VERSION_MINOR="0"
NODE_VERSION_REVISION="0"

# Check if the nodejs version # is blank or a very long string as that would usually indicate a problem
if [ "${#NODE_VERSION}" -gt 0 ] && [ "${#NODE_VERSION}" -lt 16 ]; then
  # Remove the 'v' from the beginning of the version string
  if begins_with "v" "${NODE_VERSION}"; then
    NODE_VERSION=$(echo "${NODE_VERSION}" | cut -c2-${#NODE_VERSION})
  fi

  # Split node version string into major, minor and revision
  NODE_VERSION_MAJOR="$(echo $NODE_VERSION | cut -d'.' -f1)"
  NODE_VERSION_MINOR="$(echo $NODE_VERSION | cut -d'.' -f2)"
  NODE_VERSION_REVISION="$(echo $NODE_VERSION | cut -d'.' -f3)"
fi

# Check if the installed nodejs is an older version than supported by the explorer
if !([ "${NODE_VERSION_MAJOR}" -gt "${MIN_NODE_VERSION_MAJOR}" ] || ([ "${NODE_VERSION_MAJOR}" -eq "${MIN_NODE_VERSION_MAJOR}" ] && ([ "${NODE_VERSION_MINOR}" -gt "${MIN_NODE_VERSION_MINOR}" ] || ([ "${NODE_VERSION_MINOR}" -eq "${MIN_NODE_VERSION_MINOR}" ] && [ "${NODE_VERSION_REVISION}" -ge "${MIN_NODE_VERSION_REVISION}" ])))); then
  error_message "Please install an updated version of nodejs.\n\nInstalled: $NODE_VERSION\nRequired:  $MIN_NODE_VERSION_MAJOR.$MIN_NODE_VERSION_MINOR.$MIN_NODE_VERSION_REVISION"
fi

## Check if new module directory exists
#if [ ! -d ./node_modules/change_to_module_dir_name ]; then
#  # Install updated packages
#  npm update
#fi

# Check if an argument was passed into this script
if [ -n "${1}" ]; then
  # Determine which argument was passed
  case "${1}" in
    "pm2")
      # Check if pm2 is installed
      if [ -z "$(which pm2)" ]; then
        # Install pm2
        npm install pm2@latest -g
      fi
    ;;
    "forever")
      # Check if forever is installed
      if [ -z "$(which forever)" ]; then
        # Install forever
        npm install forever -g
      fi
    ;;
  esac
fi

# Ensure that selected theme is properly installed
sh ./scripts/sass_theme_reader.sh

# Run sass module to generate minified css from scss file
./node_modules/.bin/sass --no-source-map --style=compressed ./public/css/style.scss ./public/css/style.min.css