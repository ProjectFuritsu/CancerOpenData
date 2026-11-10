#!/usr/bin/env bash
# Checks the public URL after a deploy, the way a browser app would see it.
# For every JSON file in data/:
#   - GET returns 200
#   - the body is byte-for-byte the same as the repo file
#   - Access-Control-Allow-Origin is sent (CORS works for other sites)
#   - Content-Type is application/json
# Plus one CORS preflight (OPTIONS) check.
# Retries for up to ~2 minutes, because a new upload can take a moment to show.
#
#   PUBLIC_URL   e.g. https://pub-xxxx.r2.dev   (no trailing slash)
set -uo pipefail

: "${PUBLIC_URL:?PUBLIC_URL is not set}"
PUBLIC_URL="${PUBLIC_URL%/}"
ORIGIN="https://smoke-test.example"
TRIES="${SMOKE_TRIES:-8}"
WAIT="${SMOKE_WAIT:-15}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

check_file() {   # $1 = local path; prints a reason and returns 1 on failure
  local file="$1" key="${1#data/}" headers code acao ctype
  headers=$(curl -sS -m 20 -D - -o "$TMP/body" -H "Origin: $ORIGIN" -H "Cache-Control: no-cache" \
    "$PUBLIC_URL/$key?smoke=${GITHUB_SHA:-local}" 2>&1) || { echo "request failed: $headers"; return 1; }
  code=$(printf '%s\n' "$headers" | awk 'toupper($1) ~ /^HTTP/ {c=$2} END {print c}')
  acao=$(printf '%s\n' "$headers" | grep -i '^access-control-allow-origin:' | tr -d '\r' | cut -d' ' -f2-)
  ctype=$(printf '%s\n' "$headers" | grep -i '^content-type:' | tr -d '\r' | cut -d' ' -f2-)
  [[ "$code" == "200" ]] || { echo "status $code"; return 1; }
  cmp -s "$TMP/body" "$file" || { echo "content differs from repo"; return 1; }
  [[ "$acao" == "*" || "$acao" == "$ORIGIN" ]] || { echo "no CORS header (Access-Control-Allow-Origin: '${acao}')"; return 1; }
  [[ "$ctype" == application/json* ]] || { echo "content-type is '$ctype'"; return 1; }
  return 0
}

mapfile -d '' FILES < <(find data -type f -name '*.json' -print0 | sort -z)
pending=("${FILES[@]}")

for ((try = 1; try <= TRIES; try++)); do
  failed=()
  for file in "${pending[@]}"; do
    if reason=$(check_file "$file"); then
      echo "PASS ${file#data/}"
    else
      failed+=("$file")
      echo "wait ${file#data/}: $reason"
    fi
  done
  pending=("${failed[@]}")
  [[ ${#pending[@]} -eq 0 ]] && break
  if (( try < TRIES )); then
    echo "-- ${#pending[@]} not ready, retry $try/$((TRIES - 1)) in ${WAIT}s"
    sleep "$WAIT"
  fi
done

# CORS preflight, as a browser sends before some cross-site requests.
pre=$(curl -sS -m 20 -o /dev/null -D - -X OPTIONS -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" "$PUBLIC_URL/${FILES[0]#data/}" 2>&1)
pre_code=$(printf '%s\n' "$pre" | awk 'toupper($1) ~ /^HTTP/ {c=$2} END {print c}')
pre_acao=$(printf '%s\n' "$pre" | grep -ic '^access-control-allow-origin:')
# Static assets on Workers answer OPTIONS with 405. Plain GET requests (no custom
# headers) never send a preflight, so this is only a warning unless required.
if [[ "$pre_code" =~ ^20[04]$ && "$pre_acao" -ge 1 ]]; then
  echo "PASS CORS preflight ($pre_code)"; pre_ok=1
elif [[ "${SMOKE_REQUIRE_PREFLIGHT:-0}" == "1" ]]; then
  echo "FAIL CORS preflight (status $pre_code, allow-origin header: $pre_acao)"; pre_ok=0
else
  echo "WARN CORS preflight not supported (status $pre_code). Plain GET without custom headers still works."
  [[ -n "${GITHUB_ACTIONS:-}" ]] && echo "::warning title=No CORS preflight::OPTIONS returns $pre_code. Apps must use plain GET without custom headers."
  pre_ok=2
fi

total=${#FILES[@]}; bad=${#pending[@]}
pre_text=$([[ $pre_ok == 1 ]] && echo OK || { [[ $pre_ok == 2 ]] && echo "not supported (warning)" || echo FAILED; })
summary="**Smoke test** on \`$PUBLIC_URL\`: $((total - bad))/$total files OK, preflight $pre_text."
echo; echo "$summary"
[[ -n "${GITHUB_STEP_SUMMARY:-}" ]] && echo "$summary" >> "$GITHUB_STEP_SUMMARY"

if (( bad > 0 || pre_ok == 0 )); then
  for file in "${pending[@]}"; do echo "::error title=Smoke test failed::${file#data/}"; done
  exit 1
fi
