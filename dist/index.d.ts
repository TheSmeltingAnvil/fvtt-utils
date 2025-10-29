import * as YAML from 'js-yaml';

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
 * Compile source files into a compendium pack.
 * @param src   The directory containing the source files.
 * @param dest  The target compendium pack. This should be a directory for LevelDB packs, or a .db file for NeDB packs.
 * @param [options]
 * @param options.nedb            Whether to operate on a NeDB database, otherwise a LevelDB database is assumed. (For compatibility ONLY)
 * @param options.yaml            Whether the source files are in YAML format, otherwise JSON is assumed.
 * @param options.log             Whether to log operation progress to the console.
 * @param options.transformEntry  A function that is called on every entry to transform it.
 * @param options.recursive       Whether to recurse into child directories to locate source files, otherwise
 *                                only source files located in the root directory will be used.
 */
declare function compilePack(src: string, dest: string, { nedb, yaml, recursive, log, transformEntry }?: Partial<CompileOptions>): Promise<void>;
/**
 * Extract the contents of a compendium pack into individual source files for each primary Document.
 * @param src   The source compendium pack. This should be a directory for LevelDB pack, or a .db file for NeDB packs.
 * @param dest  The directory to write the extracted files into.
 * @param [options]
 * @param options.nedb           Whether to operate on a NeDB database, otherwise a LevelDB database is assumed. (For compatibility ONLY)
 * @param options.yaml           Whether the source files are in YAML format, otherwise JSON is assumed.
 * @param options.log            Whether to log operation progress to the console.
 * @param options.transformEntry A function that is called on every entry to transform it.
 */
declare function extractPack(src: string, dest: string, { nedb, yaml, yamlOptions, jsonOptions, log, clean, folders, transformEntry, transformName, transformFolderName, }?: Partial<ExtractOptions>): Promise<void>;
/**
 * @param entry The entry data.
 * @returns `false` to indicate that this entry should be discarded.
 */
type EntryTransformer = (entry: object) => Promise<false | void>;
interface PackageOptions {
    /**
     * Whether to operate on a NeDB database, otherwise a LevelDB database is assumed.
     * (For compatibility ONLY)
     */
    nedb: boolean;
    /** Whether the source files are in YAML format, otherwise JSON is assumed. */
    yaml: boolean;
    /** Whether to log operation progress to the console. */
    log: boolean;
    /** A function that is called on every entry to transform it. */
    transformEntry: EntryTransformer;
}
interface CompileOptions extends PackageOptions {
    /**
     * Whether to recurse into child directories to locate source files, otherwise
     * only source files located in the root directory will be used.
     */
    recursive?: boolean;
}
interface ExtractOptions extends PackageOptions {
    /**  Create a directory structure that matches the compendium folders. */
    folders: boolean;
    yamlOptions: YAML.DumpOptions;
    jsonOptions: JSONOptions;
    documentType: DocumentType;
    clean: boolean;
    collection: DocumentCollection;
    transformName: NameTransformer;
    /** A function used to generate a filename for an extracted folder when the folders option is enabled. */
    transformFolderName: NameTransformer;
}
interface JSONOptions {
    replacer?: JSONReplacer | (string | number)[];
    space?: string | number;
}
type JSONReplacer = (key: string, value: object) => object;
type NameTransformer = (entry: object, context?: {
    folder: string;
}) => Promise<string | void>;
type DocumentType = "Actor" | "Adventure" | "Cards" | "ChatMessage" | "Combat" | "FogExploration" | "Folder" | "Item" | "JournalEntry" | "Macro" | "Playlist" | "RollTable" | "Scene" | "Setting" | "User";
type DocumentCollection = "actors" | "adventures" | "cards" | "messages" | "combats" | "fog" | "folders" | "items" | "journal" | "macros" | "playlists" | "tables" | "scenes" | "settings" | "users";

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

export { type DocumentType, type FoundryConfigInfo, type Manifest, type ManifestInfo, type ManifestType, compilePack, extractPack, findManifest, getFoundryConfigInfo, launchFoundry };
