import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guide Me — Website Helper for Chrome" },
      {
        name: "description",
        content:
          "A Chrome sidebar helper that points at exactly what to click on any website and reads each step aloud. Built for people who find websites confusing.",
      },
      { property: "og:title", content: "Guide Me — Website Helper for Chrome" },
      {
        property: "og:description",
        content:
          "Say what you want to do and Guide Me shows a big arrow at the next thing to click, on any website.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Install,
});

const steps = [
  "Download the file below and unzip it (double-click it).",
  "Open a new tab and go to chrome://extensions",
  "Turn on “Developer mode” using the switch in the top-right corner.",
  "Click “Load unpacked” and choose the folder you unzipped.",
  "Open any website, click the Guide Me icon, and tell it what you want to do.",
];

function Install() {
  const download = () => {
    fetch("/guide-me-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "guide-me-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#12203a]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-lg font-bold uppercase tracking-widest text-[#ff6a00]">Chrome extension</p>
        <h1 className="mt-3 text-5xl font-black leading-tight">Guide Me</h1>
        <p className="mt-5 text-2xl leading-relaxed">
          Say what you want to do — like “cancel my Amazon Prime subscription” — and a big orange arrow
          points at exactly what to click next, one step at a time, on any website. Each step is read
          out loud, slowly and clearly.
        </p>
        <p className="mt-4 text-xl text-[#4b5a72]">
          Guide Me never clicks anything for you. You stay in control the whole way.
        </p>

        <button
          onClick={download}
          className="mt-10 w-full rounded-2xl bg-[#ff6a00] px-8 py-6 text-2xl font-black text-white shadow-lg transition hover:brightness-110"
        >
          Download Guide Me
        </button>

        <h2 className="mt-14 text-3xl font-black">How to install it</h2>
        <ol className="mt-6 space-y-5">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-4 rounded-2xl border-2 border-[#d8e0ec] bg-white p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12203a] text-xl font-black text-white">
                {i + 1}
              </span>
              <span className="text-xl leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-lg text-[#4b5a72]">
          Works in Chrome, Edge, Brave, Arc and Opera. If the helper ever says it cannot reach the
          assistant, open the gear icon in the sidebar and check the helper address.
        </p>
      </main>
    </div>
  );
}
