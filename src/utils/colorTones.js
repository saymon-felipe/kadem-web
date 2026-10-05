/**
 * Utilitários para manipulação de cores e derivação de tons/shades.
 * Garante que subcategorias possuam cores estritamente derivadas da sua macro categoria.
 */

export function hexToHsl(hex) {
  if (!hex || typeof hex !== "string") return { h: 0, s: 0, l: 50 };
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) return { h: 0, s: 0, l: 50 };

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let l = (max + min) / 2;
  let s = 0;
  let h = 0;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / delta + 2) * 60;
        break;
      case b:
        h = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  const toHex = (val) => {
    const num = Math.round((val + m) * 255);
    const hex = Math.max(0, Math.min(255, num)).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(rPrime)}${toHex(gPrime)}${toHex(bPrime)}`.toLowerCase();
}

export function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return "#999999";
  let clean = hex.trim();
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (clean.length === 4) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean.toLowerCase();
}

export function isToneOf(color, macroColor, hueTolerance = 18) {
  if (!color || !macroColor) return false;
  const normColor = normalizeHex(color);
  const normMacro = normalizeHex(macroColor);
  if (normColor === normMacro) return true;

  const colorHsl = hexToHsl(normColor);
  const macroHsl = hexToHsl(normMacro);

  if (macroHsl.s < 12) {
    return colorHsl.s < 18;
  }

  const diff = Math.abs(colorHsl.h - macroHsl.h);
  const circularDiff = Math.min(diff, 360 - diff);
  return circularDiff <= hueTolerance;
}

export function clampToMacroTone(color, macroColor) {
  const normMacro = normalizeHex(macroColor);
  if (!color) return normMacro;
  const normColor = normalizeHex(color);
  if (isToneOf(normColor, normMacro)) return normColor;

  const colorHsl = hexToHsl(normColor);
  const macroHsl = hexToHsl(normMacro);

  if (macroHsl.s < 12) {
    return hslToHex(0, 0, Math.max(15, Math.min(88, colorHsl.l)));
  }

  const s = Math.max(20, Math.min(100, colorHsl.s || macroHsl.s));
  const l = Math.max(16, Math.min(86, colorHsl.l || macroHsl.l));
  return hslToHex(macroHsl.h, s, l);
}

export function generateCategoryTones(macroColor) {
  const normMacro = normalizeHex(macroColor);
  const hsl = hexToHsl(normMacro);

  if (hsl.s < 12) {
    return [
      { id: "pastel", label: "Pastel", hex: "#e2e8f0" },
      { id: "light", label: "Claro", hex: "#cbd5e1" },
      { id: "soft", label: "Suave", hex: "#94a3b8" },
      { id: "base", label: "Padrão", hex: normMacro },
      { id: "medium", label: "Médio", hex: "#64748b" },
      { id: "dark", label: "Escuro", hex: "#475569" },
      { id: "deep", label: "Profundo", hex: "#1e293b" },
    ];
  }

  const { h, s } = hsl;
  const tones = [
    { id: "pastel", label: "Pastel", hex: hslToHex(h, Math.min(s, 65), 84) },
    { id: "light", label: "Claro", hex: hslToHex(h, Math.min(s + 5, 80), 72) },
    { id: "soft", label: "Suave", hex: hslToHex(h, Math.max(30, s - 15), 60) },
    { id: "base", label: "Padrão", hex: normMacro },
    {
      id: "vibrant",
      label: "Vibrante",
      hex: hslToHex(h, Math.min(100, Math.max(s + 15, 88)), Math.min(Math.max(hsl.l, 44), 54)),
    },
    { id: "dark", label: "Escuro", hex: hslToHex(h, Math.min(s + 5, 85), 36) },
    { id: "deep", label: "Profundo", hex: hslToHex(h, Math.min(s, 80), 24) },
  ];

  const seen = new Set();
  return tones.filter((tone) => {
    const key = tone.hex.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
