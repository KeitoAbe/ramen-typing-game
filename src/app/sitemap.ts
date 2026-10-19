import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl, PUBLIC_PAGE_PATHS } from "@/app/site-url";

// static export では、静的だと明示しないとビルド時にファイルが出力されない
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return PUBLIC_PAGE_PATHS.map((path) => ({ url: absoluteUrl(siteUrl, path) }));
}
