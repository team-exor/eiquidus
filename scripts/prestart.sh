#!/bin/bash

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