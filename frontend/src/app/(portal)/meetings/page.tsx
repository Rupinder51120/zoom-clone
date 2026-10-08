import MeetingsAgenda from "@/components/meetings-agenda";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const query = await searchParams;
  return (
    <MeetingsAgenda
      searchQuery={query.q || ""}
      recent={query.tab === "recent"}
    />
  );
}
