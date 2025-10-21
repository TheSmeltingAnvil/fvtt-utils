import fs from "fs-extra"
import YAML from "js-yaml"
import path from "path"
import walkFiles from "./_utils/walkFiles"

/** The type of Foundry VTT package manifest. */
export type ManifestType = "module" | "system"

/** The information about a Foundry VTT package. */
export interface Manifest {
  /** The package identifier. */
  id: string
  /** The package title. */
  title: string
  /** The package version. */
  version: string
  /** The ES modules. */
  esmodules: string[]
  /** The scripts. */
  scripts: string[]
  /** The styles. */
  styles: string[]
  /** The languages. */
  languages: Language[]
}

/** The information about a Foundry VTT package language. */
export interface Language {
  /** The language code. */
  lang: string
  /** The language name. */
  name: string
  /** The language file path. */
  path: string
}

/** The information about a Foundry VTT package manifest. */
export interface ManifestInfo {
  /** The Foundry VTT package type. */
  type: ManifestType
  /** The path to the manifest of the package. */
  path: string
  /** Load the manifest data. */
  manifest: () => Promise<Manifest>
  /** Get the base URL for the Foundry VTT package. */
  baseUrl: () => Promise<string | undefined>
}

const manifestCandidates = [
  "**/module.json",
  "**/module.yaml",
  "**/module.yml",
  "**/system.json",
  "**/system.yaml",
  "**/system.yml",
]

/**
 * Find the Foundry VTT manifest file.
 * @param cwd The current working directory to start searching from.
 * @returns The found manifest information.
 */
export async function findManifest(cwd?: string): Promise<ManifestInfo | undefined> {
  cwd ??= process.cwd()
  const found = walkFiles(manifestCandidates, { cwd })
  if (found.length === 0) return undefined
  const manifestPath = found[0]
  const { base } = path.parse(manifestPath)
  let cachedManifest: Manifest | undefined = undefined
  const manifest = async () => (cachedManifest ??= await loadManifest(manifestPath))
  const manifestInfo = {
    path: manifestPath,
    type: base as ManifestType,
    manifest,
    baseUrl: () => getFoundryBaseUrl(manifestInfo),
  } satisfies ManifestInfo
  return manifestInfo
}

/**
 * Load the Foundry VTT manifest file.
 */
async function loadManifest(manifestPath: string): Promise<Manifest> {
  const { ext } = path.posix.parse(manifestPath)
  const manifestData = await fs.readFile(manifestPath, "utf8")
  return ext === ".json" ? (JSON.parse(manifestData) as Manifest) : (YAML.load(manifestData) as Manifest)
}

const mapping = new Map<ManifestType, string>([
  ["module", "/modules/"],
  ["system", "/systems/"],
])

/**
 * Get the base URL for a Foundry VTT package.
 * @param manifestInfo The Foundry VTT package manifest information.
 * @returns The base URL for the Foundry VTT package.
 */
async function getFoundryBaseUrl(manifestInfo: ManifestInfo): Promise<string | undefined> {
  const prefix = mapping.get(manifestInfo.type)
  if (!prefix) return undefined
  const { id } = (await manifestInfo.manifest()) ?? { id: undefined }
  if (!id) return undefined
  return path.posix.join(prefix, id)
}
