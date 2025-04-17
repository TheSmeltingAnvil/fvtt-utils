import * as YAML from 'js-yaml';

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
declare function extractPack(src: string, dest: string, { nedb, yaml, yamlOptions, jsonOptions, log, documentType, collection, clean, folders, transformEntry, transformName, transformFolderName, }?: Partial<ExtractOptions>): Promise<void>;
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

/** Information about a Foundry VTT package. */
interface FoundryInfo {
    /** The package identifier. */
    id: string;
    /** The package title. */
    title: string;
    /** The package version. */
    version: string;
    /** The Foundry VTT required version. */
    required_version: string;
    /** The Foundry VTT minimum version. */
    minimum_version: string;
    /** The Foundry VTT maximum version. */
    maximum_version: string;
    type: "module" | "system";
    path: string;
    prefixUrl: string;
}
interface FoundryConfigInfo {
    dataPath: string[];
    installPath: string[];
    resolvedDataPath: string[];
    resolvedInstallPath: string[];
}
/**
 * Get Foundry VTT package information stored in "package.json".
 * @param rootPath The directory path to the root of the Foundry VTT package.
 * @param fileName The file name if different from "package.json".
 * @returns Foundry VTT package information.
 */
declare function getFoundryPackageInfo(rootPath?: string, fileName?: string): Promise<FoundryInfo & Record<string, string | unknown>>;
/**
 * Get Foundry VTT config information stored in `foundry.{json|yaml|yml}` or `foundry.<OS>.{json|yaml|yml}`.
 * @param rootPath The directory path to the root of the Foundry VTT package.
 * @returns Foundry VTT configuration information.
 */
declare function getFoundryConfigInfo(rootPath?: string): Promise<FoundryConfigInfo | undefined>;
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

export { type DocumentType, type FoundryConfigInfo, type FoundryInfo, compilePack, extractPack, getFoundryConfigInfo, getFoundryPackageInfo, launchFoundry };
