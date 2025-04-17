// Forked from @froundryvtt/cli

import * as fse from "fs-extra"
import * as YAML from "js-yaml"
import path from "path"
import pc from "picocolors"
import { ClassicLevel } from "classic-level"

/* -------------------------------------------- */
/*  Compiling                                   */
/* -------------------------------------------- */

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
export async function compilePack(
  src: string,
  dest: string,
  { nedb = false, yaml = false, recursive = false, log = false, transformEntry }: Partial<CompileOptions> = {},
): Promise<void> {
  if (nedb) throw new Error("NeDB files are obsolete and only Classic database level files are handled!")
  const files = findSourceFiles(src, { yaml, recursive })
  return compileClassicLevel(dest, files, { log, transformEntry })
}

/**
 * Compile a set of files into a LevelDB compendium pack.
 * @param pack  The target compendium pack.
 * @param files The source files.
 * @param  [options]
 * @returns
 */
async function compileClassicLevel(
  pack: string,
  files: string[],
  { log, transformEntry }: Partial<PackageOptions> = {},
): Promise<void> {
  // Create the classic level directory if it doesn't already exist.
  fse.mkdirSync(pack, { recursive: true })

  // Load the directory as a ClassicLevel DB.
  const db = new ClassicLevel<string, Document>(pack, { keyEncoding: "utf8", valueEncoding: "json" })
  await db.open()
  const batch = db.batch()
  const seenKeys = new Set()

  const packDoc = applyHierarchy(async (doc: Document, collection: string) => {
    const key = doc._key as string
    delete doc._key
    if (seenKeys.has(key)) {
      throw new Error(`An entry with key '${key}' was already packed and would be overwritten by this entry.`)
    }
    seenKeys.add(key)
    const value = structuredClone(doc) as Document
    await mapHierarchy(value, collection, (d) => d._id)
    batch.put(key, value)
  })

  // Iterate over all files in the input directory, writing them to the DB.
  for (const file of files) {
    try {
      const contents = fse.readFileSync(file, "utf8")
      const ext = path.extname(file)
      const isYaml = ext === ".yml" || ext === ".yaml"
      const doc = isYaml ? YAML.load(contents) : JSON.parse(contents)
      const [, collection] = doc._key.split("!")
      if ((await transformEntry?.(doc)) === false) continue
      await packDoc(doc, collection)
      if (log) console.log(`Packed ${pc.blue(doc._id)}${pc.blue(doc.name ? ` (${doc.name})` : "")}`)
    } catch (err) {
      if (log) console.error(`Failed to pack ${pc.red(file)}. See error below.`)
      throw err
    }
  }

  // Remove any entries in the DB that are not part of the source set.
  for (const key of await db.keys().all()) {
    if (!seenKeys.has(key)) {
      batch.del(key)
      if (log) console.log(`Removed ${pc.blue(key)}`)
    }
  }

  await batch.write()
  await compactClassicLevel(db)
  await db.close()
}

/**
 * Flushes the log of the given database to create compressed binary tables.
 * @param db The database to compress.
 * @returns
 */
async function compactClassicLevel(db: ClassicLevel<string, Document>): Promise<void> {
  const forwardIterator = db.keys({ limit: 1, fillCache: false })
  const firstKey = await forwardIterator.next()
  await forwardIterator.close()

  const backwardIterator = db.keys({ limit: 1, reverse: true, fillCache: false })
  const lastKey = await backwardIterator.next()
  await backwardIterator.close()

  if (firstKey && lastKey) return db.compactRange(firstKey, lastKey, { keyEncoding: "utf8" })
}

