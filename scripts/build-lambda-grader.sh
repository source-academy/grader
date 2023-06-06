#!/bin/bash

set -euxo pipefail

yum install -y libXi-devel.x86_64 mesa-libGL-devel.x86_64 cairo-devel pango-devel pixman-devel make glibc-devel gcc patch gcc-c++

rm -rf build grader.zip node_modules
JOBS=$(nproc) yarn install --frozen-lockfile
yarn run tsc
rm -rf node_modules build/__tests__
JOBS=$(nproc) yarn install --production --ignore-scripts --frozen-lockfile
cp -r node_modules/ build

tar jcf build.tar.bz2 build
