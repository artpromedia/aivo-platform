#!/bin/bash
set -eu

SRC=aivo-prod
DST=aivo-staging

echo "Copying secrets from $SRC to $DST..."

for secret in $(kubectl get secrets -n "$SRC" --no-headers -o custom-columns=NAME:.metadata.name); do
  echo "  Copying $secret..."
  kubectl get secret "$secret" -n "$SRC" -o yaml \
    | sed "s/namespace: $SRC/namespace: $DST/" \
    | kubectl apply -n "$DST" -f - 2>&1 || true
done

echo ""
echo "Done. Secrets in $DST:"
kubectl get secrets -n "$DST" --no-headers
