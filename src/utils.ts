import dotenv from "dotenv"
import * as fse from "fs-extra"
import * as YAML from "js-yaml"
import path from "node:path"
import { launchFoundryPrivate } from "./_launch"
import { getFoundryConfigPath, getFoundryPackageType, readPackageJson } from "./_utils"

/** Information about a Foundry VTT package. */
export interface FoundryInfo {
  /** The package identifier. */
  id: string
  /** The package title. */
  title: string
  /** The package version. */
  version: string
  /** The Foundry VTT required version. */
  required_version: string
  /** The Foundry VTT minimum version. */
  minimum_version: string
  /** The Foundry VTT maximum version. */
  maximum_version: string
  /* The package type: "module" or "system" ("world" package type is ignored). */
  type: "module" | "system"
  /* The path to package static files inside Foundry VTT. */
  path: string
  /* The prefix URL to the package inside Foundry VTT. */
  prefixUrl: string
}

export interface FoundryConfigInfo {
  dataPath: string[]
  installPath: string[]
  resolvedDataPath: string[]
  resolvedInstallPath: string[]
}

/**
 * Get Foundry VTT package information stored in "package.json".
 * @param rootPath The directory path to the root of the Foundry VTT package.
 * @param fileName The file name if different from "package.json".
 * @returns Foundry VTT package information.
 */
export async function getFoundryPackageInfo(
  rootPath = ".",
  fileName = "package.json",
): Promise<FoundryInfo & Record<string, string | unknown>> {
  const packageJson = await readPackageJson(rootPath, fileName)
  const foundry = packageJson.foundry as Partial<FoundryInfo> & Record<string, string | unknown>
  const packageType = await getFoundryPackageType(rootPath)
  const packageTypePrefix = `${packageType}s`
  return {
    type: packageType,
    ...foundry,
    path: `${packageTypePrefix}/${foundry.id}/`,
    prefixUrl: `/${packageTypePrefix}/${foundry.id}/`,
  } as FoundryInfo & Record<string, string | unknown>
}

/**
 * Get Foundry VTT config information stored in `foundry.{json|yaml|yml}` or `foundry.<OS>.{json|yaml|yml}`.
 * @param rootPath The directory path to the root of the Foundry VTT package.
 * @returns Foundry VTT configuration information.
 */
export async function getFoundryConfigInfo(rootPath = "."): Promise<FoundryConfigInfo | undefined> {
  const foundryConfigPath = await getFoundryConfigPath(rootPath)
  if (!foundryConfigPath) return undefined

  const foundryConfig =
    path.extname(foundryConfigPath) == ".json"
      ? await fse.readJSON(foundryConfigPath)
      : YAML.load(await fse.readFile(foundryConfigPath, "utf-8"), { json: true, filename: foundryConfigPath })

  let dataPaths = foundryConfig.dataPath ?? []
  if (!Array.isArray(dataPaths)) dataPaths = [dataPaths]
  foundryConfig.dataPath = dataPaths
  foundryConfig.resolvedDataPath = resolvePath(dataPaths)

  let installPaths = foundryConfig.installPath ?? []
  if (!Array.isArray(installPaths)) installPaths = [installPaths]
  foundryConfig.installPath = installPaths
  foundryConfig.resolvedInstallPath = resolvePath(installPaths)

  return foundryConfig

  function resolvePath(paths: string[]): string[] {
    return paths
      .map((p: string) => {
        p = p.replaceAll(getPattern(), (_, ...groups: string[]) => process.env[groups[0]] || "")
        if (!fse.statSync(path.resolve(p)).isDirectory()) {
          return undefined
        }
        return path.resolve(p)
      })
      .filter((x) => x !== undefined)

    function getPattern(): RegExp {
      return process.platform === "win32" ? /%(.*)%/g : /$(.*)/g
    }
  }
}

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

  const installPath = (() => {
    const installPath = foundryConfig.installPath
    if (installPath.length === 0)
      throw new Error("No installation path set in Foundry VTT config file! Please add some.")

    const resolvedInstallPath = foundryConfig.resolvedInstallPath
    if (!resolvedInstallPath)
      throw new Error("No installation path found!\nSearch for: \n - " + installPath.join("\n - "))

    return resolvedInstallPath[0]
  })()

  dataPath ??= (() => {
    const dataPath = foundryConfig.dataPath
    if (dataPath.length === 0) throw new Error("No data path set in Foundry VTT config file! Please add some.")

    const resolvedDataPath = foundryConfig.resolvedDataPath
    if (!resolvedDataPath) throw new Error("No data path found!\nSearch for: \n - " + dataPath.join("\n - "))

    return resolvedDataPath[0]
  })()

  dotenv.configDotenv({ path: rootPath, encoding: "utf-8" })
  const adminKey = process.env.ADMIN_KEY

  launchFoundryPrivate(installPath, dataPath, {
    demo,
    port: port ?? 30000,
    world,
    noupdate,
    noupnp,
    adminKey,
  })
}
