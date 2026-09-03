import {
  Activity, Airplay, Archive, Bell, BookOpen, BriefcaseBusiness, CalendarDays, Camera,
  CheckCircle2, Clock3, Cloud, Code2, Coffee, Compass, FileText, Film, Folder, FolderHeart,
  Gamepad2, Gift, Globe2, GraduationCap, Headphones, Heart, Home, Image, KeyRound, Laptop,
  Lightbulb, Link2, LockKeyhole, MapPin, MessageCircle, Music2, Palette, Plane, Rocket,
  ShoppingBag, Sparkles, Star, Sun, Terminal, Users, Video, WalletCards, Zap
} from 'lucide-react';

export const iconCatalog = [
  ['folder', 'Folder', 'Files', Folder], ['folder-heart', 'Favorite folder', 'Files', FolderHeart],
  ['archive', 'Archive', 'Files', Archive], ['file-text', 'Document', 'Files', FileText],
  ['briefcase', 'Work', 'Work', BriefcaseBusiness], ['calendar', 'Calendar', 'Work', CalendarDays],
  ['check', 'Completed', 'Work', CheckCircle2], ['clock', 'Clock', 'Work', Clock3],
  ['code', 'Code', 'Work', Code2], ['laptop', 'Laptop', 'Work', Laptop], ['terminal', 'Terminal', 'Work', Terminal],
  ['camera', 'Camera', 'Media', Camera], ['film', 'Film', 'Media', Film], ['headphones', 'Headphones', 'Media', Headphones],
  ['image', 'Image', 'Media', Image], ['music', 'Music', 'Media', Music2], ['video', 'Video', 'Media', Video],
  ['airplay', 'Airplay', 'Devices', Airplay], ['cloud', 'Cloud', 'Devices', Cloud], ['key', 'Key', 'Devices', KeyRound],
  ['lock', 'Lock', 'Devices', LockKeyhole], ['activity', 'Activity', 'Devices', Activity],
  ['compass', 'Compass', 'Places', Compass], ['globe', 'Globe', 'Places', Globe2], ['home', 'Home', 'Places', Home],
  ['map-pin', 'Location', 'Places', MapPin], ['plane', 'Travel', 'Places', Plane], ['rocket', 'Rocket', 'Places', Rocket],
  ['bell', 'Bell', 'Symbols', Bell], ['book', 'Book', 'Symbols', BookOpen], ['coffee', 'Coffee', 'Symbols', Coffee],
  ['game', 'Game', 'Symbols', Gamepad2], ['gift', 'Gift', 'Symbols', Gift], ['graduate', 'Study', 'Symbols', GraduationCap],
  ['heart', 'Heart', 'Symbols', Heart], ['idea', 'Idea', 'Symbols', Lightbulb], ['link', 'Link', 'Symbols', Link2],
  ['message', 'Message', 'Symbols', MessageCircle], ['palette', 'Palette', 'Symbols', Palette], ['shop', 'Shopping', 'Symbols', ShoppingBag],
  ['sparkles', 'Sparkles', 'Symbols', Sparkles], ['star', 'Star', 'Symbols', Star], ['sun', 'Sun', 'Symbols', Sun],
  ['users', 'People', 'Symbols', Users], ['wallet', 'Wallet', 'Symbols', WalletCards], ['zap', 'Energy', 'Symbols', Zap]
].map(([key, label, category, Icon]) => ({ key, label, category, Icon }));

export const iconComponents = Object.fromEntries(iconCatalog.map(({ key, Icon }) => [key, Icon]));

export const emojiCatalog = ['✨', '💚', '💙', '📁', '🗂️', '📝', '📌', '⭐', '🌙', '☀️', '🌈', '🎧', '🎵', '🎬', '📷', '🎨', '💡', '🚀', '✈️', '🏠', '💻', '🧠', '🌱', '🌿', '🌸', '🐱', '🐶', '🦋', '🍀', '🍎', '☕', '🎁', '🔒', '🔑', '❤️', '🔥'];
