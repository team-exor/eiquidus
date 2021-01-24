#!/bin/bash
readonly EXPLORER_PATH=$(dirname $(dirname $(readlink -f "$0")))
NODE_PATH=""
MODE=""
# Check if parameters were passed into the script
if [ -n "${1}" ]; then
  # At least one parameter has been passed in
  case ${1} in
    "update")
      # Index update
      MODE="index update"
      ;;
    "check")
      # Index check
      MODE="index check"
      ;;
    "reindex")
      # Index reindex
      MODE="index reindex"
      ;;
    "reindex-rich")
      # Index reindex-rich
      MODE="index reindex-rich"
      ;;
    "reindex-txcount")
      # Index reindex-txcount
      MODE="index reindex-txcount"
      ;;
    "reindex-last")
      # Index reindex-last
      MODE="index reindex-last"
      ;;
    "market")
      # Market update
      MODE="market"
      ;;
    "peers")
      # Peers update
      MODE="peers"
      ;;
    "masternodes")
      # Masternodes update
      MODE="masternodes"
      ;;
    *)
      # Check if this is a file that exists on the filesystem
      if [ -f ${1} ]; then
        # The file exists. Assume this is the path to node
        NODE_PATH="${1}"
      fi
      ;;
  esac
  # Check if the mode is already set
  if [ -z "${MODE}" ]; then
    # Mode is not set so check if the next parameter exists
    if [ -n "${2}" ]; then
      # Determine which mode this last parameter is
      case ${2} in
        "update")
          # Index update
          MODE="index update"
          ;;
        "check")
          # Index check
          MODE="index check"
          ;;
        "reindex")
          # Index reindex
          MODE="index reindex"
          ;;
        "reindex-rich")
          # Index reindex-rich
          MODE="index reindex-rich"
          ;;
        "reindex-txcount")
          # Index reindex-txcount
          MODE="index reindex-txcount"
          ;;
        "reindex-last")
          # Index reindex-last
          MODE="index reindex-last"
          ;;
        "market")
          # Market update
          MODE="market"
          ;;
        "peers")
          # Peers update
          MODE="peers"
          ;;
        "masternodes")
          # Masternodes update
          MODE="masternodes"
          ;;
      esac
    elif [ -n "${NODE_PATH}" ]; then
      # Node path was specified but no mode, so default to 'index update' mode 
      MODE="index update"
    fi
  fi
else
  # No parameters specified so default to 'index update' mode
  MODE="index update"
fi
# Check if the mode is set
if [ -n "${MODE}" ]; then
  # Mode is set
  # Check if the desired mode requires a lock
  if [ "${MODE}" != "peers" ] && [ "${MODE}" != "masternodes" ]; then
    # A lock is required
    # Check if the script is already running (tmp/index.pid file already exists)
    if [ -f "${EXPLORER_PATH}/tmp/index.pid" ]; then
      # The tmp/index.pid file exists. Check if the process is actually still running
      ps -p `cat ${EXPLORER_PATH}/tmp/index.pid` > /dev/null
      if [ $? -eq 0 ]; then
        # Script is running so the data is locked and we must exit now and try again later
        echo "Script already running.."
        exit 1
      else
        # Script is not actually running so we can delete the lock file
        rm "${EXPLORER_PATH}/tmp/index.pid"
      fi
    fi
  fi
  # Check if the node path was specified
  if [ -z "${NODE_PATH}" ]; then
    # Node path not specified so lookup using the 'which' cmd
    eval "cd ${EXPLORER_PATH} && $(which node) scripts/sync.js ${MODE}"
  else
    # Node path specified
    eval "cd ${EXPLORER_PATH} && ${NODE_PATH} scripts/sync.js ${MODE}"
  fi
else
  # Mode not set so load the sync script without specifying the mode to return the usage options 
  eval "cd ${EXPLORER_PATH} && $(which node) scripts/sync.js"
fi