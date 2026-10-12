// Minimal createRoot shim over Preact's render, so the app code can stay
// 100% React API while shipping a tiny bundle.
import { render } from "preact";

export function createRoot(el) {
  return {
    render: (vnode) => render(vnode, el),
    unmount: () => render(null, el),
  };
}
