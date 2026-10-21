import dgram from "node:dgram";
import dns, { lookup } from "node:dns";
import http from "node:http";
import net from "node:net";
import { describe, expect, it } from "vitest";

// Each call must fail synchronously with the blocker's error, never reach DNS (ENOTFOUND).
const HOST = "example.invalid";

describe("network blocking", () => {
  it("rejects third-party fetch", async () => {
    await expect(fetch(`https://${HOST}/`)).rejects.toThrow(/Network blocked/);
  });

  it("blocks http.get", () => {
    expect(() => http.get(`http://${HOST}/`)).toThrow(/Network blocked/);
  });

  it("blocks net.connect and net.createConnection in every call form", () => {
    expect(() => net.connect(80, HOST)).toThrow(/Network blocked/);
    expect(() => net.connect({ host: HOST, port: 80 })).toThrow(/Network blocked/);
    expect(() => net.createConnection({ host: HOST, port: 80 })).toThrow(/Network blocked/);
    expect(() => new net.Socket().connect(80, HOST)).toThrow(/Network blocked/);
  });

  it("blocks DNS lookups of third-party names, all resolver queries and UDP", async () => {
    expect(() => dns.lookup(HOST, () => undefined)).toThrow(/Network blocked/);
    expect(() => lookup(HOST, () => undefined)).toThrow(/Network blocked/);
    await expect(dns.promises.lookup(HOST)).rejects.toThrow(/Network blocked/);
    expect(() => dns.resolve4(HOST, () => undefined)).toThrow(/Network blocked/);
    expect(() => new dns.Resolver().resolveTxt(HOST, () => undefined)).toThrow(/Network blocked/);
    await expect(dns.promises.resolve(HOST)).rejects.toThrow(/Network blocked/);
    await expect(new dns.promises.Resolver().resolve4(HOST)).rejects.toThrow(/Network blocked/);
    expect(() => dns.lookupService("8.8.8.8", 53, () => undefined)).toThrow(/Network blocked/);
    await expect(dns.promises.lookupService("8.8.8.8", 53)).rejects.toThrow(/Network blocked/);
    const udp = dgram.createSocket("udp4");
    expect(() => udp.send("x", 53, "8.8.8.8")).toThrow(/Network blocked/);
    udp.close();
  });

  it("still resolves localhost", async () => {
    await expect(dns.promises.lookup("localhost")).resolves.toHaveProperty("address");
  });

  it("allows loopback", () => {
    const socket = net.connect({ host: "127.0.0.1", port: 9 });
    socket.on("error", () => undefined); // nothing listens; refusal is fine, blocking is not
    socket.destroy();
  });
});
