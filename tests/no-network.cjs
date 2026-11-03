"use strict";

const deny = (api) => {
  throw new Error(`OUTBOUND_NETWORK_FORBIDDEN:${api}`);
};

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: () => deny("fetch"),
  writable: true,
});

for (const name of ["node:http", "node:https"]) {
  const builtin = process.getBuiltinModule(name);
  builtin.request = () => deny(`${name}.request`);
  builtin.get = () => deny(`${name}.get`);
}

const net = process.getBuiltinModule("node:net");
net.connect = () => deny("node:net.connect");
net.createConnection = () => deny("node:net.createConnection");

const tls = process.getBuiltinModule("node:tls");
tls.connect = () => deny("node:tls.connect");

const dns = process.getBuiltinModule("node:dns");
for (const method of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"]) {
  dns[method] = () => deny(`node:dns.${method}`);
  if (dns.promises && method in dns.promises) dns.promises[method] = () => deny(`node:dns.promises.${method}`);
}
