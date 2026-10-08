import MeetingDetails from "@/components/meeting-details";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scheduled?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <MeetingDetails code={id} scheduled={query.scheduled === "1"} />;
}
