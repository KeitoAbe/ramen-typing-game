import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/app/site-url";

// static export では、静的だと明示しないとビルド時にファイルが出力されない
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl(getSiteUrl(), "/sitemap.xml"),
  };
}
