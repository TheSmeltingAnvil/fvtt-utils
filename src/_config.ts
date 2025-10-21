import fs from "fs-extra"
import path from "path"
import YAML from "js-yaml"
import process from "process"
import { getFoundryConfigPath } from "./_utils/getFoundryConfigPath"

/** The information about a Foundry VTT configuration. */
export interface FoundryConfigInfo {
  /** The data paths for the Foundry VTT. */
  dataPath: string[]
  /** The installation paths for the Foundry VTT. */
  installPath: string[]
  /** The resolved data paths for the Foundry VTT. */
  resolvedDataPath: string[]
  /** The resolved installation paths for the Foundry VTT. */
  resolvedInstallPath: string[]
  /** The resolved main.js file path for the Foundry VTT. */
  resolvedMainJs: string
}
/**
 * Get Foundry VTT config information stored in `foundry.{json|yaml|yml}` or `foundry.<OS>.{json|yaml|yml}`.
 * @param cwd The directory path to the root of the Foundry VTT package.
 * @returns Foundry VTT configuration information.
 */
export async function getFoundryConfigInfo(cwd?: string): Promise<FoundryConfigInfo | undefined> {
  const foundryConfigPath = await getFoundryConfigPath(cwd)
  if (!foundryConfigPath) return undefined

  const foundryConfig =
    path.extname(foundryConfigPath) == ".json"
      ? await fs.readJSON(foundryConfigPath)
      : YAML.load(await fs.readFile(foundryConfigPath, "utf-8"), {
          json: true,
          filename: foundryConfigPath,
        })

  let dataPaths = foundryConfig.dataPath ?? []
  if (!Array.isArray(dataPaths)) dataPaths = [dataPaths]
  foundryConfig.dataPath = dataPaths
  foundryConfig.resolvedDataPath = resolvePath(dataPaths)

  let installPaths = foundryConfig.installPath ?? []
  if (!Array.isArray(installPaths)) installPaths = [installPaths]
  const resolvedInstallPath = resolvePath(installPaths)
  const resolvedMainJs = resolveMainJs(resolvedInstallPath)

  foundryConfig.installPath = installPaths
  foundryConfig.resolvedInstallPath = resolvedInstallPath
  foundryConfig.resolvedMainJs = resolvedMainJs

  return foundryConfig

  function replaceEnvVars(input: string): string {
    return input.replaceAll(getPattern(), (_, ...groups: string[]) => {
      return process.env[groups[0]] || ""
    })

    function getPattern(): RegExp {
      return process.platform === "win32" ? /%(.*)%/g : /$(.*)/g
    }
  }

  function resolvePath(paths: string[]): string[] {
    return paths
      .map((p: string) => {
        p = replaceEnvVars(p)
        if (!fs.statSync(path.resolve(p)).isDirectory()) {
          return undefined
        }
        return path.resolve(p)
      })
      .filter((p) => p !== undefined)
  }

  function resolveMainJs(paths: string[]): string {
    const candidates = paths
      .flatMap((p) => [
        path.normalize(path.join(p, "resources", "app", "main.js")), // before v13
        path.normalize(path.join(p, "main.js")), // v13
      ])
      .filter((p) => fs.pathExistsSync(p))
    if (candidates.length === 0) throw new Error("No main.js found in any of the installation paths.")
    return candidates[0]
  }
}
