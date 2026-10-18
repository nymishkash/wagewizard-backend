#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-$(git rev-parse HEAD)}"
IMAGE="ghcr.io/nymishkash/wagewizard-backend:$TAG"

if [ ! -f .env ]; then
  echo ".env not found, copy .env.example and fill it in"
  exit 1
fi

if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
  docker pull "$IMAGE"
fi
kind load docker-image "$IMAGE" --name wagewizard

kubectl create secret generic wagewizard-secrets \
  --from-env-file=<(grep -E '^(DB_PASSWORD|JWT_SECRET|OPENAI_KEY)=' .env) \
  --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install wagewizard chart/wagewizard \
  --set image.tag="$TAG" \
  --force-conflicts --wait --timeout 3m

kubectl get pods -l app=wagewizard-api
curl -s http://wagewizard.localhost/version
echo
