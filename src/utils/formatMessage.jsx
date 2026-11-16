import React from "react";

/**
 * Builds the standard evaluation scoring message for judges.
 * Prominently highlights the Fest Name, Category, and Interactive Scoring Link
 * for WhatsApp and clipboard sharing.
 */
export const buildJudgeMessage = ({
  festName = "Cognizance",
  programName = "Event",
  category = "General",
  judgeToken = "",
  judgeUrl = "",
}) => {
  const fest = String(festName || "Cognizance").trim();
  const cat = String(category || "General").trim();
  const prog = String(programName || "Event").trim();
  const code = String(judgeToken || "").trim();
  const url = String(judgeUrl || "").trim();

  return [
    `🏆 *${fest.toUpperCase()}* — *Official Scoring Sheet*`,
    ``,
    `📋 *Program:* *${prog}*`,
    `🏷️ *Category:* *${cat}*`,
    code ? `🔑 *Judge Code:* \`${code}\`` : null,
    ``,
    `👉 *Tap to Start Scoring:*`,
    url,
    ``,
    `_Tap the link above to view contestants and submit scores directly._`,
    code
      ? `_(If the link is not clickable, reply 'Hi' to activate it, or enter Code \`${code}\` at ${fest})_`
      : `_(If the link is not clickable, reply 'Hi' to activate it)_`,
  ]
    .filter((line) => line !== null)
    .join("\n");
};

/**
 * Safely parses plain text and turns URLs into clickable interactive links.
 * Works seamlessly in chat bubbles and modal previews without external dependencies.
 */
export const linkifyText = (text, options = {}) => {
  if (!text || typeof text !== "string") return text;
  const { isOwn = false, linkColor } = options;
  const defaultColor = isOwn ? "#ffffff" : "#2563eb";
  const color = linkColor || defaultColor;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  if (parts.length <= 1) return text;

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color,
            textDecoration: "underline",
            wordBreak: "break-all",
            fontWeight: 600,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
