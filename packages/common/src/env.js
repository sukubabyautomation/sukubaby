function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return names.reduce((env, name) => {
    env[name] = process.env[name];
    return env;
  }, {});
}

module.exports = {
  requireEnv
};
