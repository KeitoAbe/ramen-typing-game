import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl, PUBLIC_PAGE_PATHS } from "@/app/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return PUBLIC_PAGE_PATHS.map((path) => ({ url: absoluteUrl(siteUrl, path) }));
}