/* -------------------------------------------- */
/*  Extracting                                  */
/* -------------------------------------------- */

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
export async function extractPack(
  src: string,
  dest: string,
  {
    nedb = false,
    yaml = false,
    yamlOptions = {},
    jsonOptions = {},
    log = false,
    documentType,
    collection,
    clean,
    folders,
    transformEntry,
    transformName,
    transformFolderName,
  }: Partial<ExtractOptions> = {},
): Promise<void> {
  if (nedb) throw new Error("NeDB files are obsolete and only Classic database level files are handled!")
  if (!documentType) {
    throw new Error("The documentType option was undefined.")
  }
  collection ??= TYPE_COLLECTION_MAP[documentType]
  if (clean) fse.rmSync(dest, { force: true, recursive: true, maxRetries: 10 })
  // Create the output directory if it doesn't exist already.
  fse.mkdirSync(dest, { recursive: true })
  return extractClassicLevel(src, dest, {
    yaml,
    log,
    yamlOptions,
    jsonOptions,
    folders,
    transformEntry,
    transformName,
    transformFolderName,
  })
}

/**
 * Extract a LevelDB pack into individual source files for each primary Document.
 * @param pack  The source compendium pack.
 * @param dest  The root output directory.
 * @param [options]
 * @returns
 */
async function extractClassicLevel(
  pack: string,
  dest: string,
  {
    yaml,
    yamlOptions,
    jsonOptions,
    log,
    folders,
    transformEntry,
    transformName,
    transformFolderName,
  }: Partial<ExtractOptions>,
): Promise<void> {
  // Load the directory as a ClassicLevel DB.
  const db = new ClassicLevel<string, Document>(pack, { keyEncoding: "utf8", valueEncoding: "json" })
  await db.open()
  const foldersMap = new Map()
  // Build up the folder structure
  if (folders) {
    for await (const [key, doc] of db.iterator()) {
      if (!key.startsWith("!folders")) continue
      let name = await transformFolderName?.(doc)
      if (!name) name = doc.name ? `${getSafeFilename(doc.name)}_${doc._id}` : key
      foldersMap.set(doc._id, { name, folder: doc.folder })
    }
    for (const folder of foldersMap.values()) {
      let parent = foldersMap.get(folder.folder)
      folder.path = folder.name
      while (parent) {
        folder.path = path.join(parent.name, folder.path)
        parent = foldersMap.get(parent.folder)
      }
    }
  }

  const unpackDoc = applyHierarchy(async (doc: Document, collection: string, options: unknown = {}) => {
    const { sublevelPrefix, idPrefix } = options as { sublevelPrefix: string; idPrefix: string }
    const sublevel = keyJoin(sublevelPrefix, collection)
    const id = keyJoin(idPrefix, doc._id)
    doc._key = `!${sublevel}!${id}`
    await mapHierarchy(doc, collection, (embeddedId, embeddedCollectionName) => {
      return db.get(`!${sublevel}.${embeddedCollectionName}!${id}.${embeddedId}`)
    })
    return { sublevelPrefix: sublevel, idPrefix: id }
  })

  // Iterate over all entries in the DB, writing them as source files.
  for await (const [key, doc] of db.iterator()) {
    const [, collection, id] = key.split("!")
    if (collection.includes(".")) continue // This is not a primary document, skip it.
    await unpackDoc(doc, collection)
    if ((await transformEntry?.(doc)) === false) continue
    const folder = foldersMap?.get(doc.folder)?.path
    let name = await transformName?.(doc, { folder })
    if (!name) {
      if (key.startsWith("!folders") && foldersMap?.has(doc._id)) {
        const folder = foldersMap.get(doc._id)
        name = path.join(folder.name, `_Folder.${yaml ? "yml" : "json"}`)
      } else {
        name = `${doc.name ? `${getSafeFilename(doc.name)}_${id}` : key}.${yaml ? "yml" : "json"}`
      }
      if (folder) name = path.join(folder, name)
    }
    const filename = path.join(dest, name)
    serializeDocument(doc, filename, { yaml, yamlOptions, jsonOptions })
    if (log) console.log(`Wrote ${pc.blue(name)}`)
  }

  await db.close()
}

/* -------------------------------------------- */
/*  Utilities                                   */
/* -------------------------------------------- */

/**
 * Wrap a function so that it can be applied recursively to a Document's hierarchy.
 * @param fn  The function to wrap.
 * @returns The wrapped function.
 */
