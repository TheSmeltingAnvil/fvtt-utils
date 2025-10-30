/** The information about a Foundry VTT configuration. */
interface FoundryConfigInfo {
    /** The data paths for the Foundry VTT. */
    dataPath: string[];
    /** The installation paths for the Foundry VTT. */
    installPath: string[];
    /** The resolved data paths for the Foundry VTT. */
    resolvedDataPath: string[];
    /** The resolved installation paths for the Foundry VTT. */
    resolvedInstallPath: string[];
    /** The resolved main.js file path for the Foundry VTT. */
    resolvedMainJs: string;
}
/**
 * Get Foundry VTT config information stored in `foundry.{json|yaml|yml}` or `foundry.<OS>.{json|yaml|yml}`.
 * @param cwd The directory path to the root of the Foundry VTT package.
 * @returns Foundry VTT configuration information.
 */
declare function getFoundryConfigInfo(cwd?: string): Promise<FoundryConfigInfo | undefined>;

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
declare function launchFoundry(rootPath?: string, { dataPath, world, port, demo, noupnp, noupdate, }?: {
    dataPath?: string;
    world?: string;
    port?: number;
    demo?: boolean;
    noupnp?: boolean;
    noupdate?: boolean;
}): Promise<void>;

/** The type of Foundry VTT package manifest. */
type ManifestType = "module" | "system";
/** The information about a Foundry VTT package. */
interface Manifest {
    /** The package identifier. */
    id: string;
    /** The package title. */
    title: string;
    /** The package description. */
    description: string;
    /** The package version. */
    version: string;
    /** The ES modules. */
    esmodules: string[];
    /** The scripts. */
    scripts: string[];
    /** The styles. */
    styles: string[];
    /** The languages. */
    languages: Language[];
}
/** The information about a Foundry VTT package language. */
interface Language {
    /** The language code. */
    lang: string;
    /** The language name. */
    name: string;
    /** The language file path. */
    path: string;
}
/** The information about a Foundry VTT package manifest. */
interface ManifestInfo {
    /** The Foundry VTT package type. */
    type: ManifestType;
    /** The path to the manifest of the package. */
    path: string;
    /** Load the manifest data. */
    manifest: () => Promise<Manifest>;
    /** Get the base URL for the Foundry VTT package. */
    baseUrl: () => Promise<string | undefined>;
}
/**
 * Find the Foundry VTT manifest file.
 * @param cwd The current working directory to start searching from.
 * @returns The found manifest information.
 */
declare function findManifest(cwd?: string): Promise<ManifestInfo | undefined>;

export { type FoundryConfigInfo, type Manifest, type ManifestInfo, type ManifestType, findManifest, getFoundryConfigInfo, launchFoundry };
