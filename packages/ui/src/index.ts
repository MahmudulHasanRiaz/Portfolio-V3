export { ErrorBoundary } from "./components/ui/error-boundary";

// UI primitives
import "./styles/tokens.css";
export { cn } from "./lib/utils";

// Components
export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";
export { Input } from "./components/ui/input";
export type { InputProps } from "./components/ui/input";
export { Textarea } from "./components/ui/textarea";
export type { TextareaProps } from "./components/ui/textarea";
export { Badge, badgeVariants } from "./components/ui/badge";
export type { BadgeProps } from "./components/ui/badge";
export { Skeleton } from "./components/ui/skeleton";
export { Separator } from "./components/ui/separator";
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";

// Form controls
export { Checkbox } from "./components/ui/checkbox";
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/ui/select";

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";

// Sheet
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";

// Drawer
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./components/ui/drawer";

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./components/ui/dropdown-menu";

// Tooltip
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/ui/tooltip";

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

// Command
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./components/ui/command";

// Popover
export { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/ui/table";

// Data Table
export { DataTable } from "./components/ui/data-table";
export type { DataTableProps } from "./components/ui/data-table";

// Toast
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./components/ui/toast";
export type { ToastProps, ToastActionElement } from "./components/ui/toast";

// Pagination
export { Pagination } from "./components/ui/pagination";
export type { PaginationProps } from "./components/ui/pagination";

// Breadcrumb
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";

// Empty State
export { EmptyState } from "./components/ui/empty-state";
export type { EmptyStateProps } from "./components/ui/empty-state";

// Loading State
export { LoadingState } from "./components/ui/loading-state";
export type { LoadingStateProps } from "./components/ui/loading-state";

// Error State
export { ErrorState } from "./components/ui/error-state";
export type { ErrorStateProps } from "./components/ui/error-state";

// Styles
import "./styles/tokens.css";

// Icons — original Lucide icons, re-exported so apps/web can use them
// without declaring lucide-react itself (it is already a @repo/ui dep).
export { Code, Database, ShoppingCart, Store, LayoutTemplate, Mic, Building2 } from "lucide-react";
