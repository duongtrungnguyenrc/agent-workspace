#!/usr/bin/env bash

set -e

echo "==> Setting up agent skills and rules"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> pnpm is required to install Vibe Kanban dependencies"
  echo "    Install pnpm and rerun this script"
  exit 1
fi

mkdir -p .claude/skills
mkdir -p .claude/rules
mkdir -p .codex/skills
mkdir -p .codex/rules
mkdir -p .vibe-kanban
rm -rf .vibe-kanban/vibe-kanban.sqlite && touch .vibe-kanban/vibe-kanban.sqlite

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

pnpm --filter vibe-kanban run build

echo "==> Validating CodeGraph"

if command -v codegraph >/dev/null 2>&1 && \
   codegraph --version >/dev/null 2>&1; then
  echo "==> CodeGraph is already installed, skipping installation"
else
  echo "==> Installing CodeGraph"
  npm i -g @colbymchenry/codegraph@latest
fi

echo "==> Validating CodeGraph configuration"

if codegraph install --target=claude,codex --yes >/dev/null 2>&1; then
  echo "==> CodeGraph configuration is valid"
else
  echo "==> Configuring CodeGraph for Claude Code and Codex"
  codegraph install --target=claude,codex --yes
fi

echo "==> Validating CodeGraph index"

if [ -d ".codegraph" ]; then
  echo "==> CodeGraph index already exists, skipping initialization"
else
  echo "==> Initializing CodeGraph index"
  codegraph init
fi

echo "==> Validating AgentMemory"

if command -v agentmemory >/dev/null 2>&1; then
  echo "==> AgentMemory is already installed, skipping installation"
else
  echo "==> Installing AgentMemory"
  pnpm dlx --yes @agentmemory/agentmemory@latest
fi

echo "==> Configuring AgentMemory for Claude Code"

if [ -e "$HOME/.claude" ] && find "$HOME/.claude" -maxdepth 3 -iname '*agentmemory*' -print -quit 2>/dev/null | grep -q .; then
  echo "==> AgentMemory for Claude Code already configured, skipping"
else
  agentmemory connect claude-code
fi

echo "==> Configuring AgentMemory for Codex"

if [ -e "$HOME/.codex" ] && find "$HOME/.codex" -maxdepth 3 -iname '*agentmemory*' -print -quit 2>/dev/null | grep -q .; then
  echo "==> AgentMemory for Codex already configured, skipping"
else
  agentmemory connect codex
fi

echo "==> Installing AgentMemory skills"

pnpm dlx --yes skills add rohitg00/agentmemory -y


for f in .agents/skills/*; do
  [ -e "$f" ] || continue

  name="$(basename "$f")"

  ln -sfn "../../.agents/skills/$name" ".claude/skills/$name"
  ln -sfn "../../.agents/skills/$name" ".codex/skills/$name"
done

for f in .agents/rules/*; do
  [ -e "$f" ] || continue

  name="$(basename "$f")"

  ln -sfn "../../.agents/rules/$name" ".claude/rules/$name"
  ln -sfn "../../.agents/rules/$name" ".codex/rules/$name"
done

echo "==> Agent setup completed, please reload VS Code to ensure the agents are properly initialized."