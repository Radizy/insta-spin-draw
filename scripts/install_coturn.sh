#!/bin/bash

# --- Script de Instalação Automática do CoTURN para WebRTC ---
# Autor: FilaLab Assistant
# Recomendado para Ubuntu 22.04 LTS

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, rode este script como root (ou usando sudo)."
  exit 1
fi

echo "============================================="
echo "  Instalação e Configuração do CoTURN"
echo "============================================="

# 1. Obter informações de IPs
PUBLIC_IP=$(curl -s https://ifconfig.me)
PRIVATE_IP=$(hostname -I | awk '{print $1}')

echo "IP Público Detectado: $PUBLIC_IP"
echo "IP Privado Detectado: $PRIVATE_IP"
echo "---------------------------------------------"

# 2. Solicitar dados de login para as TVs/Transmissores
read -p "Digite o usuário para as conexões (ex: filalab-tv): " TURN_USER
read -p "Digite a senha para este usuário: " TURN_PASS
read -p "Digite um Realm (ex: filalab.com.br): " TURN_REALM

if [ -z "$TURN_USER" ] || [ -z "$TURN_PASS" ] || [ -z "$TURN_REALM" ]; then
  echo "Erro: Usuário, Senha e Realm são obrigatórios."
  exit 1
fi

# 3. Atualizar pacotes e instalar CoTURN
echo "Instalando dependências..."
apt update && apt install coturn curl -y

# 4. Fazer backup da configuração antiga
if [ -f /etc/turnserver.conf ]; then
  mv /etc/turnserver.conf /etc/turnserver.conf.backup
fi

# 5. Criar nova configuração do CoTURN
echo "Gerando arquivo de configuração /etc/turnserver.conf..."
cat <<EOF > /etc/turnserver.conf
# --- Configuração Minimalista CoTURN (FilaLab WebRTC) ---

# Portas de escuta padrão
listening-port=3478
tls-listening-port=5349

# IPs de escuta e relay
listening-ip=$PRIVATE_IP
relay-ip=$PRIVATE_IP

# IP Público externo para travessia NAT (Obrigatório na Oracle Cloud)
external-ip=$PUBLIC_IP

# Mecanismo de autenticação de longa duração
lt-cred-mech
realm=$TURN_REALM

# Usuário e Senha estáticos criados para as TVs
user=$TURN_USER:$TURN_PASS

# Configurações de segurança e otimização
fingerprint
no-multicast-peers

# Bloqueio de conexões a redes locais internas (segurança)
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.0.0.0-192.0.0.255
denied-peer-ip=192.168.0.0-192.168.255.255

# Log
log-file=/var/log/turnserver.log
simple-log
EOF

# 6. Habilitar o serviço no boot do sistema
echo "Habilitando daemon do CoTURN..."
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/g' /etc/default/coturn 2>/dev/null || true
echo "TURNSERVER_ENABLED=1" >> /etc/default/coturn

# 7. Liberar portas no firewall local (UFW)
echo "Configurando firewall local (UFW)..."
if command -v ufw >/dev/null; then
  ufw allow 3478/tcp
  ufw allow 3478/udp
  ufw allow 5349/tcp
  ufw allow 5349/udp
  ufw allow 49152:65535/udp
  ufw reload
fi

# 8. Iniciar o serviço
echo "Iniciando o serviço turnserver..."
systemctl daemon-reload
systemctl restart coturn
systemctl enable coturn

echo "============================================="
echo "  Instalação concluída com sucesso!"
echo "============================================="
echo "Servidor TURN ativo no IP: $PUBLIC_IP"
echo "Usuário: $TURN_USER"
echo "Senha: $TURN_PASS"
echo "Realm: $TURN_REALM"
echo "---------------------------------------------"
echo "Sua URL de conexão para o arquivo .env será:"
echo "VITE_TURN_URL=\"turn:$PUBLIC_IP:3478,turn:$PUBLIC_IP:3478?transport=tcp\""
echo "============================================="
