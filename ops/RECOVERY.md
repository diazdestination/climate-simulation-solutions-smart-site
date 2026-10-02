# Website worker and journal recovery

This is a private release candidate. No daemon, backup schedule, alert recipient,
customer website or hosting account is configured by these files.

## Host contract

- Run the web process and worker on the same approved persistent local volume.
  Do not share SQLite through SMB/NFS or run it on ephemeral/serverless storage.
- Use a supported Node release >=22.16 for the optional backup API (intake alone
  remains >=22.13). Give the service account access only to its checkout, journal,
  backup directory and secret-store environment. Web-served paths are rejected.
- Resolve every path/account in `growthos-website-worker.service.example` before
  installing it. Supply approved settings via a private service environment;
  `.env.local` is not loaded by worker or operations commands. The worker requires
  `GROWTHOS_WORKER_ENABLED=true`. Use the approved host's supervisor on Windows.
- The web process still needs its own supervisor, trusted ingress timeouts, shared
  abuse controls and TLS. Restarting a worker is not proof that these are ready.

## Worker health and alert acceptance

`npm run growthos:health` opens the journal read-only and prints counts and fixed
reason codes. Exit 0 means this observation is healthy; exit 1 requires attention.
It performs no provider request, drains no records and does not erase expired data.
No credential, customer text, request ID or private path is returned.

The worker writes a private atomic heartbeat only after a drain finishes. Defaults:

| Signal | Attention threshold |
|---|---|
| Heartbeat missing, wrong identity, stopped or failed | Immediately |
| Last heartbeat | Older than 3 minutes |
| Oldest queued/processing request | 5 minutes |
| Needs-review or expired record | Any |
| All journal partitions combined | 80% capacity warning; full at configured cap |

Connect the command's nonzero exit to an approved monitor and office escalation
destination. Also monitor disk space, backup age and the web process externally.
Exercise a stopped worker and full-disk failure on synthetic staging data; verify
the intended human receives the alert and can inspect the private delivery queue.
A local command returning healthy does not establish a working alert destination.

## Consistent backup

Set `GROWTHOS_BACKUP_DIRECTORY` to an existing absolute private directory, then run
`npm run growthos:backup` in the approved service environment. Each run creates a
new `growthos-journal-*` directory with `journal.sqlite` and `manifest.json`; it
never overwrites an earlier backup. SQLite's backup API includes committed WAL
contents while the source remains read-only. The manifest records integrity,
SHA-256, byte/row count and duration. `restoreVerified` intentionally stays false.

Retain the encryption key separately through the approved secret recovery process.
The backup contains encrypted pending payloads and sensitive metadata; restrict
ACLs and protect the backup volume. Unix modes do not establish Windows ACLs.
Do not put backups in Git, public folders or chat. Schedule/retention/off-host copy
and alert delivery require a reviewed host configuration; no schedule is installed.

## Rehearsal and recovery sequence

1. Use an isolated staging copy first. Keep public intake and all delivery workers
   stopped for an actual restore; review the operational impact before changing
   live services. Preserve the original volume for diagnosis and rollback.
2. Verify the backup manifest checksum/integrity. Restore to a new private location
   using the same journal key, API origin and site identity. A wrong key fails
   closed; a new destination cannot drain the old partition. Do not reuse the old
   heartbeat: start monitoring the restored worker as unobserved.
3. Restore/verify the authoritative GrowthOS intake receipt store for the same
   interval. An accepted CRM request whose website acknowledgement was lost must
   retry its original request ID and body and find the existing receipt. Never
   replace its ID, point it at a different company, clear a processing lease or
   assume a stale backup proves that an unlisted request was never accepted.
4. Inspect counts and held requests before releasing delivery. Active claims,
   expiration and uncertainty survive the copy; staff explicitly review holds.
   Reconcile possible lost work between the snapshot and failure against CRM
   receipts and approved source records. A backup alone cannot recover that gap.
5. Prove one synthetic queued retry, one lost-acknowledgement duplicate, one
   needs-review state, wrong-key rejection and a stopped-worker alert. Confirm
   exactly one CRM lead/task for the duplicate. Approve reopening intake only
   after the actual host, staff and provider path pass.

Record snapshot time, failure time, recovered point, rehearsal duration and any
unreconciled request count. Local test durations do not establish production RPO
or RTO. Include this external volume in customer export/deletion planning; the
main GrowthOS database backup does not contain it.
