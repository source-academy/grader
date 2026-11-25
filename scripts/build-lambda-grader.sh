#!/bin/bash

set -euxo pipefail

# The grader has no native modules: compiled code, production dependencies and the vendored
# evaluators (vendor/) go into one zip, with index.js at its root.
rm -rf build grader.zip node_modules
yarn install --immutable
yarn run tsc
# remove dev dependencies
yarn workspaces focus --production
rm -rf build/__tests__
cp -r node_modules/ build
cp -r vendor build

(cd build && zip -qr ../grader.zip *)
