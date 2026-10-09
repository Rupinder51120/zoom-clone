import Link from "next/link";
import {
  Video,
  Mic,
  Users,
  CalendarDays,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { PlaceholderControl } from "@/components/placeholder-control";
import styles from "./welcome.module.css";

export default function Welcome() {
  return (
    <div className={styles.page}>
      <div className={styles.utility}>
        <PlaceholderControl label="Support" />
        <Link href="/join">Join</Link>
        <Link href="/meeting/schedule">Schedule</Link>
        <Link href="/signin">Sign In</Link>
      </div>
      <header className={styles.header}>
        <Link href="/welcome" className={styles.brand}>
          ZOOM-CLONE
        </Link>
        <nav aria-label="Public navigation" className={styles.products}>
          {["Products", "Solutions", "Resources", "Plans & Pricing"].map(
            (label) => (
              <PlaceholderControl key={label} label={label}>
                {label}
                <ChevronDown size={14} />
              </PlaceholderControl>
            ),
          )}
        </nav>
        <div className={styles.actions}>
          <Link href="/" className={styles.outline}>
            Open Workplace
          </Link>
          <Link href="/signup" className={styles.primary}>
            Sign Up Free
          </Link>
        </div>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>ZOOM-CLONE Workplace</span>
            <h1>
              Bring your team
              <br />
              <em>together.</em>
            </h1>
            <p>
              Connect face to face, wherever you are. Start a meeting, invite
              your team, or plan your next conversation.
            </p>
            <div className={styles.heroActions}>
              <Link href="/" className={styles.primary}>
                Open Workplace <ArrowRight size={18} />
              </Link>
              <Link href="/join" className={styles.outline}>
                Join a meeting
              </Link>
            </div>
            <small>
              No login required. Sign in or sign up whenever you want.
            </small>
          </div>
          <div
            className={styles.preview}
            aria-label="Illustrated meeting preview"
          >
            <div className={styles.previewTop}>
              <Video size={19} />
              <strong>Team catch-up</strong>
              <span>Meeting preview</span>
            </div>
            <div className={styles.tiles}>
              {[
                ["A", "Awanee", "orange"],
                ["R", "Rupinder", "blue"],
                ["I", "Ishan", "purple"],
                ["M", "Mannya", "green"],
              ].map(([initials, name, color]) => (
                <div key={name} className={`${styles.tile} ${styles[color]}`}>
                  <span>{initials}</span>
                  <small>{name}</small>
                </div>
              ))}
            </div>
            <div className={styles.previewToolbar}>
              <Mic size={20} />
              <Video size={20} />
              <Users size={20} />
              <span>ZOOM-CLONE</span>
            </div>
            <div className={styles.badge}>
              <CalendarDays size={24} />
              <span>
                Your next meeting,
                <br />
                <strong>one click away.</strong>
              </span>
            </div>
          </div>
        </section>
        <section className={styles.meetings}>
          <span className={styles.eyebrow}>Meetings</span>
          <h2>One place to meet and stay connected.</h2>
          <div className={styles.features}>
            {[
              [
                "Meet now",
                "Create an instant meeting and copy its invitation.",
                "/",
                Video,
              ],
              [
                "Join anywhere",
                "Enter a meeting ID or follow an invite link.",
                "/join",
                Users,
              ],
              [
                "Plan ahead",
                "Schedule your meeting with a title, date and duration.",
                "/meeting/schedule",
                CalendarDays,
              ],
            ].map(([title, description, href, Icon]) => {
              const FeatureIcon = Icon as typeof Video;
              return (
                <Link key={title as string} href={href as string}>
                  <FeatureIcon size={28} />
                  <h3>{title as string}</h3>
                  <p>{description as string}</p>
                  <ArrowRight size={20} />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          ZOOM-CLONE
        </Link>
        <span>Fullstack assignment demo</span>
        <Link href="/">Workplace</Link>
        <Link href="/signin">Sign In</Link>
        <PlaceholderControl label="Privacy & Legal Policies" />
      </footer>
    </div>
  );
}
