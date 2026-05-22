function getServiceBranch(regimentalNumber) {
  const digits = String(regimentalNumber || "").replace(/\D/g, "");

  if (digits.length === 5) {
    return { serviceBranch: "JDF", digits };
  }

  if (digits.length === 4) {
    return { serviceBranch: "JCA", digits };
  }

  throw new Error("Regimental number must contain 4 or 5 digits.");
}

function parseNameParts(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return {
      givenNames: "",
      surname: "",
      initials: ""
    };
  }

  if (parts.length === 1) {
    return {
      givenNames: "",
      surname: parts[0],
      initials: ""
    };
  }

  const surname = parts[parts.length - 1];
  const givenParts = parts.slice(0, -1);
  const givenNames = givenParts.join(" ");
  const initials = givenParts.map((part) => part.charAt(0).toUpperCase()).join("");

  return {
    givenNames,
    surname,
    initials
  };
}

function formatDisplayName({ fullName, rank, regimentalNumber, isStaff = false }) {
  const { serviceBranch, digits } = getServiceBranch(regimentalNumber);
  const { surname, initials } = parseNameParts(fullName);
  const prefix = isStaff ? serviceBranch : `EX-${serviceBranch}`;
  const safeRank = String(rank || "").trim();

  if (serviceBranch === "JDF") {
    return [prefix, digits, safeRank.toUpperCase(), surname, initials].filter(Boolean).join(" ");
  }

  return [prefix, digits, safeRank, initials, surname].filter(Boolean).join(" ");
}

module.exports = {
  getServiceBranch,
  parseNameParts,
  formatDisplayName
};
