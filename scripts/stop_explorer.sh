#!/bin/bash

validate_port() {
  if [ -z "$1" ] || ([ -n "$1" ] && ((echo $1 | egrep -q '^[0-9]+$' && ([ $1 -lt 1 ] || [ $1 -gt 65535 ])) || ! test "$1" -gt 0 2> /dev/null)); then
    echo "err"
  fi
}

# Check if the settings.json file exists
if [ -f ./settings.json ]; then
  # Read the webserver.port value from settings.json file
  readonly SERVER_PORT="$(./node_modules/.bin/strip-json-comments settings.json | ./node_modules/.bin/json -q webserver.port)"
  # Check if the webserver.port value is a valid port #
  if [ -z "$(validate_port $SERVER_PORT)" ]; then
    # Check if the server is currently running
    if  [ -n "$(lsof -t -i:${SERVER_PORT} 2> /dev/null)" ]; then
      # Send a SIGINT kill signal to the process that is currently using the explorer's server port
      kill -2 $(lsof -t -i:${SERVER_PORT})
      # Show shutdown msg
      echo "Explorer shutting down... Please wait..."
    else
      # Webserver is not running
      echo "Error: Cannot stop explorer because it is not currently running"
    fi
  else
    # Invalid port number
    echo "Error: webserver.port value not found in settings.json. webserver.port value is missing or file is not valid json."
  fi
else
  # Missing settings file
  echo "Error: Cannot find settings.json"
fi