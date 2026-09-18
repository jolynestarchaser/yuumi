/** Public diagnostic data only. Never return arbitrary environment values. */
export function deploymentRevision(environment: NodeJS.ProcessEnv = process.env) {
  const candidates = [environment.RAILWAY_GIT_COMMIT_SHA, environment.APP_COMMIT_SHA];
  const revision = candidates.find((value) => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value));
  return {
    revision: revision?.toLowerCase() ?? null,
    nodeVersion: process.version
  };
}
