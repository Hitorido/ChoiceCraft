import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors, { dark } from "../constants/colors";
import { Decision, Criterion, DecisionOption } from "../types/decision";
import Constants from "expo-constants";
import { supabase } from '../lib/supabase';
import {
  pushDecisionToSupabase, deleteDecisionFromSupabase, fetchDecisionsFromSupabase,
} from '../lib/supabaseSync';
import { signUpWithUsername, loginWithUsername, getCurrentUser } from '../lib/supabaseAuth';

function calculateWeightedScore(criteria: Criterion[]): number {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = criteria.reduce((sum, c) => sum + c.weight * c.score, 0);
  return weightedSum / totalWeight;
}

function findBestOption(options: DecisionOption[]) {
  let best = { name: "", finalScore: 0 };
  for (const option of options) {
    if (option.finalScore > best.finalScore) {
      best = { name: option.name, finalScore: option.finalScore };
    }
  }
  return best;
}

function normalizeDecision(d: Partial<Decision> & { id: string; title: string; options?: any[]; criteria?: any[]; }): Decision {
  const options: DecisionOption[] = Array.isArray(d.options)
    ? d.options.map((o, index) => {
        const criteria: Criterion[] = Array.isArray(o.criteria) ? o.criteria : [];
        const finalScore = calculateWeightedScore(criteria);
        return {
          id: o.id ?? `${d.id}-opt-${index}`,
          name: o.name ?? `Option ${index + 1}`,
          notes: o.notes ?? "",
          criteria,
          finalScore,
        };
      })
    : [
        {
          id: `${d.id}-opt-0`,
          name: d.title ? "Option 1" : "Option 1",
          notes: "",
          criteria: Array.isArray(d.criteria) ? d.criteria : [],
          finalScore: calculateWeightedScore(Array.isArray(d.criteria) ? d.criteria : []),
        },
      ];

  const best = findBestOption(options);

  return {
    id: d.id,
    title: d.title,
    category: (d as any).category,
    options,
    finalScore: best.finalScore,
    bestOptionName: best.name,
  };
}

interface DecisionContextType {
  userId: string | null;
tutorialsSeenMap: Record<string, boolean>;
tutorialsLoaded: boolean;
markTutorialSeen: (screen: string) => void;
resetAllTutorials: () => Promise<void>;

  currentUser: string | null;
  decisions: Decision[];
  profilePic: string | null;
  apiKey: string | null;
  darkMode: boolean;
  theme: typeof colors;
  toggleDarkMode: () => void;
  login:  (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, email: string) => Promise<void>;
  logout: () => void;
  addDecision: (d: Decision) => void;
  updateDecision: (d: Decision) => void;
  deleteDecision: (id: string) => void;
  setProfilePic: (uri: string) => void;
  setApiKey: (key: string | null) => void;
}

const DecisionContext = createContext<DecisionContextType | undefined>(
  undefined
);

// helper keys
const decisionsKey = (user: string) => `decisions_${user}`;
const picKey = (user: string) => `profilePic_${user}`;
const darkModeKey = "darkModePreference";
const DEFAULT_GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey ?? null;
const apiKeyKey = (user: string) => `apiKey_${user}`;
const tutKey = (user: string) => `tutorials_v1_${user}`;

export const DecisionProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [profilePic, setProfilePicState] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(DEFAULT_GEMINI_API_KEY);
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? dark : colors;
  const safeTheme = theme || colors;  
  const [tutorialsSeenMap, setTutorialsSeenMap] = useState<Record<string, boolean>>({});
  const [tutorialsLoaded, setTutorialsLoaded] = useState(false);

  const loadTutorials = async (user: string) => {
  setTutorialsLoaded(false); // reset before loading
  try {
    const stored = await AsyncStorage.getItem(tutKey(user));
    setTutorialsSeenMap(stored ? JSON.parse(stored) : {});
  } catch {}
  setTutorialsLoaded(true); // ← mark as ready
};

