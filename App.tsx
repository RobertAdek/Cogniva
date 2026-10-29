import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountGate, AppShell } from "@/components/app-shell";
import { Wordmark } from "@/components/brand";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Activate from "@/pages/activate";
import Dashboard from "@/pages/dashboard";
import Subjects from "@/pages/subjects";
import Review from "@/pages/review";
import Flashcards from "@/pages/flashcards";
import Quizzes from "@/pages/quizzes";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorForeground: "hsl(var(--foreground))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorDanger: "hsl(var(--destructive))",
    colorBackground: "hsl(var(--card))",
    colorInput: "hsl(var(--background))",
    colorInputForeground: "hsl(var(--foreground))",
    colorNeutral: "hsl(var(--foreground))",
    fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card border border-border rounded-3xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-primary/15",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-display text-2xl text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-medium hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-secondary",
    alertText: "text-foreground",
    logoBox: "justify-center h-12",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border border-border bg-background hover:bg-muted",
    formButtonPrimary: "bg-primary text-primary-foreground shadow-none",
    formFieldInput: "bg-background border-input text-foreground",
    footerAction: "bg-muted/50 border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/30",
    otpCodeFieldInput: "border-input text-foreground",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function AuthFrame({ children, side }: { children: ReactNode; side: string }) {
  return (
    <div className="relative grid min-h-[100dvh] bg-background md:grid-cols-[1fr_1.1fr]">
      <aside className="ink-panel relative hidden overflow-hidden p-12 md:flex md:flex-col md:justify-between lg:p-16">
        <div className="ruled pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <Link href="/" className="relative" data-testid="link-auth-home"><span className="inline-block rounded-2xl bg-white/95 px-3 py-2 text-[hsl(250_38%_13%)] shadow-lg shadow-black/20"><Wordmark /></span></Link>
        <div className="relative max-w-md">
          <p className="eyebrow mb-5 text-[hsl(168_70%_70%)]">Private study workspace</p>
          <p className="font-display text-[2.6rem] leading-[1.08] text-balance lg:text-5xl">{side}</p>
          <p className="mt-6 max-w-sm leading-relaxed opacity-80">Access requires a single-use invitation. After signing in, you'll be asked for your code if your workspace isn't active yet.</p>
        </div>
        <p className="relative font-mono text-xs opacity-60">Verified notes · Evidence-linked cards · Your approval</p>
      </aside>
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <Link href="/" className="md:hidden" data-testid="link-auth-home-mobile"><Wordmark /></Link>
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame side="Pick up where your notes left off.">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame side="Your notes, your cards, your sign-off.">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function ActivateRoute() {
  return (
    <>
      <Show when="signed-in"><Activate /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function Private({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <AccountGate>
          <AppShell>{children}</AppShell>
        </AccountGate>
      </Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => {
    const page = location.split("/")[1] || "";
    const labels: Record<string, string> = { dashboard: "Dashboard", subjects: "Subjects", review: "Review queue", flashcards: "Flashcards", quizzes: "Quizzes", settings: "Settings", admin: "Administration", activate: "Activate invitation", "sign-in": "Sign in", "sign-up": "Create account" };
    document.title = labels[page] ? `${labels[page]} · Cogniva` : "Cogniva — Your Knowledge. Your Path to Mastery.";
  }, [location]);
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/activate" component={ActivateRoute} />
        <Route path="/dashboard"><Private><Dashboard /></Private></Route>
        <Route path="/subjects"><Private><Subjects /></Private></Route>
        <Route path="/review"><Private><Review /></Private></Route>
        <Route path="/flashcards"><Private><Flashcards /></Private></Route>
        <Route path="/quizzes"><Private><Quizzes /></Private></Route>
        <Route path="/settings"><Private><Settings /></Private></Route>
        <Route path="/admin"><Private><Admin /></Private></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to Cogniva", subtitle: "Sign in to your private study workspace" } },
        signUp: { start: { title: "Create your Cogniva account", subtitle: "You'll activate it with your invitation next" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
