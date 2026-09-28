import { LoginForm } from "./login-form";

// "Sign up to keep talking" at the end of the /try taster links here with
// ?mode=signup, so the form opens on account creation.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { mode } = await searchParams;
  return <LoginForm initialMode={mode === "signup" ? "signup" : "signin"} />;
}
