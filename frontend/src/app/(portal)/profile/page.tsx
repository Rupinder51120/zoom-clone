import { PlaceholderControl } from "@/components/placeholder-control";
export default function Page() {
  return (
    <section className="content-page">
      <h1>Profile &amp; Settings</h1>
      <p>
        Preview only · account preferences are outside the assignment scope.
      </p>
      <PlaceholderControl label="Profile" className="secondary" />
      <PlaceholderControl label="Settings" className="secondary" />
    </section>
  );
}
