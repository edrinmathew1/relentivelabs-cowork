export function verifyCronSecret(req: Request): boolean {
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');
  const headerSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET || 'relentive_cron_secret_key_2026';

  return querySecret === expectedSecret || headerSecret === expectedSecret;
}
