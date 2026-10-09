import {
  Armchair, ArrowRight, ArrowUpRight, Bath, Bed, Bell, Building2, Briefcase, Calendar, Camera, Car, Check, ChevronDown, ChevronLeft,
  ChevronRight, Compass, Crop, Dumbbell, Eye, Flame, GripVertical, Heart, House, Image as ImageIcon, Info, Landmark, Layers, LayoutDashboard,
  LogOut, Map as MapIcon, MapPin, Maximize2, Menu, MessageCircle, Mountain, MoveVertical, PawPrint, Phone, Plus, RotateCw, Ruler,
  Search, Settings, Share2, ShieldCheck, SlidersHorizontal, Snowflake, Sparkles, Star, Store, Sun, Trash2, Trees, Tv, Upload, User,
  Users, Utensils, Video, Waves, Wifi, Wind, X, Warehouse, Lock, Clock, Tag, TrendingUp, TrendingDown, CircleAlert, CircleCheck,
  Pencil, Copy, Pause, Play, Shirt, Flower2, Baby, Fence, Cctv, Bus, ShoppingBag, GraduationCap, Hospital, Footprints, KeyRound, Handshake,
  BadgeCheck, Filter, Globe, Mail, Inbox, FileText, Flag, Ban, RefreshCw, Navigation, Locate, Zap, Droplets, Wrench, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  home: House, house: House, apartment: Building2, building: Building2, office: Briefcase, store: Store, land: Mountain, farm: Trees,
  warehouse: Warehouse, landmark: Landmark, bed: Bed, bath: Bath, car: Car, ruler: Ruler, area: Maximize2, layers: Layers, stairs: MoveVertical,
  pool: Waves, gym: Dumbbell, security: ShieldCheck, fireplace: Flame, furnished: Armchair, ac: Snowflake, wifi: Wifi, tv: Tv, elevator: MoveVertical,
  pets: PawPrint, sun: Sun, wind: Wind, kitchen: Utensils, lock: Lock, laundry: Shirt, garden: Flower2, kids: Baby, fence: Fence, cctv: Cctv,
  bus: Bus, shopping: ShoppingBag, school: GraduationCap, hospital: Hospital, park: Trees, walk: Footprints, key: KeyRound, handshake: Handshake,
  check: Check, zap: Zap, water: Droplets, tools: Wrench, users: Users, balcony: Sun, terrace: Sun, view: Eye, social: Users,
};

export function Icon({ name, className, size = 20, strokeWidth = 1.75 }: { name: string; className?: string; size?: number; strokeWidth?: number }) {
  const C = ICONS[name] ?? Check;
  return <C className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export function WhatsAppIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5-1.6A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 0 1 0 16.2c-1.4 0-2.7-.4-3.9-1l-.3-.2-2.9.9.9-2.8-.2-.3a8.1 8.1 0 0 1 6.4-12.8Zm-3 4c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4l-1.9-.9c-.3-.1-.5-.1-.7.2l-.8 1c-.2.2-.3.2-.6.1-.9-.4-1.8-.9-2.6-1.8-.5-.6-.9-1.3-1-1.5-.1-.3 0-.4.2-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5Z" />
    </svg>
  );
}

export {
  House, ArrowRight, ArrowUpRight, Bath, Bed, Bell, Building2, Calendar, Camera, Car, Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Crop, Eye, Heart,
  ImageIcon, Info, LayoutDashboard, LogOut, MapIcon, MapPin, Maximize2, Menu, MessageCircle, Phone, Plus, RotateCw, Ruler, Search, Settings, Share2,
  ShieldCheck, SlidersHorizontal, Sparkles, Star, Trash2, Upload, User, Video, X, GripVertical, Clock, Tag, TrendingUp, TrendingDown, CircleAlert,
  CircleCheck, Pencil, Copy, Pause, Play, BadgeCheck, Filter, Globe, Mail, Inbox, FileText, Flag, Ban, RefreshCw, Navigation, Locate, Layers,
};
export type { LucideIcon };

/* --- Iconos añadidos por el equipo de panel/admin (aditivo) --- */
import {
  Send, ArrowLeft, Bookmark, ExternalLink, Ellipsis, Lightbulb, ChartColumn, ShieldAlert, ListChecks, ArrowUp, ArrowDown, 
  ArrowDownRight, CalendarDays, Keyboard, Undo2, Rocket, ScrollText, Database, ChevronUp, BellRing, Minus, Trophy, UserPlus,
} from "lucide-react";
export {
  Send, ArrowLeft, Bookmark, ExternalLink, Ellipsis, Lightbulb, ChartColumn, ShieldAlert, ListChecks, ArrowUp, ArrowDown, ArrowDownRight, CalendarDays,
  Keyboard, Undo2, Rocket, ScrollText, Database, ChevronUp, BellRing, Minus, Trophy, Users, UserPlus, Lock,
};
