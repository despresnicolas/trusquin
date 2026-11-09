#!/usr/bin/env bash
# Vérifie que Trusquin se compile, s'empaquette (.deb), s'installe et démarre sur la distribution courante
# (Debian/Ubuntu et dérivées : Pop!_OS, Mint…). Lancé en root dans un conteneur propre :
#   CI : .github/workflows/linux.yml
#   local : docker run --rm -v "$PWD":/src:ro debian:trixie bash /src/build/linux/check.sh
# Avec PKG=<chemin d'un .deb ou d'un .AppImage déjà construit> (release.yml), ne compile rien : vérifie
# seulement que ce paquet s'installe et démarre sur un système sans outils de développement.
set -euo pipefail

SRC=${SRC:-/src}
PKG=${PKG:-}
WORK=/work
NODE_VERSION=22.21.0
WAILS_VERSION=v3.1.0
export DEBIAN_FRONTEND=noninteractive

. /etc/os-release
echo "== $PRETTY_NAME ($(uname -m))"

if [ -n "$PKG" ]; then
  echo "== Outils de test (les dépendances de l'app doivent venir du paquet)"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends ca-certificates xvfb xauth dbus-x11 >/dev/null
else
  echo "== Dépendances système (GTK4 + WebKitGTK 6.0)"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends \
    ca-certificates curl xz-utils git build-essential pkg-config \
    libgtk-4-dev libwebkitgtk-6.0-dev xvfb xauth dbus-x11 >/dev/null

  # Copie de travail : node_modules, bin/ et dist/ de l'hôte (autre OS) ne doivent ni servir ni être écrasés.
  echo "== Sources"
  mkdir -p "$WORK"
  tar -C "$SRC" --exclude=./node_modules --exclude=./bin --exclude=./dist --exclude=./.svelte-kit -cf - . | tar -C "$WORK" -xf -
  cd "$WORK"

  echo "== Outils (Go, Node, pnpm, wails3)"
  case "$(uname -m)" in
    x86_64) GOARCH=amd64 NODEARCH=x64 ;;
    aarch64) GOARCH=arm64 NODEARCH=arm64 ;;
    *) echo "Architecture non gérée : $(uname -m)" && exit 1 ;;
  esac
  # Lu par nfpm.yaml (arch: ${GOARCH}) : sans lui, le .deb est marqué amd64 quelle que soit la machine.
  export GOARCH
  GO_VERSION=$(awk '/^go /{print $2}' go.mod)
  curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz" | tar -C /usr/local -xz
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODEARCH}.tar.xz" | tar -C /usr/local --strip-components=1 -xJ
  export PATH=/usr/local/go/bin:/root/go/bin:$PATH
  # Version de pnpm fixée par package.json (packageManager) ; corepack de Node 22 ne gère pas pnpm 12.
  npm install -g --silent "$(node -p "require('./package.json').packageManager")"
  go install "github.com/wailsapp/wails/v3/cmd/wails3@${WAILS_VERSION}"

  echo "== Tests"
  pnpm install --frozen-lockfile
  pnpm test

  echo "== Compilation et paquet .deb"
  wails3 task linux:create:deb
  ls -l bin/
  PKG=$(ls "$WORK"/bin/*.deb)
fi

case "$PKG" in
  *.deb)
    echo "== Installation du .deb (les dépendances déclarées doivent exister sur cette distribution)"
    apt-get install -y -qq "$PKG" >/dev/null
    dpkg -s trusquin | grep -E '^(Status|Version|Depends):'
    BIN=/usr/local/bin/trusquin
    ;;
  *.AppImage)
    echo "== AppImage"
    BIN=/tmp/trusquin.AppImage
    cp "$PKG" "$BIN" && chmod +x "$BIN"
    # Pas de FUSE dans un conteneur : l'AppImage s'extrait puis se lance.
    export APPIMAGE_EXTRACT_AND_RUN=1
    ;;
  *) echo "Paquet non géré : $PKG" && exit 1 ;;
esac

echo "== Démarrage (écran virtuel, 15 s)"
# Conteneur sans GPU ni namespaces : WebKit sans sandbox ni accélération ; en usage normal ces variables ne servent pas.
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 LIBGL_ALWAYS_SOFTWARE=1
set +e
dbus-run-session -- xvfb-run -a timeout 15 "$BIN" >/tmp/trusquin.log 2>&1
status=$?
set -e
if [ "$status" -ne 124 ]; then
  echo "L'application s'est arrêtée (code $status) avant 15 s :"
  cat /tmp/trusquin.log
  exit 1
fi
echo "OK : $PRETTY_NAME"
