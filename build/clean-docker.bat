docker system prune
wsl --shutdown
PowerShell Optimize-VHD -Path "C:\Users\ZmotriN\AppData\Local\Docker\wsl\disk\docker_data.vhdx" -Mode Full
PowerShell Optimize-VHD -Path "C:\Users\ZmotriN\AppData\Local\wsl\{c0b50eaa-e328-4932-8a0a-5cfd1d0acb8b}\ext4.vhdx" -Mode Full
