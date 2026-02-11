#!/usr/bin/env python3
"""Build and push all 18 AIVO backend service Docker images to GHCR.
Streams docker output live to avoid buffering issues."""
import subprocess, time, sys, os

REGISTRY = "ghcr.io/artpromedia"
TAG = "latest"
DOCKERFILE = "docker/Dockerfile.service"
WORKDIR = r"c:\Users\ofema\aivo"

SERVICES = [
    "session-svc",
    "consent-svc",
    "profile-svc",
    "content-svc",
    "assessment-svc",
    "personalization-svc",
    "life-skills-svc",
    "ai-orchestrator",
    "analytics-svc",
    "notify-svc",
    "messaging-svc",
    "goal-svc",
    "focus-svc",
    "billing-svc",
    "payments-svc",
    "parent-svc",
    "baseline-svc",
]

succeeded = []
failed = []

print("=" * 60)
print(f"  Building & pushing {len(SERVICES)} services to GHCR")
print(f"  (auth-svc already pushed)")
print("=" * 60)
sys.stdout.flush()

for i, svc in enumerate(SERVICES):
    image = f"{REGISTRY}/aivo-{svc}:{TAG}"
    print(f"\n[{i+1}/{len(SERVICES)}] Building {svc}...")
    sys.stdout.flush()
    start = time.time()

    # Build — stream output to devnull to avoid buffering, just check result
    build_proc = subprocess.run(
        [
            "docker", "build",
            "--file", DOCKERFILE,
            "--build-arg", f"SERVICE_NAME={svc}",
            "--tag", image,
            "--platform", "linux/amd64",
            "--quiet",
            "."
        ],
        cwd=WORKDIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True
    )

    # Verify image exists (prisma warnings may cause non-zero exit)
    check = subprocess.run(["docker", "images", "-q", image], capture_output=True, text=True)
    if not check.stdout.strip():
        print(f"  FAILED build: {build_proc.stderr[-200:]}")
        sys.stdout.flush()
        failed.append(svc)
        continue

    bt = time.time() - start
    print(f"  Built {bt:.0f}s. Pushing...")
    sys.stdout.flush()

    # Push
    push_proc = subprocess.run(
        ["docker", "push", image],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True
    )
    if push_proc.returncode != 0:
        print(f"  FAILED push: {push_proc.stderr[-200:]}")
        sys.stdout.flush()
        failed.append(svc)
        continue

    tt = time.time() - start
    print(f"  Done {tt:.0f}s")
    sys.stdout.flush()
    succeeded.append(svc)

print(f"\n{'='*60}")
print(f"  DONE: {len(succeeded)}/{len(SERVICES)} succeeded")
if failed:
    print(f"  FAILED: {', '.join(failed)}")
print(f"{'='*60}")
sys.stdout.flush()
