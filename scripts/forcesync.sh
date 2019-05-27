#!/bin/sh
# this super hack will sync the explorer within the specified block height range
forcesync() {
  blockcount=$1
  echo "╒══════════════════<<"
  echo "| height : $blockcount"
  blockhash=`curl -s https://explorer.exor.io/api/getblockhash?height=$blockcount`
  echo "| ଓ hash : $blockhash"
  curl -s https://explorer.exor.io/block/$blockhash > /dev/null
  echo "╘═══════════════════════════════>>"
}

main() {
  if [ $currentblockcount -ne $endingblockcount ]; then
    forcesync $currentblockcount
    currentblockcount=$((currentblockcount + 1))
  else exit;  fi
  main
}

startingblockcount=1213133
endingblockcount=1213143
echo "Syncing..."
currentblockcount=$startingblockcount
main
