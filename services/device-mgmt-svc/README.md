# Device Management Service

## Overview

Service for managing device registration, inventory, and policy enforcement across district-deployed devices.

## Features

- **Device Registration**: Register tablets, Chromebooks, and other devices
- **Device Pools**: Group devices by lab, grade, or purpose
- **Policy Enforcement**: Apply kiosk mode, grade-band theming, offline limits
- **Inventory Management**: Track device check-ins, versions, and status

## Data Model

### Devices
- Uniquely identified by `(tenantId, deviceIdentifier)`
- Tracks app version, OS version, last check-in time
- Can belong to multiple device pools

### Device Pools
- Logical groupings (e.g., "Lab A iPads", "Grade 3 Chromebooks")
- Optional grade band association for theming
- School-specific or district-wide

### Policies
- Applied at the pool level
- JSON configuration for flexibility
- Includes: kioskMode, maxOfflineDays, gradeBand, etc.

## API Endpoints

### Device Registration & Check-in

```
POST /devices/register
POST /devices/check-in
GET  /devices/:id
```

### Device Management

```
GET    /devices
PATCH  /devices/:id
DELETE /devices/:id
```

### Pool Management

```
GET    /pools
POST   /pools
GET    /pools/:id
PATCH  /pools/:id
DELETE /pools/:id
POST   /pools/:id/devices
DELETE /pools/:id/devices/:deviceId
```

### Policy Management

```
GET    /pools/:id/policy
PUT    /pools/:id/policy
DELETE /pools/:id/policy
```

## Environment Variables

```
DATABASE_URL=postgresql://...
PORT=3010
JWT_PUBLIC_KEY=...
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Start dev server
pnpm dev
```
