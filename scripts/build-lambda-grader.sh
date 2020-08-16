#!/bin/bash

set -euxo pipefail

rm -rf build grader.zip node_modules
JOBS=$(nproc) yarn install --frozen-lockfile
yarn run tsc
rm -rf node_modules
JOBS=$(nproc) yarn install --production --ignore-scripts --frozen-lockfile
cp -r node_modules/ build

tar jcf build.tar.bz2 build
