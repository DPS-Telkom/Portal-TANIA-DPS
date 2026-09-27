// Opens the TANIA Copilot panel from anywhere (home hero, header search),
// optionally sending a first question. The panel is the only AI entry point.
const EVENT = "tania:ask";

export interface AskDetail {
  question?: string;
}

export function askTania(question?: string) {
  window.dispatchEvent(new CustomEvent<AskDetail>(EVENT, { detail: { question: question?.trim() || undefined } }));
}

export function onAskTania(handler: (d: AskDetail) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<AskDetail>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
