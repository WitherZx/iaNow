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
  { href: '/estrategia', label: 'Estratégias', icon: Lightbulb },
  { href: '/juridico', label: 'Contratos', icon: FileText },
  { href: '/justica', label: 'Processos', icon: Gavel },
  { href: '/parceiros', label: 'Contatos', icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: LineChart, locked: true },
  { href: '/pessoas', label: 'Recursos Humanos', icon: Share2, locked: true },
  { href: '/tributario', label: 'Tributário', icon: Landmark, locked: true },
] as const
