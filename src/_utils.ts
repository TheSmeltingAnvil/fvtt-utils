import * as fse from "fs-extra"
import path from "node:path"
import { platform } from "node:process"

/**
 * Get the full path to `foundry.{json|yaml|yml}` or `foundry.<OS>.{json|yaml|yml}` depending on operating system.
 * @param rootPath The directory path containing the Foundry VTT config file.
 * @returns The directory path to the Foundry VTT config file.
 */
export async function getFoundryConfigPath(rootPath = "."): Promise<string> {
  const searchPaths = getSearchPaths()
  for (const searchPath of searchPaths) {
    if (await fse.exists(searchPath)) {
      return searchPath
    }
  }

  throw new Error("No Foundry VTT config file found.\nSearch for:\n  - " + searchPaths.join("\n  - "))

  function getSearchPaths(): string[] {
    const searchPaths = [
      path.join(rootPath, "foundryconfig.yml"),
      path.join(rootPath, "foundryconfig.yaml"),
      path.join(rootPath, "foundryconfig.json"),
    ]
    const os = (() => {
      switch (platform) {
        case "darwin":
          return "macosx"
        case "linux":
          return "linux"
        case "win32":
          return "windows"
        default:
          return undefined
      }
    })()
    if (os) {
      const filenameWithoutExt = `foundryconfig.${os}`
      searchPaths.push(path.join(rootPath, filenameWithoutExt + ".yml"))
      searchPaths.push(path.join(rootPath, filenameWithoutExt + ".yaml"))
      searchPaths.push(path.join(rootPath, filenameWithoutExt + ".json"))
    }

    return searchPaths
  }
}

/**
 * Determines the Foundry VTT package kind.
 * @param rootPath The directory path containing the file.
 * @returns "system" if package is a system or "module" if package is a module.
 */
export async function getFoundryPackageType(rootPath = "."): Promise<"module" | "system"> {
  if (
    (await fse.exists(path.resolve(rootPath, "system.json"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "system.json"))) ||
    (await fse.exists(path.resolve(rootPath, "public", "system.json"))) ||
    (await fse.exists(path.resolve(rootPath, "static", "system.json"))) ||
    (await fse.exists(path.resolve(rootPath, "system.yml"))) ||
    (await fse.exists(path.resolve(rootPath, "system.yaml"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "system.yml"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "system.yaml")))
  ) {
    return "system"
  }

  if (
    (await fse.exists(path.resolve(rootPath, "module.json"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "module.json"))) ||
    (await fse.exists(path.resolve(rootPath, "public", "module.json"))) ||
    (await fse.exists(path.resolve(rootPath, "static", "module.json"))) ||
    (await fse.exists(path.resolve(rootPath, "module.yml"))) ||
    (await fse.exists(path.resolve(rootPath, "module.yaml"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "module.yml"))) ||
    (await fse.exists(path.resolve(rootPath, "src", "module.yaml")))
  ) {
    return "module"
  }

  throw new Error("Could not find either system.{json,yml} nor module.{json,yml}")
}

/**
 * Read values from "package.json"
 * @param rootPath Directory path containing the file.
 * @param fileName File name.
 * @returns Contents of "package.json" as object.
 */
export async function readPackageJson(rootPath = ".", fileName = "package.json"): Promise<Record<string, unknown>> {
  const filepath = path.resolve(path.join(rootPath, fileName))
  const data = await fse.readFile(filepath, "utf-8")
  return JSON.parse(data)
}
