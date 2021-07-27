#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="$(dirname "$(realpath -s "${BASH_SOURCE[0]}")")"

tar jxf build.tar.bz2

yum install -y libXi-devel.x86_64 mesa-libGL-devel.x86_64

cd build

JOBS=$(nproc) npm rebuild

find node_modules/ -name 'obj.target' -type d -print0 | xargs -0 rm -rf
find node_modules/ -path '*/build/Release/*' -not \( -name '*.so*' -or -name '*.node' \) -print0 | xargs -0 rm -rf
find node_modules/ \( -name '*.node' -or -name '*.so*' \)  -print0 | xargs -0 strip || :

rm -rf node_modules/gl/angle

mkdir -p lib
NEEDED_LIBS=$(find node_modules -name '*.node' -not -path '*/obj.target/*' -print0 | xargs -0 ldd | grep -oP '^\s+\S+\s=>\s\K/(usr/)?lib\S+')
for lib in $NEEDED_LIBS; do
  if ! grep "$(basename "$lib")" "$SCRIPT_DIR/lambda-env-libs" > /dev/null; then
    cp "$lib" lib
  fi
done

zip -r ../grader.zip *
