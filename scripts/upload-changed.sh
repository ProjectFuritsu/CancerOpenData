#!/usr/bin/env bash
# Uploads only the JSON files in data/ whose content differs from the bucket.
# Works with AWS S3 and with S3-compatible storage like Cloudflare R2.
#
#   BUCKET            bucket name (required)
#   S3_ENDPOINT_URL   custom endpoint, e.g. https://<account>.r2.cloudflarestorage.com
#                     (leave empty for AWS S3)
#   TARGET_NAME       label for logs, e.g. "S3" or "R2"
#
# Compares the local MD5 with the bucket's ETag (single-part uploads, so ETag = MD5).
# Each upload is tagged with the Git commit. It never deletes anything.
set -euo pipefail

: "${BUCKET:?BUCKET is not set}"
SHA="${GITHUB_SHA:-local}"
TARGET="${TARGET_NAME:-S3}"
CACHE="public, max-age=300"
ENDPOINT_ARGS=()
if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
  ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT_URL")
fi
uploaded=0
same=0

while IFS= read -r -d '' file; do
  key="${file#data/}"
  local_md5=$(md5sum "$file" | cut -d' ' -f1)
  remote_etag=$(aws s3api head-object "${ENDPOINT_ARGS[@]}" --bucket "$BUCKET" --key "$key" \
    --query ETag --output text 2>/dev/null | tr -d '"' || true)

  if [[ "$local_md5" == "$remote_etag" ]]; then
    same=$((same + 1))
    continue
  fi

  echo "Uploading $key"
  aws s3 cp "${ENDPOINT_ARGS[@]}" "$file" "s3://$BUCKET/$key" \
    --content-type "application/json" \
    --cache-control "$CACHE" \
    --metadata "git-sha=$SHA" \
    --only-show-errors
  uploaded=$((uploaded + 1))
done < <(find data -type f -name '*.json' -print0 | sort -z)

echo "Done ($TARGET): $uploaded uploaded, $same unchanged."
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "**$TARGET upload:** $uploaded uploaded, $same unchanged (commit \`$SHA\`)." >> "$GITHUB_STEP_SUMMARY"
fi
