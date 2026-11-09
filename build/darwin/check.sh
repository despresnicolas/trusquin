#!/usr/bin/env bash
# Vérifie que Trusquin se compile, s'empaquette (.app signé ad hoc) et démarre sur ce Mac, et que la version
# minimale de macOS annoncée est tenue. Prérequis : Go, Node, pnpm, wails3 (installés par la CI, présents en local).
#   CI : .github/workflows/macos.yml
#   local : bash build/darwin/check.sh   (UNIVERSAL=1 pour le binaire arm64 + amd64)
set -euo pipefail
cd "$(dirname "$0")/../.."

APP=bin/trusquin.app
PLIST=build/darwin/Info.plist
echo "== macOS $(sw_vers -productVersion) ($(uname -m)), $(go version | cut -d' ' -f3)"

echo "== Tests"
pnpm install --frozen-lockfile
pnpm test

echo "== Paquet .app"
if [ "${UNIVERSAL:-}" = 1 ]; then wails3 task darwin:package:universal; else wails3 package; fi
BIN="$APP/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Contents/Info.plist")"

echo "== Bundle"
plutil -lint "$APP/Contents/Info.plist"
codesign --verify --deep --strict "$APP"
archs=$(lipo -archs "$BIN")
echo "Architectures : $archs"
expected=$([ "${UNIVERSAL:-}" = 1 ] && echo "x86_64 arm64" || uname -m)
for a in $expected; do
  case " $archs " in *" $a "*) ;; *) echo "Architecture $a absente de $BIN" && exit 1 ;; esac
done

echo "== Version minimale de macOS"
declared=$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$PLIST")
minos=$(otool -l "$BIN" | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print $2; exit}')
# Le binaire garde le minos demandé à l'éditeur de liens : seul le Go utilisé dit le vrai minimum
# (Go 1.26 : macOS 12 ; Go 1.27+ : macOS 13, cf. notes de version).
gominor=$(go env GOVERSION | sed -E 's/^go1\.([0-9]+).*/\1/')
required=$([ "$gominor" -ge 27 ] && echo 13 || echo 12)
echo "Info.plist : $declared · binaire (minos) : $minos · exigé par Go 1.$gominor : $required"
if [ "${declared%%.*}" -lt "$required" ] || [ "${minos%%.*}" -lt "$required" ]; then
  echo "L'app annonce macOS ${declared%%.*} mais Go 1.$gominor exige macOS $required : relever LSMinimumSystemVersion"
  echo "(Info.plist, Info.dev.plist) et -mmacosx-version-min (build/darwin/Taskfile.yml), ou compiler avec Go 1.26."
  exit 1
fi

echo "== Démarrage (15 s)"
"$BIN" >/tmp/trusquin-check.log 2>&1 &
pid=$!
sleep 15
if ! kill -0 "$pid" 2>/dev/null; then
  echo "L'application s'est arrêtée avant 15 s :"
  cat /tmp/trusquin-check.log
  exit 1
fi
kill "$pid"
echo "OK : macOS $(sw_vers -productVersion) ($(uname -m))"
