#!/bin/bash

set -euxo pipefail

sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev pkg-config glew-utils make gcc patch

rm -rf build grader.zip node_modules
JOBS=$(nproc) yarn install --immutable
yarn run tsc
rm -rf build/__tests__
cp -r node_modules/ build

tar jcf build.tar.bz2 build
