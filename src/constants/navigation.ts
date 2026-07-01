import { 
  LayoutDashboard, 
  Lightbulb, 
  FileText, 
  Gavel, 
  Users, 
  LineChart, 
  Share2, 
  Landmark 
} from 'lucide-react'

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/justica', label: 'Jurídico', icon: Gavel },
  { href: '/parceiros', label: 'Contatos', icon: Users },
  { href: '/estrategia', label: 'Estratégias', icon: Lightbulb, locked: true },
  { href: '/juridico', label: 'Contratos', icon: FileText, locked: true },
  { href: '/financeiro', label: 'Financeiro', icon: LineChart, locked: true },
  { href: '/pessoas', label: 'Recursos Humanos', icon: Share2, locked: true },
  { href: '/tributario', label: 'Tributário', icon: Landmark, locked: true },
] as const
