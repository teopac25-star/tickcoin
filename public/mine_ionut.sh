#!/bin/bash

# Ionut Mining Script
# This simulates CPU mining for Ionut using proof-of-work.
# It uses CPU power to find nonces that meet the difficulty target.

echo "Starting Ionut Mining..."
echo "Press Ctrl+C to stop."
echo "Mining rate: Variable, depends on CPU power (simulated proof-of-work)"

mined=0  # in cents, 1 = 0.01 IONUT
start_time=$(date +%s)
nonce=0
block_data="Ionut Block Data"

# Difficulty target (higher number = easier, lower = harder)
target="0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

while true; do
  # Create data to hash: block_data + nonce
  data="${block_data}${nonce}"
  
  # Compute SHA-256 hash
  hash=$(echo -n "$data" | openssl dgst -sha256 | cut -d' ' -f2)
  
  # Check if hash meets target (starts with enough zeros)
  if [[ "$hash" < "$target" ]]; then
    mined=$((mined + 1))  # add 1 cent = 0.01 IONUT
    echo "Block mined! Nonce: $nonce, Hash: $hash"
    echo "Total IONUT mined: $((mined / 100)).$((mined % 100))"
  fi

  # Increment nonce
  nonce=$((nonce + 1))

  # Show progress every 1000 attempts
  if (( nonce % 1000 == 0 )); then
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    echo "Mining for $elapsed seconds... Attempts: $nonce, Total IONUT: $((mined / 100)).$((mined % 100))"
  fi
done