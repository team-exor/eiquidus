#!/bin/bash

## Check if new module directory exists
#if [ ! -d ./node_modules/change_to_module_dir_name ]; then
#  # Install updated packages
#  npm update
#fi

# Ensure that selected theme is properly installed
sh ./scripts/sass_theme_reader.sh

# Run sass module to generate minified css from scss file
./node_modules/.bin/sass --no-source-map --style=compressed ./public/css/style.scss ./public/css/style.min.css