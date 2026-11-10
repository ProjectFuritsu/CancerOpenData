#!/usr/bin/env bash
# Uploads only the JSON files in data/ whose content differs from S3.
# Compares the local MD5 with the S3 ETag (these files are small, so ETag = MD5).
# Each upload creates a new S3 object version, tagged with the Git commit.
# It never deletes anything from S3.
set -euo pipefail

: "${BUCKET:?BUCKET is not set}"
SHA="${GITHUB_SHA:-local}"
CACHE="public, max-age=300"
uploaded=0
same=0

while IFS= read -r -d '' file; do
  key="${file#data/}"
  local_md5=$(md5sum "$file" | cut -d' ' -f1)
  remote_etag=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query ETag --output text 2>/dev/null | tr -d '"' || true)

  if [[ "$local_md5" == "$remote_etag" ]]; then
    same=$((same + 1))
    continue
  fi

  echo "Uploading $key"
  aws s3 cp "$file" "s3://$BUCKET/$key" \
    --content-type "application/json" \
    --cache-control "$CACHE" \
    --metadata "git-sha=$SHA" \
    --only-show-errors
  uploaded=$((uploaded + 1))
done < <(find data -type f -name '*.json' -print0 | sort -z)

echo "Done: $uploaded uploaded, $same unchanged."
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "**S3 upload:** $uploaded uploaded, $same unchanged (commit \`$SHA\`)." >> "$GITHUB_STEP_SUMMARY"
fi
