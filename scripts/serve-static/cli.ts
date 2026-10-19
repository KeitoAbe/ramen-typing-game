import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import {
  contentTypeOf,
  isInsideRoot,
  NOT_FOUND_FILE,
  staticFileCandidates,
} from "@scripts/serve-static/resolve-static-file";

// static export の出力（out/）を、Cloudflare Pages と同じ規則で配信する。E2E テストのサーバーに使う
// 使い方: tsx scripts/serve-static/cli.ts <ディレクトリ> <ポート>（pnpm start <ポート> で out/ を配信する）
const [rootArg = "out", portArg = "3100"] = process.argv.slice(2);
const root = resolve(rootArg);
const port = Number(portArg);

async function findFile(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    const file = join(root, candidate);
    if (!isInsideRoot(root, file)) continue;
    const stats = await stat(file).catch(() => null);
    if (stats?.isFile()) return file;
  }
  return null;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = await findFile(staticFileCandidates(pathname));
  const served = file ?? join(root, NOT_FOUND_FILE);
  response.writeHead(file ? 200 : 404, {
    "Content-Type": contentTypeOf(served),
  });
  response.end(await readFile(served));
}).listen(port, () => {
  console.log(`${root} を http://localhost:${port} で配信しています`);
});
