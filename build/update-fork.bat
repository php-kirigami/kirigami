@echo off
cd ..\..\php-wasm-builder
git fetch --depth 1 origin trunk
git reset --hard origin/trunk
pause