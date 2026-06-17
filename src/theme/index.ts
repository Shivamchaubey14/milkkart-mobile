// MilkKart design tokens — kept in sync with the web app's palette
// (green primary, navy text) so mobile and web feel like one brand.
export const colors = {
  green: "#3bb77e",
  greenDark: "#29a06a",
  greenTint: "#def9ec",
  heading: "#253d4e",
  text: "#5b6b75",
  muted: "#9aa6ad",
  line: "#ececec",
  lineSoft: "#f1f3f2",
  bg: "#ffffff",
  bgSoft: "#f4f6f5",
  error: "#d23f3f",
  errorTint: "#fdecec",
  yellow: "#fdc040",
  white: "#ffffff",
};

// 8-pt spacing grid (SRS §6.1)
export const spacing = (n: number) => n * 8;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = {
  h1: 26,
  h2: 20,
  title: 17,
  body: 15,
  small: 13,
  tiny: 11,
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
