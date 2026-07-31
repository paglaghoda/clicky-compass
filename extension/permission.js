const btn = document.getElementById("allow");
const done = document.getElementById("done");

btn.addEventListener("click", async () => {
  done.textContent = "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    done.textContent = "All set. You can close this tab and use the big orange microphone.";
    btn.disabled = true;
  } catch {
    done.textContent =
      "The browser said no. Click the small icon at the left of the address bar and allow the microphone.";
  }
});
