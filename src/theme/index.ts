// MilkKart design tokens — the brand color system, kept in sync with the web
// app and the "Mobile App Color System" palette. Three brand cores —
// Nest Green (#3BB77E), Cream Yolk (#FDC040), Ink (#253D4E) — each with a
// 50→900 tint/shade scale, plus neutral surfaces and semantic states.
//
// Usage guidance (from the palette spec):
//   • Nest Green is the single primary — one green CTA per screen.
//   • Cream Yolk is an accent only (ratings, promo chips, badges) — never body
//     text, and it needs Ink text on top (not white) to stay legible.
//   • Ink carries all text and dark headers.

// Full tint/shade scales -----------------------------------------------------
export const greenScale = {
  50: "#eaf7f1",
  100: "#cdecde",
  200: "#9fdcc0",
  300: "#71cca1",
  400: "#52c08d",
  500: "#3bb77e", // Nest Green — brand primary
  600: "#329c6b",
  700: "#287d56",
  800: "#1e5e41",
  900: "#143e2b",
};

export const yellowScale = {
  50: "#fff8e9",
  100: "#feedc4",
  200: "#fee19e",
  300: "#fed578",
  400: "#fdcb5c",
  500: "#fdc040", // Cream Yolk — brand accent
  600: "#e0a52f",
  700: "#b98421",
  800: "#8c6315",
  900: "#5e420c",
};

export const inkScale = {
  50: "#eef1f3",
  100: "#d4dbe0",
  200: "#aeb9c1",
  300: "#8897a3",
  400: "#5e7180",
  500: "#3d566a",
  600: "#253d4e", // Ink — text & dark surfaces
  700: "#1d303d",
  800: "#15232d",
  900: "#0c151b",
};

// Flat tokens — what components reference day to day. Existing keys are kept so
// current components (Button/Screen/TextField) keep working unchanged.
export const colors = {
  // Brand primary (Nest Green)
  green: greenScale[500],
  greenDark: greenScale[600],
  greenTint: greenScale[50],
  // Accent (Cream Yolk)
  yellow: yellowScale[500],
  yellowTint: yellowScale[50],
  // Ink — text & headings
  heading: inkScale[600], // #253d4e
  text: "#5e7180", // inkScale 400 — body text
  muted: "#7a8893", // captions, hints (palette "Text Muted")
  // Surfaces & lines
  bg: "#ffffff", // app canvas / cards / inputs
  bgSoft: "#f4f5f3", // neutral surface (palette "Surface")
  line: "#e3e7e9", // dividers, hairlines (palette "Border")
  lineSoft: "#eef1f3",
  white: "#ffffff",
  // Semantic states
  success: greenScale[500], // #3bb77e
  successTint: greenScale[50],
  warning: yellowScale[500], // #fdc040
  warningTint: yellowScale[50],
  error: "#e54d42",
  errorTint: "#fdecec",
  info: "#3e92e5",
  infoTint: "#e8f2fc",
  rating: yellowScale[500], // stars, reviews
};

// Full scales grouped, for when a component needs a specific step.
export const palette = {
  green: greenScale,
  yellow: yellowScale,
  ink: inkScale,
};

// 8-pt spacing grid (SRS §6.1)
export const spacing = (n: number) => n * 8;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const font = {
  h1: 26,
  h2: 20,
  title: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

// Brand typeface — Quicksand (rounded geometric), the same family the web
// storefront uses for its entire UI. Use these family names instead of
// `fontWeight`, since each weight is its own loaded font file. Names match the
// @expo-google-fonts export ids loaded in App.tsx — keep both in sync.
export const fonts = {
  regular: "Quicksand_400Regular",
  medium: "Quicksand_500Medium",
  semibold: "Quicksand_600SemiBold",
  bold: "Quicksand_700Bold",
};

// Nunito Sans — secondary family. Its ExtraBold 800 is the brand's tracked,
// uppercase "tagline / eyebrow" style; the lighter weights are available for
// dense body/label text where Quicksand's roundness is too soft.
export const fontsAlt = {
  regular: "NunitoSans_400Regular",
  semibold: "NunitoSans_600SemiBold",
  bold: "NunitoSans_700Bold",
  extrabold: "NunitoSans_800ExtraBold",
};

export const shadow = {
  card: {
    shadowColor: "#253d4e",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
