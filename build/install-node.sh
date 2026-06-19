# Ajoute le repo officiel Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installe Node
sudo apt-get install -y nodejs

# Vérifie
node -v
npm -v


sudo apt-get install -y make