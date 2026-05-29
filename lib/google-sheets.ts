import { google } from "googleapis";
import { unstable_cache, revalidateTag } from "next/cache";
import { headers } from "next/headers";

const CATALOG_SHEET_ID =
  process.env.CATALOG_SHEET_ID ?? "15icsefQCXW39db3PzNqNT7Y1YUxmnG-jqEAParr5eMc";

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "[google-sheets] GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY not set",
    );
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export type ProductDetailField = {
  heading: string; // taken from row 1 of column L..Q
  value: string;   // this row's cell at the same column (may be empty)
};

export type Product = {
  id: string; // column A
  name: string; // column B
  unit: string | null; // column C
  service: string; // column D
  subService: string | null; // column E
  minPrice: number | null; // column F (redline)
  maxPrice: number | null; // column G (cap)
  imageUrl: string | null; // column J (product photo URL)
  // Free-form description fields sourced from columns L..Q. Each entry
  // pairs a heading (from row 1) with this product's value at that
  // column. Rendered as an accordion on the product detail page.
  detailFields: ProductDetailField[];
};

export type ServiceItem = {
  id: string; // slugified service name
  name: string; // raw service name from column D
  productCount: number;
  imageUrl: string | null; // image of the first product in this service (column I)
};

export function slugifyService(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 0-indexed positions for the detail columns (L..Q inclusive = 11..16).
const DETAIL_COL_FIRST = 11;
const DETAIL_COL_LAST_EXCLUSIVE = 17;

async function fetchProductsFromSheet(): Promise<Product[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Pull A1:Q so we get both the column headers (row 1) AND the detail
  // columns L..Q. The first row in the response is the heading row.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: CATALOG_SHEET_ID,
    range: "All!A1:Q",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length === 0) return [];

  // Row 0 = sheet row 1 = column headings. Snapshot the L..Q headings so
  // every product can pair its detail values back to a label, even if a
  // particular product has empty cells for some columns.
  const headerRow = rows[0] ?? [];
  const detailHeadings = headerRow
    .slice(DETAIL_COL_FIRST, DETAIL_COL_LAST_EXCLUSIVE)
    .map((h) => String(h ?? "").trim());

  const products: Product[] = [];

  // Data starts at row index 1 (sheet row 2).
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sheetId = String(row?.[0] ?? "").trim();
    const name = String(row?.[1] ?? "").trim();
    const service = String(row?.[3] ?? "").trim();

    if (!sheetId || !name || !service) continue;

    // Always-unique cart ID derived from the sheet row number. This guards
    // against duplicate values in column A — which we've seen in some service
    // sections (e.g. battery) and which caused toggling one product to
    // visually select every row sharing the same column-A value.
    const rowNumber = i + 1; // i is 0-indexed into the fetched range A1:Q
    const id = `r${rowNumber}-${sheetId}`;

    const rawImage = row[9] ? String(row[9]).trim() : "";

    let unit = row[2] ? String(row[2]).trim() : null;
    const subService = row[4] ? String(row[4]).trim() : null;
    let minPrice = parseNumber(row[5]);
    let maxPrice = parseNumber(row[6]);

    // Solar panels: column C carries the panel wattage (e.g. "445"), and
    // column F is the price PER WATT. Multiply through here so every
    // downstream consumer (cart total, submitted quote total, invoice
    // breakdown, email) sees the per-panel price. Null the unit so the UI
    // stops rendering a "/watt" suffix.
    if (subService && subService.toLowerCase() === "panels") {
      const wattage = parseNumber(unit);
      if (wattage != null && wattage > 0) {
        if (minPrice != null) minPrice = minPrice * wattage;
        if (maxPrice != null) maxPrice = maxPrice * wattage;
        unit = null;
      }
    }

    // Pair each L..Q heading with this row's value at the same column.
    // Headings with no label in row 1 are dropped (treated as not real
    // sections — protects against trailing blank header cells).
    const detailFields: ProductDetailField[] = detailHeadings
      .map((heading, idx) => ({
        heading,
        value: String(row?.[DETAIL_COL_FIRST + idx] ?? "").trim(),
      }))
      .filter((f) => f.heading.length > 0);

    products.push({
      id,
      name,
      unit,
      service,
      subService,
      minPrice,
      maxPrice,
      imageUrl: rawImage || null,
      detailFields,
    });
  }

  return products;
}

