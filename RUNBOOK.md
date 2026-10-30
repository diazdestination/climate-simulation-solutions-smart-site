# Runbook

## Development

Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`. With blank env values, the site previews safely and forms remain disabled. Use `npm run lint` and `npm run build` before a PR.

## Intake configuration

Set a verified public phone only after office approval. Set the GrowthOS webhook URL and token only in the deployment's secret store. The URL must use HTTPS. Restart or rebuild the deployment after changing public environment variables. Forms read private webhook configuration at request time.

## Failed request delivery

The form reports failure without claiming the request was received. Check endpoint availability, credential configuration, and the receiving system's logs. Do not log submitted customer details in site diagnostics. Coordinate with the office before retrying a potentially delivered request to avoid duplicates.

## Release

Keep each client site private and unindexed until the client approves public launch. Review the target account, repository, deployment, and domain before each external write.
