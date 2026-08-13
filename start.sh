#!/bin/bash
# One-click launcher for the Hardware Store CRM.
# Starts the dev server if it isn't already running, then opens it in the browser.

APP_DIR="/home/xhaven/Desktop/HGS"
URL="http://localhost:3000/login"

# nvm-installed node/npm aren't on PATH outside an interactive shell.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$APP_DIR" || { echo "Could not find $APP_DIR"; read -p "Press Enter to close..."; exit 1; }

is_up() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null)" = "200" ]
}

if is_up; then
  echo "Hardware Store CRM is already running."
  xdg-open "$URL" >/dev/null 2>&1 &
  exit 0
fi

echo "Starting Hardware Store CRM..."
npm run dev &
SERVER_PID=$!

echo "Waiting for it to be ready..."
for i in $(seq 1 60); do
  if is_up; then
    break
  fi
  sleep 1
done

if is_up; then
  echo "Ready! Opening in your browser..."
  xdg-open "$URL" >/dev/null 2>&1 &
else
  echo "The server didn't start in time — check the output above for errors."
fi

echo ""
echo "Hardware Store CRM is running. Close this window (or press Ctrl+C) to stop it."
wait "$SERVER_PID"
