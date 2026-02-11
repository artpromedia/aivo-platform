$dir = "c:\Users\ofema\aivo\infra\k8s\base\python-services"
$files = Get-ChildItem "$dir\*.yaml"
Write-Host "Found $($files.Count) YAML files to fix"

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $newLines = [System.Collections.ArrayList]@()
    $inRequests = $false
    $inLimits = $false
    $addedEphReq = $false
    $addedEphLim = $false
    $specFixed = $false
    $imageFixed = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        # Add :latest to image tag (only bare image without tag)
        if ($line -match '^\s+image: aivo/[\w-]+$' -and $line -notmatch ':latest') {
            $line = $line + ':latest'
            $imageFixed = $true
        }

        [void]$newLines.Add($line)

        # After template-level 'spec:' (exactly 4 spaces), add automountServiceAccountToken + securityContext
        if ($line.TrimEnd() -eq '    spec:' -and -not $specFixed) {
            [void]$newLines.Add('      automountServiceAccountToken: false')
            [void]$newLines.Add('      securityContext:')
            [void]$newLines.Add('        runAsNonRoot: true')
            [void]$newLines.Add('        runAsUser: 1000')
            [void]$newLines.Add('        fsGroup: 1000')
            $specFixed = $true
        }

        # Track requests/limits blocks
        if ($line.Trim() -eq 'requests:') { $inRequests = $true; $addedEphReq = $false }
        if ($line.Trim() -eq 'limits:') { $inLimits = $true; $addedEphLim = $false; $inRequests = $false }

        # Add ephemeral-storage after memory in requests
        if ($inRequests -and (-not $addedEphReq) -and $line.Trim().StartsWith('memory:')) {
            [void]$newLines.Add('              ephemeral-storage: 128Mi')
            $addedEphReq = $true
            $inRequests = $false
        }

        # Add ephemeral-storage after memory in limits
        if ($inLimits -and (-not $addedEphLim) -and $line.Trim().StartsWith('memory:')) {
            [void]$newLines.Add('              ephemeral-storage: 512Mi')
            $addedEphLim = $true
            $inLimits = $false
        }
    }

    [System.IO.File]::WriteAllLines($file.FullName, $newLines.ToArray())
    Write-Host "Fixed: $($file.Name) (spec=$specFixed, image=$imageFixed, ephReq=$addedEphReq, ephLim=$addedEphLim)"
}

Write-Host "`nDone! All python-services YAMLs fixed."
