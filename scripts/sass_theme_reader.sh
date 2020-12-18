#!/bin/bash

echo "\$theme-name: \"$(./node_modules/.bin/strip-json-comments settings.json | ./node_modules/.bin/json theme)\";" > ./public/css/_theme-selector.scss
