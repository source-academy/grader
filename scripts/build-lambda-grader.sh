#!/bin/bash

set -euxo pipefail

sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev pkg-config glew-utils make glibc-devel gcc patch gcc-c++

rm -rf build grader.zip node_modules
JOBS=$(nproc) yarn install --frozen-lockfile
yarn run tsc
rm -rf node_modules build/__tests__
JOBS=$(nproc) yarn install --production --ignore-scripts --frozen-lockfile
cp -r node_modules/ build

tar jcf build.tar.bz2 build
