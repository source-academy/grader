#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="$(dirname "$(realpath -s "${BASH_SOURCE[0]}")")"

yum install -y \
  libX11-devel.x86_64 \
  pixman-devel.x86_64 \
  libdrm-devel.x86_64 \
  mesa-libGL-devel.x86_64 \
  mesa-libgbm-devel.x86_64 \
  mesa-libEGL-devel.x86_64 \
  openssl-devel.x86_64 \
  xorg-x11-xtrans-devel.noarch \
  libXfont-devel.x86_64 \
  libXfont2-devel.x86_64 \
  libxkbfile-devel.x86_64 \
  libpciaccess-devel.x86_64 \
  xorg-x11-utils \
  libXtst-devel.x86_64 \
  libjpeg-turbo-devel.x86_64 \
  libepoxy-devel.x86_64

XKEYBOARD_CONFIG_VER=2.30
XORG_VER=1.20.8
XKBCOMP_VER=1.4.3

curl -LO "https://www.x.org/archive/individual/data/xkeyboard-config/xkeyboard-config-$XKEYBOARD_CONFIG_VER.tar.bz2"
curl -LO "https://www.x.org/archive/individual/xserver/xorg-server-$XORG_VER.tar.bz2"
curl -LO "https://www.x.org/releases/individual/app/xkbcomp-$XKBCOMP_VER.tar.bz2"

tar jxf "xkeyboard-config-$XKEYBOARD_CONFIG_VER.tar.bz2"
tar jxf "xorg-server-$XORG_VER.tar.bz2"
tar jxf "xkbcomp-$XKBCOMP_VER.tar.bz2"

export LD_LIBRARY_PATH=/var/task
export PKG_CONFIG_PATH=/var/task/share/pkgconfig:/var/task/lib/pkgconfig

pushd "xkeyboard-config-$XKEYBOARD_CONFIG_VER"
./configure --prefix=/var/task
make -j$(nproc) && make install
popd

pushd "xorg-server-$XORG_VER"
./configure --prefix=/var/task --with-xkb-bin-directory=/tmp
make -j$(nproc) && make install
popd

pushd "xkbcomp-$XKBCOMP_VER"
./configure --prefix=/var/task
make -j$(nproc) && make install
popd

cd /var/task

strip bin/*
find -name '*.so' -type f -print0 | xargs -0 strip

mkdir -p lib
for lib in $(ldd bin/Xvfb | grep -oP '^\s+\S+\s=>\s\K/(usr/)?lib\S+'); do
  if ! grep "$(basename "$lib")" "$SCRIPT_DIR/lambda-env-libs" > /dev/null; then
    cp "$lib" lib
  fi
done

tar jcf xvfb.tar.bz2 *
