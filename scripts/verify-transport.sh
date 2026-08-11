#!/usr/bin/env bash
# Resolves §4 of docs/content-sync-spec.md.
#
# Determines, empirically, which Google URLs return usable content to an
# UNAUTHENTICATED client. This must be answered before any sync code is written,
# because it decides whether we parse Markdown (easy), sanitise published HTML
# (harder), or deploy an Apps Script Web App (most setup).
#
# IMPORTANT: run this from a terminal, NOT by pasting URLs into a browser.
# A browser signed into the club Google account will happily return 200 for
# documents that are closed to the public, which is exactly the mistake this
# script exists to prevent.
#
# Usage:
#   ./scripts/verify-transport.sh \
#       --doc-id      <id from /document/d/<ID>/edit> \
#       --doc-pub-id  <id from /document/d/e/<ID>/pub> \
#       --sheet-id    <id from /spreadsheets/d/<ID>/edit> \
#       --sheet-pub-id <id from /spreadsheets/d/e/<ID>/pub> \
#       --sheet-tab   <tab name, default: status>
#
# Any ID may be omitted; rows needing it are skipped.

set -uo pipefail

DOC_ID="" DOC_PUB_ID="" SHEET_ID="" SHEET_PUB_ID="" SHEET_TAB="status"

while [ $# -gt 0 ]; do
    case "$1" in
        --doc-id)       DOC_ID="$2";       shift 2 ;;
        --doc-pub-id)   DOC_PUB_ID="$2";   shift 2 ;;
        --sheet-id)     SHEET_ID="$2";     shift 2 ;;
        --sheet-pub-id) SHEET_PUB_ID="$2"; shift 2 ;;
        --sheet-tab)    SHEET_TAB="$2";    shift 2 ;;
        -h|--help)      sed -n '2,25p' "$0"; exit 0 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

OUT="${TMPDIR:-/tmp}/transport-verify"
mkdir -p "$OUT"

probe() {
    local label="$1" url="$2" want="$3"
    local body="$OUT/$(echo "$label" | tr -c 'a-zA-Z0-9' '_').body"

    # -L follows redirects: Apps Script Web Apps and some published URLs 302 to
    # googleusercontent.com, and not following makes a working endpoint look dead.
    local meta
    meta=$(curl -sSL -m 30 -o "$body" \
                -w '%{http_code}\t%{content_type}\t%{url_effective}' \
                "$url" 2>/dev/null) || { echo "  $label: REQUEST FAILED"; return; }

    local code type final
    IFS=$'\t' read -r code type final <<<"$meta"

    local size verdict
    size=$(wc -c <"$body" | tr -d ' ')
    if [ "$code" = "200" ] && [ "$size" -gt 0 ]; then verdict="OK"; else verdict="UNUSABLE"; fi

    printf '  %-46s %-4s %-28s %8s bytes  %s\n' "$label" "$code" "${type%%;*}" "$size" "$verdict"
    [ "$final" != "$url" ] && printf '      redirected to: %s\n' "$final"
    printf '      want: %s\n' "$want"
    printf '      body: %s\n' "$body"

    # A login page is the classic false positive: HTTP 200, HTML, no content.
    if grep -qiE 'accounts\.google\.com|sign in|<title>Google Drive' "$body" 2>/dev/null; then
        printf '      \033[33mWARNING: looks like a Google sign-in page, not content.\033[0m\n'
    fi
    echo
}

echo
echo "=== Google transport verification ==="
echo "Anything marked OK must ALSO be eyeballed: check the body file is real"
echo "content and not a sign-in page or an error document."
echo

if [ -n "$DOC_ID" ]; then
    echo "-- Docs, link-shared --"
    probe "1. doc export?format=md"   "https://docs.google.com/document/d/$DOC_ID/export?format=md"   "200 + text/markdown  <- BEST CASE"
    probe "1b. doc export?format=txt" "https://docs.google.com/document/d/$DOC_ID/export?format=txt"  "200 + text/plain"
    probe "1c. doc export?format=html" "https://docs.google.com/document/d/$DOC_ID/export?format=html" "200 + text/html"
fi

if [ -n "$DOC_PUB_ID" ]; then
    echo "-- Docs, published to web --"
    probe "3. doc /pub"               "https://docs.google.com/document/d/e/$DOC_PUB_ID/pub"          "200 + text/html (inspect shape)"
fi

if [ -n "$SHEET_ID" ]; then
    echo "-- Sheets, link-shared --"
    probe "4. sheet gviz csv"         "https://docs.google.com/spreadsheets/d/$SHEET_ID/gviz/tq?tqx=out:csv&sheet=$SHEET_TAB" "200 + text/csv"
    probe "4b. sheet export csv"      "https://docs.google.com/spreadsheets/d/$SHEET_ID/export?format=csv"                     "200 + text/csv"
fi

if [ -n "$SHEET_PUB_ID" ]; then
    echo "-- Sheets, published to web --"
    probe "6. sheet /pub?output=csv"  "https://docs.google.com/spreadsheets/d/e/$SHEET_PUB_ID/pub?output=csv" "200 + text/csv"
fi

echo "Bodies saved under: $OUT"
echo
echo "Next: paste this output into docs/content-sync-spec.md §4 and apply the"
echo "decision rule there. Markdown available unauthenticated is the best case"
echo "and makes the parser trivial."
