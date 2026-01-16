#!/usr/bin/env node

/**
 * BrandGuard AI - Start All Services
 * 
 * Launches all required services in parallel:
 * - Backend Server (port 3000)
 * - MCP/AI Server (port 3001)
 * - Adobe Express UI (port 5241)
 * 
 * Usage: node start-all.cjs
 */

const { spawn } = require("child_process");
const path = require("path");
const chalk = require("chalk");

// Try to use chalk for colors, fallback to plain text
const log = {
  header: (msg) => console.log(`\n${"═".repeat(60)}\n${msg}\n${"═".repeat(60)}\n`),
  success: (msg) => console.log(`✓ ${msg}`),
  error: (msg) => console.error(`✗ ${msg}`),
  info: (msg) => console.log(`ℹ ${msg}`),
  server: (name, port) => console.log(`🚀 ${name} → http://localhost:${port}`),
};

const services = [
  {
    name: "Backend Server",
    cmd: "node",
    args: ["backend/src/server.js"],
    port: 3000,
  },
  {
    name: "MCP/AI Server",
    cmd: "node",
    args: ["server/simple-server.cjs"],
    port: 3001,
  },
  {
    name: "Adobe Express UI",
    cmd: "npm",
    args: ["start"],
    cwd: "brandguard-express",
    port: 5241,
  },
];

let activeServers = 0;
const processes = [];

log.header("BrandGuard AI - Starting All Services");

services.forEach((service) => {
  const cwd = service.cwd ? path.join(__dirname, service.cwd) : __dirname;
  
  const proc = spawn(service.cmd, service.args, {
    cwd,
    stdio: "pipe",
    shell: true,
  });

  processes.push(proc);
  activeServers++;

  // Output from service
  if (proc.stdout) {
    proc.stdout.on("data", (data) => {
      process.stdout.write(`[${service.name}] ${data}`);
    });
  }

  if (proc.stderr) {
    proc.stderr.on("data", (data) => {
      process.stderr.write(`[${service.name}] ${data}`);
    });
  }

  proc.on("close", (code) => {
    activeServers--;
    log.error(`${service.name} stopped (exit code: ${code})`);
    if (activeServers === 0) {
      log.info("All services stopped.");
      process.exit(0);
    }
  });

  log.server(service.name, service.port);
});

log.header("Services Running");
log.info("All services are running. Press Ctrl+C to stop.\n");

// Handle graceful shutdown
process.on("SIGINT", () => {
  log.info("\nShutting down all services...");
  processes.forEach((proc) => {
    try {
      proc.kill("SIGTERM");
    } catch (e) {
      // Process already terminated
    }
  });
  setTimeout(() => {
    log.success("All services stopped.");
    process.exit(0);
  }, 1000);
});

process.on("SIGTERM", () => {
  processes.forEach((proc) => proc.kill());
  process.exit(0);
});
