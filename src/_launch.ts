import { spawn } from "child_process"
import { getFoundryConfigInfo } from "./_config"
import * as dotenv from "dotenv"

/**
 * Launch the local Foundry VTT server if configuration is set.
 * @param rootPath The directory path to the root of the Foundry VTT package.
 * @param [options]
 * @param options.dataPath A custom data path in which data will persist for this Foundry VTT package.
 * @param options.world A custom world name to create (if none) and start inside Foundry VTT.
 * @param options.port The port to launch Foundry VTT on.
 * @param options.demo Launch Foundry VTT server in demo mode.
 * @param options.noupnp Disable UPnP port forwarding.
 * @param options.noupdate Disable automatic update checking.
 */
export async function launchFoundry(
  rootPath = ".",
  {
    dataPath,
    world,
    port,
    demo,
    noupnp,
    noupdate,
  }: {
    dataPath?: string
    world?: string
    port?: number
    demo?: boolean
    noupnp?: boolean
    noupdate?: boolean
  } = {},
) {
  const foundryConfig = await getFoundryConfigInfo(rootPath)
  if (!foundryConfig) return

  const mainJsPath = foundryConfig.resolvedMainJs

  dataPath ??= (() => {
    const dataPath = foundryConfig.dataPath
    if (dataPath.length === 0) throw new Error("No data path set in Foundry VTT config file! Please add some.")

    const resolvedDataPath = foundryConfig.resolvedDataPath
    if (!resolvedDataPath) throw new Error("No data path found!\nSearch for: \n - " + dataPath.join("\n - "))

    return resolvedDataPath[0]
  })()

  dotenv.configDotenv({ path: rootPath, encoding: "utf-8" })
  const adminKey = process.env.ADMIN_KEY

  launchFoundryPrivate(mainJsPath, dataPath, {
    demo,
    port: port ?? 30000,
    world,
    noupdate,
    noupnp,
    adminKey,
  })
}

/**
 * Launch the local Foundry VTT server.
 * Forked from @foundryvtt/cli
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
function launchFoundryPrivate(
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