function applyHierarchy(fn: HierarchyApplyCallback): HierarchyApplyCallback {
  const apply = async (doc: Document, collection: string, options: unknown = {}) => {
    const newOptions = (await fn(doc, collection, options)) as Document
    for (const [embeddedCollectionName, type] of Object.entries(HIERARCHY[collection] ?? {})) {
      const embeddedValue = doc[embeddedCollectionName]
      if (Array.isArray(type) && Array.isArray(embeddedValue)) {
        for (const embeddedDoc of embeddedValue) await apply(embeddedDoc, embeddedCollectionName, newOptions ?? {})
      } else if (embeddedValue) {
        await apply(embeddedValue, embeddedCollectionName, newOptions ?? {})
      }
    }
  }
  return apply
}

/**
 * Transform a Document's embedded collections by applying a function to them.
 * @param {object} doc               The Document being operated on.
 * @param {string} collection        The Document's collection.
 * @param {HierarchyMapCallback} fn  The function to invoke.
 */
async function mapHierarchy(doc, collection, fn) {
  for (const [embeddedCollectionName, type] of Object.entries(HIERARCHY[collection] ?? {})) {
    const embeddedValue = doc[embeddedCollectionName]
    if (Array.isArray(type)) {
      if (Array.isArray(embeddedValue)) {
        doc[embeddedCollectionName] = await Promise.all(
          embeddedValue.map((entry) => {
            return fn(entry, embeddedCollectionName)
          }),
        )
      } else doc[embeddedCollectionName] = []
    } else {
      if (embeddedValue) doc[embeddedCollectionName] = await fn(embeddedValue, embeddedCollectionName)
      else doc[embeddedCollectionName] = null
    }
  }
}

/**
 * Locate all source files in the given directory.
 * @param root  The root directory to search in.
 * @param options
 * @returns
 */
