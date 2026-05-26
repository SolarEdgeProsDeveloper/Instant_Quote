import { redirect } from "next/navigation";

export default function HomePage() {
  // Skip the welcome page — drop users straight into the catalog. The proxy
  // middleware will bounce unauthenticated visitors to /login from there.
  redirect("/quote");
}
