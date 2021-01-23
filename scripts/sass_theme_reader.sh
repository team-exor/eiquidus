#!/bin/bash

if [ -f ./settings.json ]; then
  echo "\$theme-name: \"$(./node_modules/.bin/strip-json-comments settings.json | ./node_modules/.bin/json shared_pages.theme)\";" > ./public/css/_theme-selector.scss
else
  echo "\$theme-name: \"Exor\";" > ./public/css/_theme-selector.scss
fi