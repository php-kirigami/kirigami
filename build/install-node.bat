@echo off
wsl --update
wsl --shutdown
wsl --unregister ubuntu
wsl --install -d ubuntu
wsl -d Ubuntu bash /mnt/c/projects/kirigami/kirigami/build/install-node.sh
pause