"use server";

import { getProducts, slugifyService } from "@/lib/google-sheets";

export type SearchableProduct = {
  id: string;
  name: string;
  service: string;
  serviceSlug: string;
  subService: string | null;
  minPrice: number | null;
  imageUrl: string | null;
};

/**
 * Slim projection of the catalog used by the header search dropdown.
 * Fetched lazily on first focus and filtered in JS on the client — the
 * catalog is small enough that round-trip-per-keystroke is overkill.
 */
export async function getSearchableProducts(): Promise<SearchableProduct[]> {
  const products = await getProducts();
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    service: p.service,
    serviceSlug: slugifyService(p.service),
    subService: p.subService,
    minPrice: p.minPrice,
    imageUrl: p.imageUrl,
  }));
}
