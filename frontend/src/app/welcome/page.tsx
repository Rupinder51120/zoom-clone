import Link from "next/link";
import {
  Video,
  Mic,
  Users,
  CalendarDays,
  ChevronDown,
  Search,
  Globe,
  Grid3X3,
  Sparkles,
  FileText,
  MessageSquare,
  ShieldCheck,
  Zap,
  Layers,
} from "lucide-react";
import { PlaceholderControl } from "@/components/placeholder-control";
import styles from "./welcome.module.css";
const names = ["Awanee", "Rupinder", "Ishan", "Mannya"];
function MeetingPreview() {
  return (
    <div
      className={styles.workspacePreview}
      aria-label="Illustrated collaboration workspace"
    >
      <aside className={styles.scheduleCard}>
        <CalendarDays size={22} />
        <strong>Team project discussion</strong>
        <p>Today · 1 hour</p>
        <div className={styles.people}>
          {names.map((name) => (
            <span key={name} title={name}>
              {name[0]}
            </span>
          ))}
        </div>
        <small>Hosted by Rupinder</small>
        <span className={styles.cardLine} />
        <p>Meeting invitation</p>
        <Link href="/dashboard">Open Workplace →</Link>
      </aside>
      <div className={styles.summary}>
        <Sparkles size={24} />
        <span>Team project notes</span>
        <span className={styles.document}>
          <FileText size={17} /> Meeting agenda
        </span>
        <small>Preview only</small>
      </div>
      <div className={styles.meetingWindow}>
        <div className={styles.previewTop}>
          <span>Meeting</span>
          <span>Team project discussion</span>
          <span>Preview</span>
        </div>
        <div className={styles.tiles}>
          {names.map((name, index) => (
            <div
              key={name}
              className={`${styles.tile} ${styles["color" + index]}`}
            >
              <div className={styles.avatar}>{name[0]}</div>
              <small>{name}</small>
            </div>
          ))}
        </div>
        <div className={styles.previewToolbar}>
          <Mic size={18} />
          <Video size={18} />
          <Users size={18} />
          <MessageSquare size={18} />
          <span>ZOOM-CLONE</span>
        </div>
      </div>
      <aside className={styles.chatCard}>
        <strong>Team Chat · Preview</strong>
        {names.map((name, index) => (
          <div key={name}>
            <b>{name}</b>
            <p>
              {
                [
                  "Ready for our meeting?",
                  "The invitation is ready.",
                  "See you there!",
                  "Let’s get started.",
                ][index]
              }
            </p>
          </div>
        ))}
      </aside>
    </div>
  );
}
export default function Welcome() {
  return (
    <div className={styles.page}>
      <div className={styles.heroBackground}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}>
            ZOOM-CLONE
          </Link>
          <nav aria-label="Main navigation">
            <PlaceholderControl label="Search">
              <Search size={20} />
            </PlaceholderControl>
            <PlaceholderControl label="Language">
              <Globe size={20} />
            </PlaceholderControl>
            <details className={styles.meetMenu}>
              <summary>
                Meet <ChevronDown size={13} />
              </summary>
              <div>
                <Link href="/dashboard">New Meeting</Link>
                <Link href="/join">Join</Link>
                <Link href="/meeting/schedule">Schedule</Link>
              </div>
            </details>
            <Link href="/signin">Sign In</Link>
            <PlaceholderControl label="Support" />
            <PlaceholderControl
              label="Contact Sales"
              className={styles.whiteButton}
            />
            <Link href="/signup" className={styles.blueButton}>
              Sign Up Free
            </Link>
            <PlaceholderControl label="More products">
              <Grid3X3 size={21} />
            </PlaceholderControl>
          </nav>
        </header>
        <nav className={styles.subnav} aria-label="Workplace navigation">
          <PlaceholderControl label="Products">
            Products <ChevronDown size={13} />
          </PlaceholderControl>
          <span className={styles.separator} />
          <Link href="/">ZOOM-CLONE Workplace</Link>
          <a href="#features">
            Features <ChevronDown size={13} />
          </a>
          <a href="#pricing">Pricing</a>
        </nav>
        <main>
          <section className={styles.hero}>
            <h1>One platform for all the ways you work</h1>
            <p>
              Bring your meetings together in ZOOM-CLONE Workplace.
              <br />
              Create, join and schedule conversations with your team,
              <br />
              from the browser you already use.
            </p>
            <div className={styles.heroActions}>
              <Link href="/dashboard" className={styles.navyButton}>
                Open Workplace
              </Link>
              <Link href="/signup" className={styles.whiteButton}>
                Sign Up Free
              </Link>
              <PlaceholderControl
                label="Contact sales"
                className={styles.textButton}
              />
            </div>
            <small className={styles.loginNote}>
              No login required · Signup is optional
            </small>
            <MeetingPreview />
          </section>
        </main>
      </div>
      <section className={styles.teamStrip}>
        <h2>A workspace for your team</h2>
        <div>
          {names.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>
      <section id="features" className={styles.benefits}>
        <h2>Why ZOOM-CLONE Workplace?</h2>
        <div className={styles.benefitGrid}>
          {[
            {
              Icon: Layers,
              title: "Everything in one place",
              text: "Your upcoming and recent meetings, together.",
            },
            {
              Icon: Globe,
              title: "Wherever you work",
              text: "A responsive experience on desktop, tablet and mobile.",
            },
            {
              Icon: Zap,
              title: "Ready when you are",
              text: "Create a meeting instantly and share its invitation.",
            },
            {
              Icon: CalendarDays,
              title: "Simple to plan",
              text: "Save a title, date, time and duration for your next call.",
            },
            {
              Icon: Video,
              title: "Face-to-face conversations",
              text: "Real camera and microphone controls in your browser.",
            },
            {
              Icon: ShieldCheck,
              title: "Host stays in control",
              text: "Mute all participants or remove a participant.",
            },
          ].map(({ Icon, title, text }) => (
            <article key={title}>
              <Icon size={34} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.lifecycle}>
        <h2>
          Make every part of your meeting
          <br />
          work together
        </h2>
        <div className={styles.steps}>
          {[
            {
              title: "Before",
              text: "Schedule and invite",
              href: "/meeting/schedule",
              Icon: CalendarDays,
            },
            {
              title: "During",
              text: "Meet face to face",
              href: "/dashboard",
              Icon: Video,
            },
            {
              title: "After",
              text: "Find recent meetings",
              href: "/meetings?tab=recent",
              Icon: FileText,
            },
          ].map(({ title, text, href, Icon }) => (
            <Link key={title} href={href}>
              <Icon size={35} />
              <span>{title}</span>
              <strong>{text}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className={styles.productSection}>
        <span className={styles.eyebrow}>Key products</span>
        <h2>Bring your team’s work together</h2>
        <div className={styles.productTabs}>
          <a href="#communication">Communication</a>
          {["Productivity", "Spaces", "Employee engagement"].map((label) => (
            <PlaceholderControl key={label} label={label} />
          ))}
        </div>
        <div id="communication" className={styles.productContent}>
          <div>
            <h3>A simpler way to connect.</h3>
            <p>
              Start an instant meeting, enter an invitation link, or plan your
              next conversation. Your meeting details stay saved in your
              workspace.
            </p>
            <ul>
              <li>Meet without a required account.</li>
              <li>Use a display name when joining.</li>
              <li>Keep your upcoming meetings within reach.</li>
            </ul>
            <Link href="/dashboard" className={styles.blueButton}>
              Open Workplace
            </Link>
          </div>
          <div className={styles.compactPreview}>
            <MeetingPreview />
          </div>
        </div>
      </section>
      <section className={styles.aiSection}>
        <div className={styles.aiArt}>
          <Sparkles size={64} />
          <div>
            Meeting notes <span>Preview only</span>
          </div>
          <p>Team project discussion</p>
          <div className={styles.noteLines}>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div>
          <span className={styles.eyebrow}>ZOOM-CLONE AI · Preview only</span>
          <h2>Explore a connected workspace</h2>
          <p>
            The AI and productivity interfaces follow the reference design.
            These services are visual previews in this assignment.
          </p>
          <PlaceholderControl
            label="Explore AI"
            className={styles.blueButton}
          />
        </div>
      </section>
      <section className={styles.integration}>
        <span className={styles.eyebrow}>Integrations · Preview only</span>
        <h2>Your tools, in one workspace</h2>
        <div className={styles.integrationTiles}>
          {[
            "Calendar",
            "Documents",
            "Whiteboards",
            "Team Chat",
            "Notes",
            "Apps",
          ].map((label) => (
            <PlaceholderControl key={label} label={label} />
          ))}
        </div>
      </section>
      <section id="pricing" className={styles.pricing}>
        <span className={styles.eyebrow}>Pricing · Preview only</span>
        <h2>Find your workplace experience</h2>
        <p>
          Plan cards are reference previews. This demo has no paid plans or
          billing.
        </p>
        <div className={styles.planGrid}>
          {["Basic", "Pro", "Business"].map((plan, index) => (
            <article key={plan}>
              <h3>Workplace {plan}</h3>
              <strong>
                {index === 0 ? "Assignment demo" : "Preview only"}
              </strong>
              <p>
                {index === 0
                  ? "Create, join and schedule meetings with optional login."
                  : "Additional product options are not available in this demo."}
              </p>
              {index === 0 ? (
                <Link href="/dashboard" className={styles.blueButton}>
                  Try the demo
                </Link>
              ) : (
                <PlaceholderControl
                  label={`Workplace ${plan}`}
                  className={styles.blueButton}
                />
              )}
              <ul>
                <li>
                  {index === 0
                    ? "Instant and scheduled meetings"
                    : "Product interface preview"}
                </li>
                <li>
                  {index === 0
                    ? "Audio and video calls"
                    : "No billing or subscription"}
                </li>
                <li>
                  {index === 0
                    ? "Host mute-all and removal"
                    : "No participant limit claims"}
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.cta}>
        <h2>
          Your next conversation
          <br />
          starts here.
        </h2>
        <Link href="/dashboard" className={styles.blueButton}>
          Open Workplace
        </Link>
        <Link href="/join" className={styles.whiteButton}>
          Join a meeting
        </Link>
      </section>
      <section className={styles.faq}>
        <span className={styles.eyebrow}>FAQs</span>
        <h2>A few things to know</h2>
        {[
          [
            "Do I need to sign in?",
            "No. Open Workplace to use the demo user. Signup and signin are optional.",
          ],
          [
            "How do I join a meeting?",
            "Use Join to enter an existing meeting ID or invitation link, then choose your display name.",
          ],
          [
            "Which controls are functional?",
            "Creating, joining, scheduling, real audio/video, participants, invitations, leaving, ending, host mute-all and removal. Other product controls show a Preview only notice.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <ChevronDown size={20} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <footer className={styles.footer}>
        <div>
          <Link href="/" className={styles.brand}>
            ZOOM-CLONE
          </Link>
          <p>Fullstack assignment demo</p>
          <PlaceholderControl label="Language" />
          <PlaceholderControl label="Currency" />
        </div>
        {[
          { title: "About", items: ["Our team", "Resources", "Integrations"] },
          {
            title: "Download",
            items: ["Desktop app", "Mobile app", "Browser extension"],
          },
          {
            title: "Sales",
            items: ["Contact sales", "Plans & pricing", "Request a demo"],
          },
          {
            title: "Support",
            items: ["Help center", "Learning center", "Accessibility"],
          },
        ].map(({ title, items }) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.map((label) => (
              <PlaceholderControl key={label} label={label} />
            ))}
          </div>
        ))}
        <div className={styles.footerBottom}>
          <span>ZOOM-CLONE · Original assignment implementation</span>
          <Link href="/dashboard">Workplace</Link>
          <PlaceholderControl label="Privacy" />
          <PlaceholderControl label="Terms" />
        </div>
      </footer>
    </div>
  );
}
