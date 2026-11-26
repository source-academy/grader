#!/bin/bash

# Vendors a conductor evaluator: downloads its script (and the files it loads) into
# vendor/evaluators/<dir>, so that grading does not depend on the network. Then add or update the
# evaluator's entry in vendor/evaluators/manifest.json (see conductorGrader.ts for its fields).
#
#   scripts/vendor-evaluator.sh <dir> <base-url> <file>...
#   scripts/vendor-evaluator.sh ocaml https://source-academy.github.io/ocaml-slang OCamlEvaluator.js ocaml-toplevel.js

set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <dir> <base-url> <file>..." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$repo_root/vendor/evaluators/$1"
base="${2%/}"
shift 2

mkdir -p "$dir"
for file in "$@"; do
  echo "Fetching $base/$file ..."
  curl -fsSL -o "$dir/$file" "$base/$file"
done
