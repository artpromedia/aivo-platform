#!/usr/bin/env bash
# =============================================================================
# AIVO Platform — GitHub Actions Self-Hosted Runner Setup
# =============================================================================
# Run this script on each Hetzner server that should act as a deploy runner.
# It installs the GitHub Actions runner as a systemd service.
#
# Prerequisites:
#   - Linux server with root/sudo access
#   - kubectl configured and working (K3s)
#   - kustomize installed
#   - git installed
#   - curl installed
#
# Usage:
#   sudo bash setup-github-runner.sh \
#     --token <RUNNER_REG_TOKEN> \
#     --labels "hetzner,staging" \
#     --name "hetzner-staging-01"
#
# To get the registration token:
#   1. Go to GitHub repo → Settings → Actions → Runners → New self-hosted runner
#   2. Copy the token from the configure step
#   OR use the API:
#   gh api -X POST repos/artpromedia/aivo-platform/actions/runners/registration-token \
#     --jq '.token'
# =============================================================================

set -euo pipefail

# ── Parse arguments ──────────────────────────────────────────────────────────

RUNNER_TOKEN=""
RUNNER_LABELS="hetzner"
RUNNER_NAME="hetzner-runner-$(hostname)"
RUNNER_USER="github-runner"
RUNNER_DIR="/opt/github-runner"
REPO_URL="https://github.com/artpromedia/aivo-platform"
RUNNER_VERSION="2.322.0"   # Check https://github.com/actions/runner/releases

while [[ $# -gt 0 ]]; do
  case $1 in
    --token)   RUNNER_TOKEN="$2"; shift 2 ;;
    --labels)  RUNNER_LABELS="$2"; shift 2 ;;
    --name)    RUNNER_NAME="$2"; shift 2 ;;
    --version) RUNNER_VERSION="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$RUNNER_TOKEN" ]]; then
  echo "❌ --token is required. Get it from:"
  echo "   gh api -X POST repos/artpromedia/aivo-platform/actions/runners/registration-token --jq '.token'"
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  GitHub Actions Self-Hosted Runner Setup"
echo "═══════════════════════════════════════════════════"
echo "  Name:    $RUNNER_NAME"
echo "  Labels:  $RUNNER_LABELS"
echo "  Dir:     $RUNNER_DIR"
echo "  Version: $RUNNER_VERSION"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Step 1: Create runner user ───────────────────────────────────────────────

if ! id "$RUNNER_USER" &>/dev/null; then
  echo "Creating user: $RUNNER_USER"
  useradd -m -s /bin/bash "$RUNNER_USER"
else
  echo "User $RUNNER_USER already exists"
fi

# Grant kubectl access — copy kubeconfig
echo "Setting up kubectl access for $RUNNER_USER..."
RUNNER_HOME=$(eval echo "~$RUNNER_USER")
mkdir -p "$RUNNER_HOME/.kube"

# K3s kubeconfig
if [[ -f /etc/rancher/k3s/k3s.yaml ]]; then
  cp /etc/rancher/k3s/k3s.yaml "$RUNNER_HOME/.kube/config"
  chown "$RUNNER_USER:$RUNNER_USER" "$RUNNER_HOME/.kube/config"
  chmod 600 "$RUNNER_HOME/.kube/config"
  echo "  ✅ K3s kubeconfig copied"
elif [[ -f "$HOME/.kube/config" ]]; then
  cp "$HOME/.kube/config" "$RUNNER_HOME/.kube/config"
  chown "$RUNNER_USER:$RUNNER_USER" "$RUNNER_HOME/.kube/config"
  chmod 600 "$RUNNER_HOME/.kube/config"
  echo "  ✅ Kubeconfig copied from $HOME"
else
  echo "  ⚠  No kubeconfig found — you'll need to set this up manually"
fi

# ── Step 2: Install runner ───────────────────────────────────────────────────

echo ""
echo "Installing GitHub Actions runner v${RUNNER_VERSION}..."
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  RUNNER_ARCH="x64" ;;
  aarch64) RUNNER_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

RUNNER_TAR="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TAR}"

if [[ ! -f "$RUNNER_DIR/run.sh" ]]; then
  echo "  Downloading runner..."
  curl -sL "$RUNNER_URL" -o "/tmp/$RUNNER_TAR"
  tar xzf "/tmp/$RUNNER_TAR" -C "$RUNNER_DIR"
  rm -f "/tmp/$RUNNER_TAR"
  echo "  ✅ Runner extracted"
else
  echo "  Runner already installed, skipping download"
fi

chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"

# ── Step 3: Configure runner ─────────────────────────────────────────────────

echo ""
echo "Configuring runner..."

# Run configure as the runner user
sudo -u "$RUNNER_USER" "$RUNNER_DIR/config.sh" \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work "$RUNNER_DIR/_work" \
  --replace \
  --unattended

echo "  ✅ Runner configured"

# ── Step 4: Install as systemd service ───────────────────────────────────────

echo ""
echo "Installing systemd service..."

cat > /etc/systemd/system/github-runner.service <<EOF
[Unit]
Description=GitHub Actions Self-Hosted Runner
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$RUNNER_USER
Group=$RUNNER_USER
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always
RestartSec=10
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=60

# Environment
Environment="HOME=$RUNNER_HOME"
Environment="KUBECONFIG=$RUNNER_HOME/.kube/config"
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$RUNNER_DIR $RUNNER_HOME /tmp

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable github-runner.service
systemctl start github-runner.service

echo "  ✅ Service installed and started"

# ── Step 5: Verify ──────────────────────────────────────────────────────────

echo ""
echo "Verifying runner..."
sleep 3

if systemctl is-active --quiet github-runner.service; then
  echo "  ✅ Runner service is running"
else
  echo "  ❌ Runner service failed to start"
  echo "  Check: journalctl -u github-runner.service -n 50"
  exit 1
fi

# Verify kubectl access
if sudo -u "$RUNNER_USER" kubectl get nodes &>/dev/null; then
  echo "  ✅ kubectl works for $RUNNER_USER"
else
  echo "  ⚠  kubectl not working for $RUNNER_USER — check kubeconfig"
fi

# Verify kustomize
if sudo -u "$RUNNER_USER" which kustomize &>/dev/null; then
  echo "  ✅ kustomize found"
else
  echo "  ⚠  kustomize not found — installing..."
  curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
  mv kustomize /usr/local/bin/
  echo "  ✅ kustomize installed"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ GitHub Actions Runner Setup Complete"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Name:    $RUNNER_NAME"
echo "  Labels:  $RUNNER_LABELS"
echo "  Status:  $(systemctl is-active github-runner.service)"
echo ""
echo "  Useful commands:"
echo "    systemctl status github-runner.service"
echo "    journalctl -u github-runner.service -f"
echo "    systemctl restart github-runner.service"
echo ""
echo "  The runner should appear at:"
echo "    $REPO_URL/settings/actions/runners"
echo ""
