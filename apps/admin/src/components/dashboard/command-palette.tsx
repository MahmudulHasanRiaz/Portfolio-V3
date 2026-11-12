"use client";

import { useRouter } from "next/navigation";
import { CommandDialog, CommandInput, CommandEmpty, CommandList, CommandGroup, CommandItem } from "@repo/ui";
import { useCommandPalette } from "@/components/providers/command-palette-provider";

export function CommandPalette() {
  const { open, setOpen, commands } = useCommandPalette();
  const router = useRouter();

  const defaultCommands = [
    {
      id: "go-dashboard",
      label: "Go to Dashboard",
      action: () => { router.push("/dashboard"); setOpen(false); },
    },
    {
      id: "go-homepage",
      label: "Go to Homepage Sections",
      action: () => { router.push("/dashboard/homepage"); setOpen(false); },
    },
    {
      id: "go-revisions",
      label: "Go to Revisions",
      action: () => { router.push("/dashboard/revisions"); setOpen(false); },
    },
    {
      id: "go-blog",
      label: "Go to Blog",
      action: () => { router.push("/dashboard/blog"); setOpen(false); },
    },
    {
      id: "go-projects",
      label: "Go to Projects",
      action: () => { router.push("/dashboard/projects"); setOpen(false); },
    },
    {
      id: "go-services",
      label: "Go to Services",
      action: () => { router.push("/dashboard/services"); setOpen(false); },
    },
    {
      id: "go-releases",
      label: "Go to Releases",
      action: () => { router.push("/dashboard/releases"); setOpen(false); },
    },
    {
      id: "go-ventures",
      label: "Go to Ventures",
      action: () => { router.push("/dashboard/ventures"); setOpen(false); },
    },
    {
      id: "go-platforms",
      label: "Go to Platforms",
      action: () => { router.push("/dashboard/platforms"); setOpen(false); },
    },
    {
      id: "go-technologies",
      label: "Go to Technologies",
      action: () => { router.push("/dashboard/technologies"); setOpen(false); },
    },
    {
      id: "go-clients",
      label: "Go to Clients",
      action: () => { router.push("/dashboard/clients"); setOpen(false); },
    },
    {
      id: "go-profile",
      label: "Go to Profile",
      action: () => { router.push("/dashboard/settings/profile"); setOpen(false); },
    },
    {
      id: "go-content",
      label: "Go to Content",
      action: () => { router.push("/dashboard/content"); setOpen(false); },
    },
    {
      id: "go-crm",
      label: "Go to CRM",
      action: () => { router.push("/dashboard/crm"); setOpen(false); },
    },
    {
      id: "go-settings",
      label: "Go to Settings",
      action: () => { router.push("/dashboard/settings"); setOpen(false); },
    },
    {
      id: "go-media",
      label: "Go to Media",
      action: () => { router.push("/dashboard/media"); setOpen(false); },
    },
    {
      id: "go-finance",
      label: "Go to Finance",
      action: () => { router.push("/dashboard/finance"); setOpen(false); },
    },
    {
      id: "go-invoices",
      label: "Go to Invoices",
      action: () => { router.push("/dashboard/finance/invoices"); setOpen(false); },
    },
    {
      id: "go-proposals",
      label: "Go to Proposals",
      action: () => { router.push("/dashboard/proposals"); setOpen(false); },
    },
    {
      id: "go-portal",
      label: "Go to Portal",
      action: () => { router.push("/dashboard/portal"); setOpen(false); },
    },
    {
      id: "go-analytics",
      label: "Go to Analytics",
      action: () => { router.push("/dashboard/analytics"); setOpen(false); },
    },
    {
      id: "go-seo",
      label: "Go to SEO",
      action: () => { router.push("/dashboard/seo"); setOpen(false); },
    },
    {
      id: "go-workflows",
      label: "Go to Workflows",
      action: () => { router.push("/dashboard/workflows"); setOpen(false); },
    },
  ];

  const allCommands = [...defaultCommands, ...commands];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {allCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => {
                cmd.action();
                setOpen(false);
              }}
            >
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
