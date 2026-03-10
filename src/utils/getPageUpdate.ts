import pageUpdates from '../data/pageUpdates.json';
import changelog from '../data/changelog.json';
import { formatDate } from './formatDate';

export function getPageUpdate(pageSlug: string) {
  const version = (pageUpdates as Record<string, string>)[pageSlug];
  if (!version) return null;

  const entry = changelog.find((e: { version: string }) => e.version === version);
  if (!entry) return null;

  return {
    version: entry.version,
    date: entry.date,
    formatted: formatDate(entry.date)
  };
}
