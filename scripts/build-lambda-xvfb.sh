#!/bin/bash

set -euxo pipefail

SCRIPT_DIR="$(dirname "$(realpath -s "${BASH_SOURCE[0]}")")"

# Build toolchain — not present in the minimal AL2023 Lambda base image
dnf install -y gcc make bison flex libxslt gettext

dnf install -y \
  libX11-devel.x86_64 \
  pixman-devel.x86_64 \
  libdrm-devel.x86_64 \
  mesa-libGL-devel.x86_64 \
  mesa-libgbm-devel.x86_64 \
  mesa-libEGL-devel.x86_64 \
  openssl-devel.x86_64 \
  xorg-x11-xtrans-devel.noarch \
  libXfont2-devel.x86_64 \
  libxkbfile-devel.x86_64 \
  libpciaccess-devel.x86_64 \
  xorg-x11-utils \
  libXtst-devel.x86_64 \
  libjpeg-turbo-devel.x86_64 \
  libepoxy-devel.x86_64 \
  mesa-dri-drivers.x86_64

XKEYBOARD_CONFIG_VER=2.30
XORG_VER=1.20.8
XKBCOMP_VER=1.4.3

# www.x.org is frequently unreachable from CI (transient outages / IPv6 hangs),
# so force IPv4, retry with backoff, and fall back across mirrors.
XORG_MIRRORS=(
  "https://www.x.org"
  "https://ftp.x.org"
  "https://xorg.freedesktop.org"
)

fetch() {
  local path="$1"
  for base in "${XORG_MIRRORS[@]}"; do
    echo "Fetching $base/$path"
    if curl -4 -fL --connect-timeout 15 --retry 5 --retry-delay 2 --retry-all-errors --retry-connrefused -O "$base/$path"; then
      return 0
    fi
    echo "Mirror $base failed; trying next"
  done
  echo "All mirrors failed for $path" >&2
  return 1
}

fetch "archive/individual/data/xkeyboard-config/xkeyboard-config-$XKEYBOARD_CONFIG_VER.tar.bz2"
fetch "archive/individual/xserver/xorg-server-$XORG_VER.tar.bz2"
fetch "releases/individual/app/xkbcomp-$XKBCOMP_VER.tar.bz2"

tar jxf "xkeyboard-config-$XKEYBOARD_CONFIG_VER.tar.bz2"
tar jxf "xorg-server-$XORG_VER.tar.bz2"
tar jxf "xkbcomp-$XKBCOMP_VER.tar.bz2"

export LD_LIBRARY_PATH=/opt/lib
export PKG_CONFIG_PATH=/opt/share/pkgconfig:/opt/lib/pkgconfig

pushd "xkeyboard-config-$XKEYBOARD_CONFIG_VER"
./configure --prefix=/opt
make -j$(nproc) && make install
popd

pushd "xorg-server-$XORG_VER"
./configure --prefix=/opt --with-xkb-bin-directory=/tmp
make -j$(nproc) && make install
popd

pushd "xkbcomp-$XKBCOMP_VER"
./configure --prefix=/opt
make -j$(nproc) && make install
popd

cd /opt

strip bin/*
find -name '*.so' -type f -print0 | xargs -0 strip

BINS_TO_LDD="bin/Xvfb bin/xkbcomp /usr/lib64/libGLX_mesa.so.0 /usr/lib64/libGLX_system.so.0 /usr/lib64/dri/swrast_dri.so /usr/lib64/dri/kms_swrast_dri.so"

mkdir -p lib/dri
cp /usr/lib64/libGLX_mesa.so.0 /usr/lib64/libGLX_system.so.0 lib
cp /usr/lib64/dri/*swrast* lib/dri

for lib in $(ldd $BINS_TO_LDD | grep -oP '^\s+\S+\s=>\s\K/(usr/)?lib\S+'); do
  if ! grep "$(basename "$lib")" "$SCRIPT_DIR/lambda-env-libs" > /dev/null; then
    cp "$lib" lib
  fi
done

zip -r xvfb.zip *
