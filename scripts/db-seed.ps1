<#
.SYNOPSIS
    Run database seeding for all AIVO services

.DESCRIPTION
    Executes Prisma seed scripts for all services in dependency order.

.EXAMPLE
    .\db-seed.ps1
#>

& "$PSScriptRoot\db-setup.ps1" -Command seed