const CATALOG_TTL_SECONDS = 5 * 60; // 5-minute backstop if the user never refreshes

const cachedProducts = unstable_cache(
  fetchProductsFromSheet,
  ["products-all"],
  { revalidate: CATALOG_TTL_SECONDS, tags: ["catalog"] },
);

/**
 * Browsers send `Cache-Control: max-age=0` on a normal refresh
 * (Cmd/Ctrl+R) and `no-cache` on a hard refresh (Cmd/Ctrl+Shift+R),
 * but not on regular link navigation. Use that as the signal that the
 * user wants fresh data RIGHT NOW.
 */
async function isBrowserRefresh(): Promise<boolean> {
  try {
    const h = await headers();
    const cc = h.get("cache-control") || "";
    const pragma = h.get("pragma") || "";
    return (
      cc.includes("no-cache") ||
      cc.includes("max-age=0") ||
      pragma === "no-cache"
    );
  } catch {
    // headers() throws outside a request scope (e.g. at build time).
    return false;
  }
}

/**
 * Catalog read used by every page.
 *  - Normal navigation → returns the cached snapshot (≤ 5 min old).
 *  - Browser refresh → bypasses the cache to refetch fresh from Sheets
 *    AND invalidates the cache tag so any OTHER user landing right
 *    after also sees the fresh data instead of the stale snapshot.
 */
export async function getProducts(): Promise<Product[]> {
  if (await isBrowserRefresh()) {
    revalidateTag("catalog", { expire: 0 });
    return fetchProductsFromSheet();
  }
  return cachedProducts();
}

export async function getServices(): Promise<ServiceItem[]> {
  const products = await getProducts();
  const counts = new Map<string, number>();
  // Products are iterated in sheet order (top → bottom), so the first product
  // encountered per service is the topmost row in that service section. Its
  // image becomes the service card's cover photo (may be null — handled in UI).
  const firstByService = new Map<string, Product>();

  for (const p of products) {
    counts.set(p.service, (counts.get(p.service) ?? 0) + 1);
    if (!firstByService.has(p.service)) {
      firstByService.set(p.service, p);
    }
  }

  const out: ServiceItem[] = [];
  for (const [name, productCount] of counts) {
    out.push({
      id: slugifyService(name),
      name,
      productCount,
      imageUrl: firstByService.get(name)?.imageUrl ?? null,
    });
  }
  return out;
}

export async function getProductsForService(
  serviceSlug: string,
): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => slugifyService(p.service) === serviceSlug);
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((p) => p.id === id) ?? null;
}

/**
 * Returns all "Adder" sub-service products for the given service slug,
 * excluding the product the caller is currently viewing (so the detail
 * page doesn't show its own card in the related grid when the user lands
 * on an adder).
 */
export async function getRelatedAdders(
  serviceSlug: string,
  excludeProductId: string,
): Promise<Product[]> {
  const products = await getProducts();
  return products.filter(
    (p) =>
      slugifyService(p.service) === serviceSlug &&
      p.subService?.toLowerCase() === "adder" &&
      p.id !== excludeProductId,
  );
}

/**
 * Other products in the same service that are NOT adders and NOT the
 * currently-viewed product. Used to round out the "Related products"
 * grid below the adders.
 */
export async function getOthersInService(
  serviceSlug: string,
  excludeProductId: string,
): Promise<Product[]> {
  const products = await getProducts();
  return products.filter(
    (p) =>
      slugifyService(p.service) === serviceSlug &&
      p.subService?.toLowerCase() !== "adder" &&
      p.id !== excludeProductId,
  );
}

export async function getServiceBySlug(
  slug: string,
): Promise<ServiceItem | null> {
  const services = await getServices();
  return services.find((s) => s.id === slug) ?? null;
}
