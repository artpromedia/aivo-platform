$dir = "c:\Users\ofema\aivo\infra\k8s\base"
# All TS service YAMLs (exclude non-deployment files)
$excludeFiles = @("namespace.yaml", "kustomization.yaml")
$files = Get-ChildItem "$dir\*.yaml" | Where-Object { $excludeFiles -notcontains $_.Name }
Write-Host "Found $($files.Count) YAML files to fix"

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $newLines = [System.Collections.ArrayList]@()
    $inRequests = $false
    $inLimits = $false
    $addedEphReq = $false
    $addedEphLim = $false
    $addedAutoMount = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        [void]$newLines.Add($line)

        # Add automountServiceAccountToken after serviceAccountName line
        if ($line.Trim().StartsWith('serviceAccountName:') -and -not $addedAutoMount) {
            # Get the indentation of the current line
            $indent = $line -replace '^(\s+).*', '$1'
            [void]$newLines.Add("${indent}automountServiceAccountToken: false")
            $addedAutoMount = $true
        }

        # Track requests/limits blocks
        if ($line.Trim() -eq 'requests:') { $inRequests = $true; $addedEphReq = $false }
        if ($line.Trim() -eq 'limits:') { $inLimits = $true; $addedEphLim = $false; $inRequests = $false }

        # Add ephemeral-storage after memory in requests
        if ($inRequests -and (-not $addedEphReq) -and $line.Trim().StartsWith('memory:')) {
            $indent = $line -replace '^(\s+).*', '$1'
            [void]$newLines.Add("${indent}ephemeral-storage: `"128Mi`"")
            $addedEphReq = $true
            $inRequests = $false
        }

        # Add ephemeral-storage after memory in limits
        if ($inLimits -and (-not $addedEphLim) -and $line.Trim().StartsWith('memory:')) {
            $indent = $line -replace '^(\s+).*', '$1'
            [void]$newLines.Add("${indent}ephemeral-storage: `"512Mi`"")
            $addedEphLim = $true
            $inLimits = $false
        }
    }

    [System.IO.File]::WriteAllLines($file.FullName, $newLines.ToArray())
    Write-Host "Fixed: $($file.Name) (autoMount=$addedAutoMount, ephReq=$addedEphReq, ephLim=$addedEphLim)"
}

Write-Host "`nDone! All TS base service YAMLs fixed."
