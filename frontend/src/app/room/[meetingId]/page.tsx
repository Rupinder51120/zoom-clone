import Room from "@/components/room";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { meetingId } = await params;
  const query = await searchParams;
  return (
    <Room
      code={meetingId}
      initialVideo={query.video !== "0"}
      hostMode={query.host === "1"}
      screenOnly={query.share === "1"}
    />
  );
}
