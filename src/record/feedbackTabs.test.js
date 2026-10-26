import assert from "node:assert/strict";
import test from "node:test";
import { feedbackTabView, nextFeedbackTab } from "./feedbackTabs.js";

test("feedback tabs keep critique and coach chat mounted with a message badge", () => {
  const critique = feedbackTabView("critique", 0);
  assert.equal(critique.active, "critique");
  assert.equal(critique.critique.selected, true);
  assert.equal(critique.critique.hidden, false);
  assert.equal(critique.chat.selected, false);
  assert.equal(critique.chat.hidden, true);
  assert.equal(critique.chat.badge, "");

  const chat = feedbackTabView("chat", 3);
  assert.equal(chat.critique.hidden, true);
  assert.equal(chat.chat.hidden, false);
  assert.equal(chat.chat.selected, true);
  assert.equal(chat.chat.badge, "3");
  assert.equal(chat.critique.label, "Critique");
  assert.equal(chat.chat.label, "Coach Chat");
});

test("arrow keys move between critique and coach chat without dropping the other tab", () => {
  assert.equal(nextFeedbackTab("critique", "ArrowRight"), "chat");
  assert.equal(nextFeedbackTab("chat", "ArrowLeft"), "critique");
  assert.equal(nextFeedbackTab("critique", "End"), "chat");
  assert.equal(nextFeedbackTab("chat", "Home"), "critique");
  assert.equal(nextFeedbackTab("chat", "ArrowRight"), "critique");

  const before = feedbackTabView("chat", 2);
  const after = feedbackTabView(nextFeedbackTab(before.active, "ArrowLeft"), 2);
  assert.equal(after.active, "critique");
  assert.equal(after.chat.badge, "2");
  assert.equal(after.chat.hidden, true);
  assert.equal(after.critique.hidden, false);
});
