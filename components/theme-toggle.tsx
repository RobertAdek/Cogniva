import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher({ className, showLabels = false }: { className?: string; showLabels?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Color theme" className={cn("inline-flex rounded-xl border bg-muted/50 p-1", className)}>
      {OPTIONS.map((o) => {
        const active = (theme ?? "system") === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            data-testid={`button-theme-${o.value}`}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
              active && "bg-card text-foreground shadow-sm",
              !active && "hover:text-foreground",
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            {showLabels && o.label}
          </button>
        );
      })}
    </div>
  );
}
