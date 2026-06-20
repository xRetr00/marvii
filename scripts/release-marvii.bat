@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0.."

set "BUMP=%~1"
if "%BUMP%"=="" set "BUMP=patch"

if /I "%BUMP%"=="--help" goto :help
if /I "%BUMP%"=="-h" goto :help
if /I "%BUMP%"=="patch" goto :start
if /I "%BUMP%"=="minor" goto :start
if /I "%BUMP%"=="major" goto :start
echo [release-marvii] Invalid bump type: %BUMP%
goto :usage

:usage
echo Usage: scripts\release-marvii.bat [patch^|minor^|major]
echo.
echo Runs a Marvii Windows updater release from the current main branch.
echo The worktree must be clean before this script starts.
exit /b 2

:help
echo Usage: scripts\release-marvii.bat [patch^|minor^|major]
echo.
echo Runs a Marvii Windows updater release from the current main branch.
echo The worktree must be clean before this script starts.
exit /b 0

:start
echo [release-marvii] Repository: %CD%

for /f "delims=" %%S in ('git status --porcelain') do (
  echo [release-marvii] Worktree is dirty. Commit or stash changes first.
  git status --short
  exit /b 1
)

for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
  echo [release-marvii] Refusing to release from branch "%BRANCH%". Switch to main first.
  exit /b 1
)

git fetch marvi main --prune
if errorlevel 1 exit /b 1

git merge-base --is-ancestor marvi/main main
if errorlevel 1 (
  echo [release-marvii] marvi/main is not an ancestor of local main.
  echo [release-marvii] Pull/merge marvi/main before releasing.
  exit /b 1
)

echo [release-marvii] Bumping version: %BUMP%
node scripts\release\bump-version.js %BUMP%
if errorlevel 1 exit /b 1

for /f "delims=" %%V in ('node -p "require('./app/package.json').version"') do set "VERSION=%%V"
set "TAG=v%VERSION%"

echo [release-marvii] Version: %VERSION%
node scripts\release\verify-version-sync.js %VERSION%
if errorlevel 1 exit /b 1

echo [release-marvii] Running focused validation...
pnpm --dir app test -- src/__tests__/marvi-local-only-guard.test.ts src/hooks/useAppUpdate.test.ts src/components/__tests__/AppUpdatePrompt.test.tsx --reporter=dot
if errorlevel 1 exit /b 1

pnpm --dir app compile
if errorlevel 1 exit /b 1

pnpm --dir app build
if errorlevel 1 exit /b 1

pwsh -NoProfile -File scripts\tests\OpenHumanWindowsInstall.Tests.ps1
if errorlevel 1 exit /b 1

git add app\package.json app\src-tauri\tauri.conf.json app\src-tauri\Cargo.toml app\src-tauri-mobile\tauri.conf.json app\src-tauri-mobile\Cargo.toml Cargo.toml
git commit -m "chore(release): %TAG%"
if errorlevel 1 exit /b 1

git push marvi main
if errorlevel 1 exit /b 1

echo [release-marvii] Dispatching GitHub Windows updater workflow...
gh workflow run release-windows-updater.yml --repo xRetr00/marvii -f tag=%TAG% -f version=%VERSION% -f ref=main
if errorlevel 1 exit /b 1

echo [release-marvii] Release workflow dispatched for %TAG%.
echo [release-marvii] Check status:
echo   gh run list --repo xRetr00/marvii --workflow release-windows-updater.yml --limit 1
echo   gh release view %TAG% --repo xRetr00/marvii --json tagName,url,assets,isDraft,isPrerelease
exit /b 0
