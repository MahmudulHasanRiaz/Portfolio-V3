"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  commands: Command[];
  registerCommand: (cmd: Command) => () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);

  const registerCommand = useCallback(
    (cmd: Command): (() => void) => {
      setCommands((prev) => {
        if (prev.some((c) => c.id === cmd.id)) return prev;
        return [...prev, cmd];
      });
      return () => {
        setCommands((prev) => prev.filter((c) => c.id !== cmd.id));
      };
    },
    [],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{ open, setOpen, commands, registerCommand }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx)
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}
