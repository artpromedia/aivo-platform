# SIS Rostering Sync

> Automatic class roster synchronization from Student Information Systems to Aivo.

## Overview

The SIS Sync system enables districts to automatically import and maintain roster data from their Student Information Systems (SIS) in Aivo. This eliminates manual data entry and keeps Aivo synchronized with your authoritative source of truth for schools, teachers, students, and class enrollments.

## Supported Integrations

| Provider | Method | Status |
|----------|--------|--------|
| [Clever](https://clever.com) | REST API (OAuth 2.0) | ✅ Supported |
| [ClassLink](https://classlink.com) | REST API (OneRoster 1.1) | ✅ Supported |
| OneRoster API | REST API (1.1 Spec) | ✅ Supported |
| OneRoster CSV | SFTP File Transfer | ✅ Supported |

## How It Works

### 1. Configure Your Integration

District administrators connect their SIS through the District Admin portal:

1. Navigate to **Integrations → SIS Integration**
2. Click **Add Integration**
3. Select your SIS provider
4. Enter API credentials from your SIS
5. Test the connection
6. Set a sync schedule (or manual only)

### 2. Data Synchronization

When a sync runs (scheduled or manual):

1. **Extract**: Pulls current roster data from your SIS
2. **Transform**: Normalizes data to Aivo's format
3. **Load**: Creates/updates Aivo entities

### 3. Ongoing Maintenance

- **Daily syncs** keep Aivo current with SIS changes
- **New students** are automatically provisioned
- **Class changes** are reflected immediately
- **Withdrawals** soft-delete users (data retained per policy)

## Data Synced

| SIS Entity | Aivo Entity | Notes |
|------------|-------------|-------|
| Schools | Schools | School name, number, grades |
| Sections/Classes | Classrooms | Name, subject, grade, term |
| Teachers | Teachers | Name, email, school assignment |
| Students | Learners | Name, email, grade, enrollment |
| Enrollments | Class membership | Student-class and teacher-class links |

## Setup Guide

### Getting Clever Credentials

1. Log into [Clever Dashboard](https://clever.com/dashboard)
2. Go to **Settings → API**
3. Create a new application
4. Copy **Client ID** and **Client Secret**
5. Note your **District ID**
6. Complete OAuth authorization

### Getting ClassLink Credentials

1. Log into ClassLink Management Console
2. Navigate to **Integrations → OneRoster**
3. Enable OneRoster API access
4. Copy **Client ID**, **Client Secret**, and **Tenant ID**

### Using OneRoster API

Any SIS supporting OneRoster 1.1 can be connected:

1. Obtain API credentials from your SIS vendor
2. Get the OneRoster Base URL
3. Configure in Aivo with client ID/secret

### Using OneRoster CSV

For SIS systems that export OneRoster CSV files:

1. Set up an SFTP server (or use SIS-provided SFTP)
2. Configure automatic CSV exports from your SIS
3. Enter SFTP credentials in Aivo
4. Specify the remote directory path

## Scheduling

Sync schedules use cron expressions. Common presets:

| Schedule | Description |
|----------|-------------|
| Daily at 2 AM | `0 2 * * *` |
| Weekdays at 6 AM | `0 6 * * 1-5` |
| Every 6 hours | `0 */6 * * *` |
| Manual only | (no schedule) |

## FAQ

### How often should I sync?

**Daily syncs at night** (e.g., 2 AM) work well for most districts. This ensures data is fresh each school day while minimizing system load.

### What happens when a student leaves?

When a student is no longer in the SIS roster, they are **soft-deleted** in Aivo:
- Account is deactivated (can't log in)
- Historical data is retained per your data retention policy
- Can be reactivated if student returns

### Can I run a sync manually?

Yes! Click **Run Sync Now** on any integration to trigger an immediate sync. This is useful for:
- Initial setup testing
- After bulk SIS changes
- Troubleshooting

### What if the sync fails?

The system will:
1. Log the error with details
2. Mark the sync as failed
3. **Not** change any existing data (atomic operation)
4. Retry on the next scheduled run

District admins can view error details in sync history.

### How are users matched?

Users are matched in this order:
1. **External ID** from previous syncs
2. **Email address** (for existing Aivo users)
3. **Student number** (for students)
4. **Create new** if no match found

### Is my data secure?

Yes:
- API credentials are encrypted at rest
- All transfers use TLS/HTTPS
- Only District Admins can access SIS settings
- All sync operations are audit logged

## Troubleshooting

### "Connection test failed"

1. Verify credentials are correct (check for typos)
2. Ensure your SIS has approved the Aivo integration
3. Check if OAuth tokens need to be refreshed
4. Verify network connectivity to SIS API

### "Users not syncing"

1. Verify users have valid email addresses in SIS
2. Check that user roles are configured correctly
3. Review sync logs for specific errors
4. Ensure users aren't filtered out by SIS sharing rules

### "Sync taking too long"

Large districts (10,000+ users) may take 15-30 minutes:
1. This is normal for initial syncs
2. Subsequent syncs are faster (delta updates)
3. Consider scheduling during off-hours

## Support

For help with SIS integration:

1. Check the [full documentation](./services/sis-sync-svc/README.md)
2. Contact your district's Aivo administrator
3. Reach out to Aivo support for technical issues
