#!/bin/bash
EXPLORER_PATH=$(dirname $(dirname $(readlink -f "$0")))
if [ -f "${EXPLORER_PATH}/tmp/index.pid" ];
then
    ps -p `cat ${EXPLORER_PATH}/tmp/index.pid` > /dev/null
        if [ $? -eq 0 ]; then
                exit 1
        else
                rm "${EXPLORER_PATH}/tmp/index.pid"
        fi
fi
if [ -z "${1}" ]; then
	eval "cd ${EXPLORER_PATH} && $(which node) scripts/sync.js index update"
else
	eval "cd ${EXPLORER_PATH} && ${1} scripts/sync.js index update"
fi