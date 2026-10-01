import { useEffect } from 'react';

interface MetaOptions {
  image?: string;
  type?: 'website' | 'article' | 'product';
  url?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/** Sets the document title, OpenGraph meta tags, and structured JSON-LD data for SEO. */
export function useMeta(title: string, description: string, options?: MetaOptions): void {
  useEffect(() => {
    // 1. Document Title
    document.title = title;

    // Helper to set/create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 2. Standard & OpenGraph Tags
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', options?.type || 'website', true);
    setMeta('og:url', options?.url || window.location.href, true);
    if (options?.image) {
      setMeta('og:image', options.image, true);
      setMeta('twitter:image', options.image);
    }
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);

    // 3. Structured Data (JSON-LD)
    let jsonLdScript: HTMLScriptElement | null = null;
    if (options?.jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.text = JSON.stringify(options.jsonLd);
      jsonLdScript.id = 'page-structured-data';
      
      const existing = document.getElementById('page-structured-data');
      if (existing) {
        existing.remove();
      }
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [title, description, options?.image, options?.type, options?.url, options?.jsonLd]);
}
