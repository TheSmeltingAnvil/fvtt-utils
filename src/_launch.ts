// Forked from @froundryvtt/cli

import { spawn } from "node:child_process"
import path from "node:path"

/**
 *
 * @param mainJsPath
 * @param dataPath
 * @param [options] The options.
 * @param options.demo Launch Foundry VTT server in demo mode.
 * @param options.port The port to launch Foundry VTT on.
 * @param options.world The world to launch Foundry VTT with.
 * @param options.noupnp Disable UPnP port forwarding.
 * @param options.noupdate Disable automatic update checking.
 * @param options.adminKey The admin key to secure Foundry VTT's Setup screen with.
 */
export function launchFoundryPrivate(
  mainJsPath: string,
  dataPath: string,
  {
    world,
    port,
    demo,
    noupnp,
    noupdate,
    adminKey,
  }: {
    world?: string
    port: number
    demo?: boolean
    noupnp?: boolean
    noupdate?: boolean
    adminKey?: string
  } = { port: 30000 },
) {
  // Launch Foundry VTT
  const foundry = spawn("node", [
    mainJsPath,
    `--dataPath=${dataPath}`,
    `--port=${port}`,
    demo ? "--demo" : "",
    world ? `--world=${world}` : "",
    noupnp ? "--noupnp" : "",
    noupdate ? "--noupdate" : "",
    adminKey ? `--adminKey=${adminKey}` : "",
  ])

  foundry.stdout.on("data", (data) => console.log(data.toString()))
  foundry.stderr.on("data", (data) => console.error(data.toString()))
  foundry.on("close", (code) => console.log(`Foundry VTT exited with code ${code}`))
}
