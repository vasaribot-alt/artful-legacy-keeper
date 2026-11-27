import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageUrl, publicPages } from "@/lib/publicSeo";

export function PublicPageHead({ title, description, path }: { title: string; description: string; path: string }) {
  const url = pageUrl(path);
  return <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={url} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={url} />
    <meta property="og:type" content="website" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
  </Helmet>;
}

export function RoutePageHead() {
  const { pathname } = useLocation();
  // These pages own their head once their public data is loaded.
  if (/^\/(site|artist)\//.test(pathname)) return null;
  const page = publicPages[pathname];
  if (!page) return <Helmet><title>{DEFAULT_TITLE}</title><meta name="description" content={DEFAULT_DESCRIPTION} /></Helmet>;
  return <PublicPageHead key={pathname} {...page} path={pathname} />;
}