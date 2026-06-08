import { supabase } from "./supabase";

export async function signUpWithUsername(username: string, password: string, email: string) {
  // Check if username already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .single();

  if (existing) {
    throw new Error("Username already taken");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) throw error;

  // Manually insert profile row in case trigger doesn't fire or metadata is delayed
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      username,
      email,
    });
    if (profileError) console.warn("Profile insert warning:", profileError.message);
  }

  return data;
}

export async function loginWithUsername(username: string, password: string) {
  // Lookup the email associated with this username from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("username", username)
    .single();

  if (profileError || !profile?.email) {
    throw new Error("Username not found");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function updateProfile(
  userId: string,
  updates: { username?: string; profile_pic?: string },
) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}
