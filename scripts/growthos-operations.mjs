// Private CLI; emits operational counts/checksums, never customer records or secrets.
import { loadWebsiteSettings } from '../src/lib/growthos-server.mjs';
import { backupWebsiteJournal, inspectWebsiteOperations } from '../src/lib/website-adapter/operations.mjs';

try {
  const action = process.argv[2];
  if (process.argv.length !== 3 || !['health', 'backup'].includes(action)) throw new Error('invalid_action');
  const { config } = loadWebsiteSettings();
  if (action === 'health') {
    const health = inspectWebsiteOperations(config);
    process.stdout.write(`${JSON.stringify(health)}\n`);
    if (health.status !== 'healthy') process.exitCode = 1;
  } else {
    const backup = await backupWebsiteJournal({ journalPath: config.journalPath, backupRoot: process.env.GROWTHOS_BACKUP_DIRECTORY });
    process.stdout.write(`${JSON.stringify({ directoryName: backup.directory.split(/[\\/]/).at(-1), ...backup.manifest })}\n`);
  }
} catch {
  process.stderr.write('GrowthOS operation unavailable. Review the configured private journal, worker, backup directory and supported runtime.\n');
  process.exitCode = 1;
}
