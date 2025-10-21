import { platform } from "process"

/** The default candidates for Foundry VTT config file names. */
const defaultFoundryConfigCandidates: readonly string[] = [
  "**/foundryconfig.json",
  "**/foundryconfig.yaml",
  "**/foundryconfig.yml",
] as const

/**
 * Get the possible Foundry VTT config file names.
 * @returns The possible Foundry VTT config file names.
 */
export default function getFoundryConfigFileNames(): string[] {
  const searchPaths: string[] = [...defaultFoundryConfigCandidates]
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
    const filenameWithoutExt = `**/foundryconfig.${os}`
    searchPaths.push(filenameWithoutExt + ".json")
    searchPaths.push(filenameWithoutExt + ".yaml")
    searchPaths.push(filenameWithoutExt + ".yml")
  }

  return searchPaths
}
