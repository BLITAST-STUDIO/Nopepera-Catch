import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NopperaGame } from "../src/components/NopperaGame";
import "./itch.css";

function focusFrame() {
  try {
    window.focus();
  } catch {
    /* iframe may block */
  }
}

window.addEventListener("pointerdown", focusFrame, { capture: true });
window.addEventListener("touchstart", focusFrame, { capture: true });

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

const mount = () => {
  createRoot(root).render(
    <StrictMode>
      <NopperaGame />
    </StrictMode>,
  );
};

if (document.fonts?.ready) {
  void document.fonts.ready.then(mount, mount);
} else {
  mount();
}
