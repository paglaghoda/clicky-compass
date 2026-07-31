import { createFileRoute } from "@tanstack/react-router";
import landingCss from "./sherpa-landing.css?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sherpa — Someone to point the way, right on your screen" },
      {
        name: "description",
        content:
          "Sherpa is a web browser for older adults. Say what you want to do and a big orange arrow points at exactly what to click next, one step at a time.",
      },
      { property: "og:title", content: "Sherpa — Someone to point the way, right on your screen" },
      {
        property: "og:description",
        content:
          "A web browser for older adults. Speak your goal and Sherpa highlights the next button to press, reads each step aloud, and watches out for scams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://sherpa.paglaghoda.dev" },
      { rel: "stylesheet", href: landingCss },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const download = () => {
    fetch("/guide-me-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "sherpa-browser.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="sherpa-landing">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="logo">
            <span className="dot"></span>Sherpa
          </div>
          <button onClick={download} className="top-cta">
            Download Sherpa
          </button>
        </div>
      </div>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Made for older adults, one step at a time</span>
            <p className="pre-headline">The browser for</p>
            <h1>
              <em>Elder Loved Ones</em>
            </h1>
            <p className="hero-sub-lead">Someone to point the way, right on their screen.</p>
            <p className="hero-sub">
              Tell Sherpa what you're trying to do — "cancel my Amazon Prime" — and a big orange
              arrow shows you exactly what to click next. One step at a time. Read aloud, slowly
              and clearly. You stay in control the whole way.
            </p>
            <div className="hero-ctas">
              <button onClick={download} className="btn-primary">
                Download Sherpa — it's free
              </button>
              <a href="#how-it-works" className="btn-secondary">
                See how it works
              </a>
            </div>
            <p className="browsers-line">
              Works with <strong>Chrome, Edge, Brave, Arc and Opera.</strong> Nothing to buy.
            </p>
          </div>

          <div
            className="demo"
            role="img"
            aria-label="Example of Sherpa pointing an orange arrow at the real Cancel Membership button on a subscription page, with a caption below reading it aloud."
          >
            <div className="demo-bar">
              <span className="demo-dot"></span>
              <span className="demo-dot"></span>
              <span className="demo-dot"></span>
              <span className="demo-url">amazon.com/account/prime</span>
            </div>
            <div className="demo-body">
              <div className="demo-site-label">Your Prime Membership</div>
              <div className="fake-row">
                <span>Add a payment method</span>
                <span className="fake-btn">Manage</span>
              </div>
              <div className="fake-row">
                <span>Get a Prime gift for someone</span>
                <span className="fake-btn">Send a gift</span>
              </div>
              <div className="target-row">
                <span className="target-label">Cancel your membership</span>
                <span className="target-btn">
                  End membership
                  <span className="arrow-callout" aria-hidden="true">
                    <span className="arrow-shaft"></span>
                    <span className="arrow-head"></span>
                  </span>
                </span>
              </div>
              <div className="caption-bubble">
                <svg
                  className="speaker-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                "Click the orange button that says 'End membership.' That's the real cancel button."
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="what-it-does">
        <div className="wrap-narrow section-head">
          <div className="section-eyebrow">
            Built for real websites, not a simplified version of them
          </div>
          <h2>Every website. One patient guide.</h2>
          <p className="section-sub">
            Sherpa doesn't click anything for you. It watches the page with you, finds the right
            button among all the clutter, and points. You do the clicking, at your own pace.
          </p>
        </div>

        <div className="wrap">
          <div className="feature">
            <div className="feature-text">
              <span className="feature-kicker">Guide Me</span>
              <h3>Say what you want. Sherpa finds the way.</h3>
              <p>
                Type or say something simple, like "cancel my gym membership" or "unsubscribe from
                this newsletter." Sherpa reads the page, works out where the real button is hiding,
                and walks you there one click at a time.
              </p>
              <p>
                Each step is spoken out loud, slowly and clearly, so you never have to guess if
                you've done the right thing.
              </p>
            </div>
            <div className="feature-art">
              <div className="demo-site-label" style={{ marginBottom: 22 }}>
                What Sherpa says, one step at a time
              </div>
              <div className="msg-bubble">
                Step 1 of 3. Look near the top of the page for a button called "Account."
              </div>
              <div className="msg-bubble">
                Step 2 of 3. Now click "Membership & Billing," in the left-hand list.
              </div>
            </div>
          </div>

          <div className="feature reverse">
            <div className="feature-art">
              <div className="before-after">
                <div className="ba-panel before">
                  <div className="ba-label">Before</div>
                  <div className="ba-line" style={{ width: "70%" }}></div>
                  <div className="ba-line" style={{ width: "100%" }}></div>
                  <div className="ba-line" style={{ width: "45%" }}></div>
                  <div className="ba-line" style={{ width: "85%" }}></div>
                  <div className="ba-line" style={{ width: "60%" }}></div>
                </div>
                <div className="ba-arrow" aria-hidden="true">
                  →
                </div>
                <div className="ba-panel after">
                  <div className="ba-label">After one press</div>
                  <div className="ba-line" style={{ width: "70%" }}></div>
                  <div className="ba-line" style={{ width: "100%" }}></div>
                  <div className="ba-line" style={{ width: "45%" }}></div>
                </div>
              </div>
            </div>
            <div className="feature-text">
              <span className="feature-kicker">Make This Page Easy to Read</span>
              <h3>One big button. A calmer, clearer page.</h3>
              <p>
                Press it once: text grows larger, contrast gets darker and easier to read, buttons
                grow to be easier to click, and pop-ups, adverts and auto-playing videos are quietly
                put away.
              </p>
              <p>
                Press it again, and the page goes back exactly as it was. Nothing is changed for good
                — you're always just one press from either version.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-text">
              <span className="feature-kicker">Watches Out for Tricks and Scams</span>
              <h3>It notices what you might not.</h3>
              <p>
                Some sites bury the "cancel" button on purpose, or hide it behind confusing wording.
                Sherpa warns you in plain words when a page is making it hard to say no — then
                points at the real cancel button anyway.
              </p>
              <p>
                It also speaks up if a page looks like a fake bank or delivery site asking for your
                personal details, before you type anything in.
              </p>
            </div>
            <div className="feature-art">
              <div className="warn-card">
                <div className="warn-icon" aria-hidden="true">
                  !
                </div>
                <div>
                  <div className="warn-text-title">This page is making it hard to cancel</div>
                  <div className="warn-text-body">
                    It's asking you to call a phone number and wait, instead of just clicking a
                    button. The real cancel button is lower down the page — I've pointed at it for
                    you.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feature reverse">
            <div className="feature-art">
              <div className="mic-wrap">
                <div className="mic-circle" aria-hidden="true">
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFEFB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </div>
                <p className="quote-text">"Help me cancel my newspaper subscription."</p>
              </div>
            </div>
            <div className="feature-text">
              <span className="feature-kicker">Just Say It Out Loud</span>
              <h3>No typing. No tiny keyboard.</h3>
              <p>
                Hold the big orange microphone button and say what you're trying to do, in your
                own words. Sherpa listens and gets started — no hunting for letters on a small
                screen.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-text">
              <span className="feature-kicker">Ask a Family Member</span>
              <h3>Bring someone else in, in one press.</h3>
              <p>
                One button writes a clear, plain-English message explaining what you're trying to
                do, together with a picture of your screen — ready to send over WhatsApp, a text
                message, or email.
              </p>
              <p>No need to explain the problem from scratch. It's already written for you.</p>
            </div>
            <div className="feature-art">
              <div className="msg-bubble">
                Hi Sarah — I'm trying to cancel my Prime membership but I'm stuck on this page. Can
                you take a quick look? (Screenshot attached)
              </div>
            </div>
          </div>

          <div className="feature reverse">
            <div className="feature-art">
              <div className="log-row">
                <span className="log-dot"></span>
                <span className="log-text">Cancelled Amazon Prime</span>
                <span className="log-date">Tuesday</span>
              </div>
              <div className="log-row">
                <span className="log-dot"></span>
                <span className="log-text">Unsubscribed from Daily Deals email</span>
                <span className="log-date">Monday</span>
              </div>
              <div className="log-row">
                <span className="log-dot"></span>
                <span className="log-text">Updated home address on file</span>
                <span className="log-date">Last week</span>
              </div>
            </div>
            <div className="feature-text">
              <span className="feature-kicker">A Simple Record of What You Did</span>
              <h3>"You cancelled Amazon Prime on Tuesday."</h3>
              <p>
                A plain list of the things you've recently done with Sherpa's help — so you can
                check back later and know for certain it's done.
              </p>
              <p>This list stays only on your own computer. It's never sent anywhere.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="steps-band">
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">How to install it</div>
            <h2>Five steps. About two minutes.</h2>
            <p className="section-sub">No technical knowledge needed — just follow along in order.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-num">1</span>
              <p>
                Press the orange <strong>Download</strong> button, then unzip the file by
                double-clicking it.
              </p>
            </div>
            <div className="step-card">
              <span className="step-num">2</span>
              <p>
                Open a new tab and go to <strong>chrome://extensions</strong>
              </p>
            </div>
            <div className="step-card">
              <span className="step-num">3</span>
              <p>
                Turn on <strong>"Developer mode"</strong> using the switch in the top-right corner.
              </p>
            </div>
            <div className="step-card">
              <span className="step-num">4</span>
              <p>
                Click <strong>"Load unpacked"</strong> and choose the folder you unzipped.
              </p>
            </div>
            <div className="step-card">
              <span className="step-num">5</span>
              <p>
                Open any website, click the <strong>Sherpa icon</strong>, and tell it what you want
                to do.
              </p>
            </div>
          </div>

          <p className="steps-note">
            If the helper ever says it cannot reach the assistant, open the gear icon in the
            sidebar and check the helper address.
          </p>
        </div>
      </section>

      <section id="download" className="cta-band">
        <div className="wrap-narrow">
          <div className="section-eyebrow">Ready when you are</div>
          <h2>Someone should be standing next to you when the internet gets confusing.</h2>
          <p className="section-sub">
            Now, something can be. Free to download, works on the browser you already use.
          </p>
          <div className="cta-actions">
            <div className="cta-arrow-wrap">
              <span className="floating-arrow" aria-hidden="true">
                <span className="arrow-shaft"></span>
                <span className="arrow-head"></span>
              </span>
              <button onClick={download} className="btn-primary">
                Download Sherpa — it's free
              </button>
            </div>
            <p className="compat-row">
              <strong>Works in Chrome, Edge, Brave, Arc and Opera.</strong>
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap footer-inner">
          <div className="footer-logo">Sherpa</div>
          <div className="footer-note">
            Sherpa never clicks anything for you. You're always in control.
          </div>
        </div>
      </footer>
    </div>
  );
}