function findSourceFiles(root: string, { yaml = false, recursive = false }: Partial<CompileOptions> = {}): string[] {
  const files: string[] = []
  for (const entry of fse.readdirSync(root, { withFileTypes: true })) {
    const name = path.join(root, entry.name)
    if (entry.isDirectory() && recursive) {
      files.push(...findSourceFiles(name, { yaml, recursive }))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(name)
    const isYaml = ext === ".yml" || ext === ".yaml"
    if (yaml && isYaml) files.push(name)
    else if (!yaml && ext === ".json") files.push(name)
  }
  return files
}

/**
 * Ensure a string is safe for use as a filename.
 * @param filename         The filename to sanitize
 * @returns The sanitized filename
 */
function getSafeFilename(filename: string): string {
  return filename.normalize("NFD").replace(/[^a-zA-Z0-9\u0300-\u036F]/gu, "_")
}

/**
 * Join non-blank key parts.
 * @param args  Key parts.
 */
function keyJoin(...args: string[]): string {
  return args.filter((_) => _).join(".")
}

/**
 * Serialize a Document and write it to the filesystem.
 * @param doc        The Document to serialize.
 * @param filename   The filename to write it to.
 * @param [options]  Options to configure serialization behavior.
 */
function serializeDocument(
  doc: object,
  filename: string,
  { yaml, yamlOptions = {}, jsonOptions = {} }: Partial<ExtractOptions> = {},
) {
  fse.mkdirSync(path.dirname(filename), { recursive: true })
  const serialized = (() => {
    if (yaml) return YAML.dump(doc, yamlOptions)
    else {
      const { replacer = null, space = 2 } = jsonOptions
      return JSON.stringify(doc, replacer as JSONReplacer, space) + "\n"
    }
  })()
  fse.writeFileSync(filename, serialized)
}

/* -------------------------------------------- */
/*  Types                                       */
/* -------------------------------------------- */

/**
 * @param entry The entry data.
 * @returns `false` to indicate that this entry should be discarded.
 */
type EntryTransformer = (entry: object) => Promise<false | void>

/**
 * @param doc The Document being operated on.
 * @param collection The Document's collection.
 * @param options Additional options supplied by the invocation on the level above this one.
 * @returns Options to supply to the next level of the hierarchy.
 */
type HierarchyApplyCallback<TDocument extends Document = Document> = (
  doc: TDocument & { _id: string },
  collection: string,
  options?: unknown,
) => Promise<TDocument | Record<string, string> | void>

interface Document {
  _key?: string
  _id: string
  _name: string
  name: string
  folder: string
}

interface PackageOptions {
  /**
   * Whether to operate on a NeDB database, otherwise a LevelDB database is assumed.
   * (For compatibility ONLY)
   */
  nedb: boolean
  /** Whether the source files are in YAML format, otherwise JSON is assumed. */
  yaml: boolean
  /** Whether to log operation progress to the console. */
  log: boolean
  /** A function that is called on every entry to transform it. */
  transformEntry: EntryTransformer
}

interface CompileOptions extends PackageOptions {
  /**
   * Whether to recurse into child directories to locate source files, otherwise
   * only source files located in the root directory will be used.
   */
  recursive?: boolean
}

interface ExtractOptions extends PackageOptions {
  /**  Create a directory structure that matches the compendium folders. */
  folders: boolean
  yamlOptions: YAML.DumpOptions
  jsonOptions: JSONOptions
  documentType: DocumentType
  clean: boolean
  collection: DocumentCollection
  transformName: NameTransformer
  /** A function used to generate a filename for an extracted folder when the folders option is enabled. */
  transformFolderName: NameTransformer
}

interface JSONOptions {
  replacer?: JSONReplacer | (string | number)[]
  space?: string | number
}

type JSONReplacer = (key: string, value: object) => object

type NameTransformer = (entry: object, context?: { folder: string }) => Promise<string | void>

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * A flattened view of the Document hierarchy. The type of the value determines what type of collection it is. Arrays
 * represent embedded collections, while objects represent embedded documents.
 */
const HIERARCHY: Record<string, Record<string, object | unknown[]>> = {
  actors: {
    items: [],
    effects: [],
  },
  cards: {
    cards: [],
  },
  combats: {
    combatants: [],
  },
  delta: {
    items: [],
    effects: [],
  },
  items: {
    effects: [],
  },
  journal: {
    pages: [],
    categories: [],
  },
  playlists: {
    sounds: [],
  },
  regions: {
    behaviors: [],
  },
  tables: {
    results: [],
  },
  tokens: {
    delta: {},
  },
  scenes: {
    drawings: [],
    tokens: [],
    lights: [],
    notes: [],
    regions: [],
    sounds: [],
    templates: [],
    tiles: [],
    walls: [],
  },
}

/**
 * A mapping of primary document types to collection names.
 * @type {Record<DocumentType, DocumentCollection>}
 */
export const TYPE_COLLECTION_MAP: Record<DocumentType, DocumentCollection> = {
  Actor: "actors",
  Adventure: "adventures",
  Cards: "cards",
  ChatMessage: "messages",
  Combat: "combats",
  FogExploration: "fog",
  Folder: "folders",
  Item: "items",
  JournalEntry: "journal",
  Macro: "macros",
  Playlist: "playlists",
  RollTable: "tables",
  Scene: "scenes",
  Setting: "settings",
  User: "users",
}

export type DocumentType =
  | "Actor"
  | "Adventure"
  | "Cards"
  | "ChatMessage"
  | "Combat"
  | "FogExploration"
  | "Folder"
  | "Item"
  | "JournalEntry"
  | "Macro"
  | "Playlist"
  | "RollTable"
  | "Scene"
  | "Setting"
  | "User"

type DocumentCollection =
  | "actors"
  | "adventures"
  | "cards"
  | "messages"
  | "combats"
  | "fog"
  | "folders"
  | "items"
  | "journal"
  | "macros"
  | "playlists"
  | "tables"
  | "scenes"
  | "settings"
  | "users"
