# Installe silencieusement un installeur NSIS de Trusquin, vérifie l'installation, lance l'app 15 s puis désinstalle.
#   CI : .github/workflows/windows.yml (installeur compilé) et release.yml (installeur publié)
#   local, en administrateur : pwsh build/windows/check.ps1 bin\trusquin-amd64-installer.exe
param([Parameter(Mandatory)][string]$Installer)
$ErrorActionPreference = 'Stop'

$appDir = 'C:\Program Files\Trusquin\Trusquin'
$uninstKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\TrusquinTrusquin'

'== Installation silencieuse'
$p = Start-Process (Resolve-Path $Installer) -ArgumentList '/S' -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "Installeur : code $($p.ExitCode)" }
foreach ($f in "$appDir\trusquin.exe", "$appDir\uninstall.exe", "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Trusquin.lnk") {
  if (-not (Test-Path $f)) { throw "Absent après installation : $f" }
}
Get-ItemProperty $uninstKey | Select-Object DisplayName, DisplayVersion, Publisher

'== Démarrage (15 s)'
$p = Start-Process "$appDir\trusquin.exe" -PassThru
Start-Sleep -Seconds 15
if ($p.HasExited) { throw "L'application s'est arrêtée (code $($p.ExitCode)) avant 15 s" }
Stop-Process -Id $p.Id -Force
# Laisse Windows libérer trusquin.exe avant la désinstallation.
$p.WaitForExit()

'== Désinstallation silencieuse'
# _?= : l'uninstaller NSIS s'exécute sur place et rend la main à la fin (sinon il se copie et revient tout de suite).
$p = Start-Process "$appDir\uninstall.exe" -ArgumentList '/S', "_?=$appDir" -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "Désinstalleur : code $($p.ExitCode)" }
if (Test-Path "$appDir\trusquin.exe") { throw 'trusquin.exe toujours présent après désinstallation' }
if (Test-Path $uninstKey) { throw 'Clé de désinstallation toujours présente' }

"OK : $((Get-CimInstance Win32_OperatingSystem).Caption) $([Environment]::OSVersion.Version)"
