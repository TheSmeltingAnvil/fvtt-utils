import process from "process"
import getFoundryConfigFileNames from "./getFoundryConfigFileNames"
import walkFiles from "./walkFiles"

/**
 * Get the full path to `foundryconfig.{json|yaml|yml}` or `foundryconfig.<OS>.{json|yaml|yml}`
 * depending on operating system.
 * @param cwd The directory path containing the Foundry VTT config file.
 * @returns The directory path to the Foundry VTT config file.
 */
export async function getFoundryConfigPath(cwd?: string): Promise<string> {
  const configCandidates = getFoundryConfigFileNames()
  cwd ??= process.cwd()
  const found = walkFiles(configCandidates, { cwd })
  if (found.length === 0)
    throw new Error("Could not find any foundryconfig.(json|yaml|yml) or foundryconfig.<OS>.(json|yaml|yml) file.")
  return found[0]
}
