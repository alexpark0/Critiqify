const TAB_ORDER = ["critique", "chat"];

export function feedbackTabView(activeTab, messageCount) {
  const active = activeTab === "chat" ? "chat" : "critique";
  const count = Number.isFinite(messageCount) && messageCount > 0 ? Math.floor(messageCount) : 0;
  return {
    active,
    critique: {
      id: "critique",
      label: "Critique",
      selected: active === "critique",
      hidden: active !== "critique",
      badge: "",
    },
    chat: {
      id: "chat",
      label: "Coach Chat",
      selected: active === "chat",
      hidden: active !== "chat",
      badge: count ? String(count) : "",
    },
  };
}

export function nextFeedbackTab(activeTab, key) {
  const active = activeTab === "chat" ? "chat" : "critique";
  const index = TAB_ORDER.indexOf(active);
  if (key === "ArrowRight") return TAB_ORDER[(index + 1) % TAB_ORDER.length];
  if (key === "ArrowLeft") return TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length];
  if (key === "Home") return "critique";
  if (key === "End") return "chat";
  return active;
}
