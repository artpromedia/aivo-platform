<#
.SYNOPSIS
    Reset all AIVO databases

.DESCRIPTION
    Drops and recreates all databases, runs migrations, and seeds data.
    WARNING: This will DELETE all data!

.EXAMPLE
    .\db-reset.ps1
#>

& "$PSScriptRoot\db-setup.ps1" -Command reset
