import Dashboard from "@/components/dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const query = await searchParams;
  return (
    <Dashboard
      listOnly
      initialTab={query.tab === "recent" ? "recent" : "upcoming"}
    />
  );
}
