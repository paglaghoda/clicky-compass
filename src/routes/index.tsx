import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sherpa — The Browser That Guides You" },
      {
        name: "description",
        content:
          "Sherpa is a web browser built for older adults. Say what you want to do and a big orange arrow points at exactly what to click next, one step at a time.",
      },
      { property: "og:title", content: "Sherpa — The Browser That Guides You" },
      {
        property: "og:description",
        content:
          "A web browser for older adults. Speak your goal and Sherpa highlights the next button to press, reads each step aloud, and watches out for scams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sherpa.paglaghoda.dev" }],
  }),
  component: LandingPage,
});

const installSteps = [
  "Press the orange Download button to save the Sherpa installer.",
  "Open the downloaded file and follow the simple setup steps.",
  "When asked, choose whether to make Sherpa your everyday browser.",
  "Open Sherpa, go to any website, and say what you would like to do.",
];

const features = [
  {
    title: "It points the way",
    body: "Say what you want — like “cancel my Amazon Prime subscription” — and a big orange arrow shows exactly what to click next, one step at a time.",
  },
  {
    title: "Speaks every step",
    body: "Each instruction is read out loud, slowly and clearly. No squinting at small text or guessing what a button does.",
  },
  {
    title: "You stay in control",
    body: "Sherpa never clicks anything for you. It only highlights and explains, so you decide what to press.",
  },
  {
    title: "Make any page easy to read",
    body: "One big button makes text larger and darker, grows buttons, and quietly hides pop-ups, adverts and videos that play by themselves.",
  },
  {
    title: "Watches out for tricks and scams",
    body: "Sherpa warns you in plain words when a page is trying to make it hard to say no, and speaks up when a site looks like a fake bank or delivery page.",
  },
  {
    title: "Just say it out loud",
    body: "Hold the big orange microphone button and say what you want to do. No typing, no small keyboards.",
  },
  {
    title: "Ask a family member",
    body: "One button writes a clear message explaining what you are trying to do, along with a picture of your screen, ready to send on WhatsApp, text or email.",
  },
  {
    title: "A simple record of what you did",
    body: "“You cancelled Amazon Prime on Tuesday.” A plain list of recent things you have done, kept only on your own computer.",
  },
];

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
    <div className="min-h-screen bg-sherpa-cream font-body text-sherpa-navy">
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {/* Hero */}
        <section className="text-center">
          <p className="text-lg font-semibold uppercase tracking-widest text-sherpa-orange">
            A web browser for older adults
          </p>
          <h1 className="mt-5 font-display text-5xl font-normal leading-[1.1] md:text-7xl">
            The browser that guides you
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-2xl leading-relaxed md:text-3xl">
            Tell Sherpa what you want to do — like “cancel my Amazon Prime subscription” — and it
            points at exactly what to click next, one step at a time, on any website.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-sherpa-slate md:text-2xl">
            Sherpa never clicks anything for you. You stay in control the whole way.
          </p>

          <button
            onClick={download}
            className="mt-10 inline-flex w-full max-w-md items-center justify-center rounded-2xl bg-sherpa-orange px-8 py-6 text-2xl font-bold text-white shadow-lg transition hover:brightness-110 md:w-auto md:text-3xl"
          >
            Download Sherpa
          </button>

          <p className="mt-4 text-base text-sherpa-slate md:text-lg">
            Free for Windows and Mac.
          </p>
        </section>

        {/* Feature grid */}
        <section className="mt-20 md:mt-28">
          <h2 className="text-center font-display text-3xl font-normal md:text-4xl">
            Everything you need, said simply
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border-2 border-sherpa-soft bg-white p-6"
              >
                <h3 className="font-display text-2xl font-normal leading-tight">{feature.title}</h3>
                <p className="mt-3 text-lg leading-relaxed text-sherpa-slate">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to install */}
        <section className="mt-20 md:mt-28">
          <h2 className="text-center font-display text-3xl font-normal md:text-4xl">
            How to install it
          </h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {installSteps.map((step, i) => (
              <li
                key={step}
                className="rounded-2xl border-2 border-sherpa-soft bg-white p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sherpa-navy text-xl font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-4 text-lg leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="mt-20 text-center md:mt-28">
          <button
            onClick={download}
            className="inline-flex w-full max-w-md items-center justify-center rounded-2xl bg-sherpa-orange px-8 py-6 text-2xl font-bold text-white shadow-lg transition hover:brightness-110 md:w-auto md:text-3xl"
          >
            Download Sherpa
          </button>
          <p className="mt-6 text-lg leading-relaxed text-sherpa-slate">
            Works on Windows and Mac. If Sherpa ever says it cannot reach the assistant, open the
            settings menu and check the helper address.
          </p>
        </section>
      </main>
    </div>
  );
}
