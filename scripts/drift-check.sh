#!/usr/bin/env bash
set -uo pipefail

helm get values wagewizard -o yaml > /tmp/wagewizard-values.yaml
helm template wagewizard chart/wagewizard -f /tmp/wagewizard-values.yaml | kubectl diff -f -
if [ $? -eq 0 ]; then
  echo "no drift"
fi
