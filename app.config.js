export default {
  expo: {
    owner: "gemver",
    name: "ChoiceCraft",
    slug: "ChoiceCraft",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: { supportsTablet: true },
    android: {
      package: "com.gemver.choicecraft",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      }
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      "eas": {
        "projectId": "7042cbe1-cc19-4273-b3d6-8bba9ab1a09a"
      },
      geminiApiKey: process.env.API_KEY ?? "",
      supabaseUrl: process.env.SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
    },
  "plugins": [
    "expo-font"
  ]
  }
};
