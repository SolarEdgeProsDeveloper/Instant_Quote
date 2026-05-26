import QuoteHydrator from "./quote-hydrator";

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <QuoteHydrator />
      {children}
    </>
  );
}
