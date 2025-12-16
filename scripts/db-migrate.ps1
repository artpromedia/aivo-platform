<#
.SYNOPSIS
    Run database migrations for all AIVO services

.DESCRIPTION
    Executes Prisma migrations for all services in dependency order.

.EXAMPLE
    .\db-migrate.ps1
#>

& "$PSScriptRoot\db-setup.ps1" -Command migrate
