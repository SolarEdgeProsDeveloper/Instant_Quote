import { google } from "googleapis";
import { unstable_cache } from "next/cache";

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

export type Product = {
  id: string; // column A
  name: string; // column B
  unit: string | null; // column C
  service: string; // column D
  subService: string | null; // column E
  minPrice: number | null; // column F (redline)
  maxPrice: number | null; // column G (cap)
  imageUrl: string | null; // column I (product photo URL)
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

async function fetchProducts(): Promise<Product[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: CATALOG_SHEET_ID,
    range: "All!A2:I",
  });

  const rows = (res.data.values ?? []) as string[][];
  const products: Product[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sheetId = String(row?.[0] ?? "").trim();
    const name = String(row?.[1] ?? "").trim();
    const service = String(row?.[3] ?? "").trim();

    if (!sheetId || !name || !service) continue;

    // Always-unique cart ID derived from the sheet row number. This guards
    // against duplicate values in column A — which we've seen in some service
    // sections (e.g. battery) and which caused toggling one product to
    // visually select every row sharing the same column-A value.
    const rowNumber = i + 2; // header is row 1, data starts at row 2
    const id = `r${rowNumber}-${sheetId}`;

    const rawImage = row[8] ? String(row[8]).trim() : "";

    products.push({
      id,
      name,
      unit: row[2] ? String(row[2]).trim() : null,
      service,
      subService: row[4] ? String(row[4]).trim() : null,
      minPrice: parseNumber(row[5]),
      maxPrice: parseNumber(row[6]),
      imageUrl: rawImage || null,
    });
  }

  return products;
}

export const getProducts = unstable_cache(fetchProducts, ["products-all"], {
  revalidate: 30,
  tags: ["catalog"],
});

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

export async function getServiceBySlug(
  slug: string,
): Promise<ServiceItem | null> {
  const services = await getServices();
  return services.find((s) => s.id === slug) ?? null;
}
