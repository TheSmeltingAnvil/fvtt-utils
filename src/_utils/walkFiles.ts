import fs from "fs-extra"
import path from "path"

export default function walkFiles(
  pattern: string | readonly string[],
  { cwd, exclude }: { cwd?: string; exclude?: readonly string[] },
): string[] {
  return fs.globSync(pattern, { cwd, exclude }).map((match) => {
    const dir = cwd?.replaceAll(/\\/g, "/") ?? ""
    return path.resolve(dir, match)
  })
}