const markTutorialSeen = (screen: string) => {
  setTutorialsSeenMap(prev => {
    const updated = { ...prev, [screen]: true };
    if (currentUser) AsyncStorage.setItem(tutKey(currentUser), JSON.stringify(updated)).catch(() => {});
    return updated;
  });
};

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const username = session.user.user_metadata?.username
        ?? session.user.email?.split('@')[0] ?? 'User';
      setCurrentUser(username);
      setUserId(session.user.id);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const username = session.user.user_metadata?.username
        ?? session.user.email?.split('@')[0] ?? 'User';
      setCurrentUser(username);
      setUserId(session.user.id);
    } else {
      setCurrentUser(null);
      setUserId(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);

const resetAllTutorials = async () => {
  setTutorialsSeenMap({});
  if (currentUser) await AsyncStorage.removeItem(tutKey(currentUser)).catch(() => {});
};

  // when currentUser changes load their data
  useEffect(() => {
  if (currentUser && userId) {
    loadDecisions(currentUser);       // AsyncStorage first (fast)
    loadProfilePic(currentUser);
    loadApiKey(currentUser);
    loadTutorials(currentUser);

    // Then sync from Supabase in background
    fetchDecisionsFromSupabase(userId).then((remote) => {
      if (remote.length > 0) {
        setDecisions(remote);
        saveDecisions(currentUser, remote); // update local cache
      }
    });
    } else if (!currentUser) {
    setDecisions([]);
    setProfilePicState(null);
    setApiKeyState(DEFAULT_GEMINI_API_KEY);
    setTutorialsSeenMap({});
    setTutorialsLoaded(false);
    setUserId(null);
  }
}, [currentUser, userId]);

  // load persisted theme preference (dark / light)
  useEffect(() => {
    (async () => {
      try {
      const stored = await AsyncStorage.getItem(darkModeKey);
        if (stored !== null) {
          setDarkMode(stored === "true");
        }
      } catch (e) {
        // Silent fail for theme load
      }
    })();
  }, []);

const login = async (usernameOrEmail: string, password: string) => {
    await loginWithUsername(usernameOrEmail, password);
    // onAuthStateChange will set currentUser and userId automatically
  };

  const signUp = async (username: string, password: string, email: string) => {
    const data = await signUpWithUsername(username, password, email);
    if (!data?.session && !data?.user) {
      throw new Error("Signup failed. Please try again.");
    }
    if (!data?.session) {
      throw new Error("Account created! Please check your email to confirm your account, then log in.");
    }
    // onAuthStateChange will set currentUser and userId automatically
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserId(null);
    setTutorialsLoaded(false);
    setTutorialsSeenMap({});
    setDecisions([]);
    setProfilePicState(null);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(darkModeKey, String(next)).catch(() => {
        /* ignore */
      });
      return next;
    });
  };

  const loadDecisions = async (user: string) => {
    try {
      const json = await AsyncStorage.getItem(decisionsKey(user));
      if (json) {
        const raw = JSON.parse(json) as any[];
        // Migrate legacy decisions (criteria directly on decision) to the new options model
        const migrated = raw.map((d) => normalizeDecision({ ...d, id: d.id ?? String(Date.now()), title: d.title ?? "" }));
        setDecisions(migrated);
      } else {
        setDecisions([]);
      }
    } catch (e) {
      console.warn("Failed to load decisions", e);
    }
  };

  const saveDecisions = async (user: string, list: Decision[]) => {
    try {
      await AsyncStorage.setItem(decisionsKey(user), JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to save decisions", e);
    }
  };

  const addDecision = (d: Decision) => {
    const safe = normalizeDecision(d);
    setDecisions((prev) => {
      const updated = [...prev, safe];
      if (currentUser) saveDecisions(currentUser, updated);   // AsyncStorage
      if (userId) pushDecisionToSupabase(userId, safe);       // Supabase background
      return updated;
    });
  };

  const updateDecision = (d: Decision) => {
    const safe = normalizeDecision(d);
    setDecisions((prev) => {
      const updated = prev.map((item) => item.id === d.id ? safe : item);
      if (currentUser) saveDecisions(currentUser, updated);
      if (userId) pushDecisionToSupabase(userId, safe);
      return updated;
    });
  };

  const deleteDecision = (id: string) => {
    setDecisions((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (currentUser) saveDecisions(currentUser, updated);
      return updated;
    });
    if (userId) deleteDecisionFromSupabase(id);
  };

  const loadProfilePic = async (user: string) => {
    try {
      const uri = await AsyncStorage.getItem(picKey(user));
      if (uri) setProfilePicState(uri);
      else setProfilePicState(null);
    } catch (e) {
      console.warn("Failed to load profile pic", e);
    }
  };

  const loadApiKey = async (user: string) => {
    try {
      const stored = await AsyncStorage.getItem(apiKeyKey(user));
      if (stored) {
        setApiKeyState(stored);
      }
    } catch (e) {
      console.warn("Failed to load API key", e);
    }
  };

  const setProfilePic = async (uri: string) => {
    setProfilePicState(uri);
    if (currentUser) {
      try {
        await AsyncStorage.setItem(picKey(currentUser), uri);
      } catch (e) {
        console.warn("Failed to save profile pic", e);
      }
    }
  };

  const setApiKey = async (key: string | null) => {
    setApiKeyState(key);
    if (!currentUser) return;
    try {
      if (key) {
        await AsyncStorage.setItem(apiKeyKey(currentUser), key);
      } else {
        await AsyncStorage.removeItem(apiKeyKey(currentUser));
      }
    } catch (e) {
      console.warn("Failed to save API key", e);
    }
  };

  return (
    <DecisionContext.Provider
      value={{
        userId,
        signUp,
        tutorialsLoaded,
        currentUser,
        decisions,
        tutorialsSeenMap,
        markTutorialSeen,
        resetAllTutorials,
        profilePic,
        apiKey,
        darkMode,
        theme,
        toggleDarkMode,
        login,
        logout,
        addDecision,
        updateDecision,
        deleteDecision,
        setProfilePic,
        setApiKey,
      }}
    >
      {children}
    </DecisionContext.Provider>
  );
};

export const useDecisions = () => {
  const context = useContext(DecisionContext);
  if (!context) {
    throw new Error("useDecisions must be used within DecisionProvider");
  }
  return context;
};