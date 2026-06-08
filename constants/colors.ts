// central color palette used across the app
// Light theme is the default export to keep existing imports working.
const light = {
  // updated to match HabitFlow branding (purple & gold)
  primary: "#6A0DAD", // rich purple
  secondary: "#FFC107", // gold accent
  accent: "#FFC107",
  background: "#F5F5F5",
  background2: "#EDE7F6",
  card: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E0E0E0",
  text: "#212121",
  placeholder: "#9E9E9E",
  disabled: "#BDBDBD",
  shadow: "rgba(0,0,0,0.15)",
  gradientStart: "#7B1FA2",
  gradientEnd: "#E1BEE7",
};

export const dark = {
  primary: "#D5B8FF",
  secondary: "#FFC107",
  accent: "#FFC107",
  background: "#0D0C10",
  background2: "#12111A",
  card: "#1F1B2E",
  surface: "#221F2E",
  border: "#3A374F",
  text: "#F3F2FF",
  placeholder: "#B0A8D1",
  disabled: "#4A4A66",
  shadow: "rgba(0,0,0,0.35)",
  gradientStart: "#2B1C4A",
  gradientEnd: "#09051A",
};

export default light;
