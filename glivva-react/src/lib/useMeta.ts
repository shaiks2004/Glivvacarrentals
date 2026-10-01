import { useEffect } from 'react';

/** Sets the document title and meta description for each page (SEO). */
export function useMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
