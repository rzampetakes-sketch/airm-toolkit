// Minimal structured logger. Kept dependency-free on purpose — swap in
// pino/winston later if you need log shipping, without touching call sites.
function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`[${timestamp()}] INFO`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] WARN`, ...args),
  error: (...args) => console.error(`[${timestamp()}] ERROR`, ...args),
};

module.exports = logger;
