# backups/

Backup archive for the Azhar database.

Both kinds of backup live here so everything is in one visible place inside the
project instead of scattered across the filesystem:

| File | What it is | Restore with |
|---|---|---|
| `azhar-YYYYMMDD-HHMMSS.dump` | `pg_dump` custom format — **schema, constraints, indexes and data**. The one to trust for a full restore. | `azhar-restore-auto <file>` |
| `azhar-YYYYMMDD-HHMMSS.sql` | Plain SQL, same data, readable with any text editor. | `psql -f <file>` |
| `upload-*.sql` / `upload-*.dump` | Files uploaded through the admin UI. | the **Restore** button on the row |
| `pre-restore-*.dump` | Automatic safety snapshot taken before every restore. | `azhar-restore-auto <file>` |

Scheduled backups run daily at 03:30 (`azhar-backup.timer`) and on boot.

**Files here are git-ignored** — a dump is a binary artefact and committing one
would bloat the repository. On a serverless deployment this folder is also
ephemeral, so a backup taken there is a download for *you* to keep, not storage
the platform retains. The self-hosted server is the durable copy.

To read a `.sql` backup:

    head -40 backups/azhar-*.sql
