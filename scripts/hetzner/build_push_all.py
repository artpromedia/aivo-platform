#!/usr/bin/env python3
"""Build and push all 18 AIVO backend service Docker images to GHCR."""
import subprocess, time, sys

REGISTRY = "ghcr.io/artpromedia"
TAG = "latest"
DOCKERFILE = "docker/Dockerfile.service"

SERVICES = [
    "auth-svc",        # Already pushed but re-build is cached
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
print(f"  Building & pushing {len(SERVICES)} AIVO services to GHCR")
print("=" * 60)

for i, svc in enumerate(SERVICES):
    image = f"{REGISTRY}/aivo-{svc}:{TAG}"
    print(f"\n[{i+1}/{len(SERVICES)}] 🔨 Building {svc} → {image}")
    start = time.time()

    # Build
    build_result = subprocess.run(
        [
            "docker", "build",
            "--file", DOCKERFILE,
            "--build-arg", f"SERVICE_NAME={svc}",
            "--tag", image,
            "--platform", "linux/amd64",
            "."
        ],
        capture_output=True, text=True, cwd=r"c:\Users\ofema\aivo"
    )

    # Check if image was actually created (exit code may be non-zero due to prisma warnings)
    check = subprocess.run(
        ["docker", "images", "-q", image],
        capture_output=True, text=True
    )

    if not check.stdout.strip():
        print(f"  ❌ BUILD FAILED for {svc}")
        # Print last 15 lines of build output for debugging
        lines = (build_result.stdout + build_result.stderr).strip().split("\n")
        for line in lines[-15:]:
            print(f"     {line}")
        failed.append(svc)
        continue

    build_time = time.time() - start
    print(f"  ✅ Built in {build_time:.0f}s — pushing...")

    # Push
    push_result = subprocess.run(
        ["docker", "push", image],
        capture_output=True, text=True
    )

    if push_result.returncode != 0:
        print(f"  ❌ PUSH FAILED for {svc}")
        print(f"     {push_result.stderr}")
        failed.append(svc)
        continue

    total_time = time.time() - start
    print(f"  ✅ Pushed in {total_time:.0f}s total")
    succeeded.append(svc)

print("\n" + "=" * 60)
print("  RESULTS")
print("=" * 60)
print(f"  ✅ Succeeded: {len(succeeded)}/{len(SERVICES)}")
for s in succeeded:
    print(f"     - {s}")
if failed:
    print(f"  ❌ Failed: {len(failed)}")
    for f in failed:
        print(f"     - {f}")
print()
