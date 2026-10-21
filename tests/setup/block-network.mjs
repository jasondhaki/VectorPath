// Blocks third-party network for unit tests and the E2E server (I10).
// Only loopback hosts (local app / isolated local database) and IPC pipes may connect.
import dgram from "node:dgram";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const isLocal = (host) => LOCAL.has(String(host).replace(/^\[|\]$/g, "").toLowerCase());
const blocked = (host) => new Error(`Network blocked in tests: ${host}`);

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!isLocal(url.hostname)) return Promise.reject(blocked(url.hostname));
  return realFetch(input, init);
};

/** Destination of any Socket#connect call form: (options), (port, host), (path), or Node's normalized [options, cb] array. */
export function connectTarget(args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === "object" && first !== null) {
    if (typeof first.path === "string") return { ipc: true };
    return { host: first.host ?? "localhost" }; // Node's own default when host is omitted
  }
  if (typeof first === "string" && !/^\d+$/.test(first)) return { ipc: true }; // pipe/socket path
  return { host: typeof args[1] === "string" ? args[1] : "localhost" };
}

const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  const target = connectTarget(args);
  if (!target.ipc && !isLocal(target.host)) throw blocked(target.host);
  return realConnect.apply(this, args);
};

// DNS: lookup (OS resolver) only for loopback names; resolver queries always go to a network server.
const realLookup = dns.lookup;
dns.lookup = function lookup(host, ...rest) {
  if (!isLocal(host)) throw blocked(host);
  return realLookup.call(this, host, ...rest);
};
const realLookupAsync = dns.promises.lookup;
dns.promises.lookup = (host, ...rest) => (isLocal(host) ? realLookupAsync(host, ...rest) : Promise.reject(blocked(host)));
const realLookupService = dns.lookupService;
dns.lookupService = function lookupService(address, ...rest) {
  if (!isLocal(address)) throw blocked(address);
  return realLookupService.call(this, address, ...rest);
};
const realLookupServiceAsync = dns.promises.lookupService;
dns.promises.lookupService = (address, ...rest) =>
  isLocal(address) ? realLookupServiceAsync(address, ...rest) : Promise.reject(blocked(address));
const isQuery = (name) => /^resolve|^reverse$/.test(name);
for (const target of [dns, dns.Resolver.prototype]) {
  for (const name of Object.keys(target).filter(isQuery)) target[name] = (host) => { throw blocked(host); };
}
for (const target of [dns.promises, dns.promises.Resolver.prototype]) {
  for (const name of Object.keys(target).filter(isQuery)) target[name] = (host) => Promise.reject(blocked(host));
}

// UDP has no legitimate test use (no local service speaks it), so it is blocked outright.
dgram.Socket.prototype.send = function send() {
  throw blocked("udp");
};
dgram.Socket.prototype.connect = function connect() {
  throw blocked("udp");
};

syncBuiltinESMExports(); // propagate the patches to named ESM imports, e.g. `import { lookup } from "node:dns"`
