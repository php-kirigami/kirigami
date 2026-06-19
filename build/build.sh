#!/bin/bash
cd /mnt/c/projects/kirigami/php-wasm-builder

node packages/php-wasm/compile/build.js \
  --PHP_VERSION=8.5 \
  --PLATFORM=node \
  --JSPI \
  --WITH_JSPI=yes \
  --WITH_SQLITE=yes \
  --WITH_MBSTRING=yes \
  --WITH_OPENSSL=yes \
  --WITH_CLI_SAPI=no \
  --WITH_OPCACHE=no \
  --WITH_GD=yes \
  --WITH_IMAGICK=no \
  --WITH_LIBXML=yes \
  --WITH_SOAP=no \
  --WITH_CURL=yes \
  --WITH_ICONV=no \
  --WITH_EXIF=yes \
  --WITH_MBREGEX=no \
  --WITH_LIBZIP=yes \
  --WITH_FILEINFO=no \
  --WITH_MYSQL=no \
  --WITH_WS_NETWORKING_PROXY=yes \
  --WITH_DEBUG=no \
  --WITH_SOURCEMAPS=no \
  --STACK_SIZE=512kb \
  --output-dir=output
