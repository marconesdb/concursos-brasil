// frontend/src/App.tsx
// VERSÃO COMPLETA — inclui todas as páginas públicas, admin e componentes

import { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link,
  useNavigate, useParams, Navigate
} from 'react-router-dom';
import {
  Search, Bell, User, Heart, LayoutDashboard, Menu, X,
  MapPin, Briefcase, GraduationCap, DollarSign, RefreshCw,
  Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Shield,
  LogOut, Settings, BookOpen, Rss, Send, CheckCircle, AlertCircle,
  TrendingUp, Users, FileText, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import axios from 'axios';

// ─── Axios default config ─────────────────────────────────────────────────────
axios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Edital {
  id: number; titulo: string; orgao: string; banca: string;
  nivel: string; area: string; escolaridade: string; vagas: number;
  salario_min: number; salario_max: number; estado: string;
  municipio: string; regiao: string; resumo_ia: string;
  link_edital: string; link_inscricao: string; imagem_capa: string;
  prazo_inscricao: string; data_publicacao: string; publicado: number;
}
interface User { id: number; nome: string; email: string; role: string; }
interface AlertaPerfil {
  regioes: string[]; estados: string[]; areas: string[];
  escolaridades: string[]; salario_minimo: number; frequencia: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtSalario = (v: number) =>
  v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

const fmtData = (d: string) => {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
};

const REGIOES = ['norte','nordeste','centro-oeste','sudeste','sul','nacional'];
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const AREAS = ['judiciaria','saude','educacao','seguranca','tecnologia',
  'administrativa','financeira','engenharia','juridica','outra'];
const ESCOLARIDADES = ['fundamental','medio','tecnico','superior','pos'];

// ─── useAuth hook ─────────────────────────────────────────────────────────────
function useAuth() {
  const raw = localStorage.getItem('user');
  const user: User | null = raw ? JSON.parse(raw) : null;
  const logout = () => { localStorage.removeItem('user'); localStorage.removeItem('token'); };
  return { user, logout };
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, admin = false }: { children: JSX.Element; admin?: boolean }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Concursos<span className="text-emerald-600">Brasil</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-gray-600 hover:text-emerald-600 font-medium text-sm">Início</Link>
              <Link to="/busca" className="text-gray-600 hover:text-emerald-600 font-medium text-sm">Buscar</Link>
              <Link to="/sobre" className="text-gray-600 hover:text-emerald-600 font-medium text-sm">Como Funciona</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/salvos" className="p-2 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-50">
                  <Heart className="w-5 h-5" />
                </Link>
                <Link to="/perfil" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
                  <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-700 font-bold text-xs">{user.nome[0].toUpperCase()}</span>
                  </div>
                  {user.nome.split(' ')[0]}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin/dashboard" className="bg-gray-900 text-white px-3 py-2 rounded-lg font-medium text-sm hover:bg-gray-800 flex items-center gap-1">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium text-sm px-4 py-2">Entrar</Link>
                <Link to="/cadastro" className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700">Cadastrar</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 text-gray-600" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-1">
              {[['/', 'Início'], ['/busca', 'Buscar'], ['/sobre', 'Como Funciona']].map(([href, label]) => (
                <Link key={href} to={href} onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">{label}</Link>
              ))}
              {user ? (
                <>
                  <Link to="/perfil" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Meu Perfil</Link>
                  <Link to="/salvos" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Salvos</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-gray-900 font-bold">Painel Admin</Link>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-red-600 font-medium">Sair</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-emerald-600 font-bold">Entrar</Link>
                  <Link to="/cadastro" onClick={() => setOpen(false)} className="block px-3 py-2 text-emerald-600 font-bold">Cadastrar</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// ─── AdminSidebar ─────────────────────────────────────────────────────────────
const AdminSidebar = () => {
  const links = [
    { to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { to: '/admin/editais', icon: <FileText className="w-5 h-5" />, label: 'Editais' },
    { to: '/admin/usuarios', icon: <Users className="w-5 h-5" />, label: 'Usuários' },
    { to: '/admin/coletas', icon: <RefreshCw className="w-5 h-5" />, label: 'Coletas' },
    { to: '/admin/notificacoes', icon: <Bell className="w-5 h-5" />, label: 'Notificações' },
    { to: '/admin/fontes', icon: <Rss className="w-5 h-5" />, label: 'Fontes RSS' },
    { to: '/admin/configuracoes', icon: <Settings className="w-5 h-5" />, label: 'Configurações' },
  ];
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col py-6">
      <div className="px-6 mb-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Admin Panel</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {links.map(l => (
          <Link key={l.to} to={l.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-colors">
            {l.icon} {l.label}
          </Link>
        ))}
      </nav>
      <div className="px-6 pt-4 border-t border-white/10">
        <Link to="/" className="text-xs text-gray-500 hover:text-gray-300">← Voltar ao site</Link>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-gray-50">
    <AdminSidebar />
    <main className="flex-1 p-8 overflow-auto">{children}</main>
  </div>
);

// ─── EditalCard ───────────────────────────────────────────────────────────────
const EditalCard = ({ edital, onSave }: { edital: Edital; onSave?: (id: number) => void }) => (
  <motion.div whileHover={{ y: -4 }}
    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col">
    <div className="relative h-44 overflow-hidden">
      <img src={edital.imagem_capa || `https://picsum.photos/seed/${edital.id}/800/600`}
        alt={edital.titulo} className="w-full h-full object-cover" referrerPolicy="no-referrer"
        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/concurso${edital.id}/800/600`; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      <div className="absolute top-3 left-3 flex gap-1.5">
        <span className="bg-white/90 backdrop-blur text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
          {edital.nivel}
        </span>
        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">{edital.estado}</span>
      </div>
      {onSave && (
        <button onClick={() => onSave(edital.id)}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-emerald-50">
          <Heart className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
        <MapPin className="w-3 h-3" /> {edital.municipio} — {edital.estado}
      </div>
      <h3 className="text-base font-bold text-gray-900 leading-snug mb-2 line-clamp-3">{edital.titulo}</h3>
              <p className="text-gray-500 text-xs mb-4 line-clamp-3 italic flex-1">{edital.resumo_ia}</p>
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Vagas</p>
            <p className="font-bold text-gray-900">{edital.vagas ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Até</p>
            <p className="font-bold text-gray-900">{fmtSalario(edital.salario_max)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo: {fmtData(edital.prazo_inscricao)}</span>
        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium capitalize">{edital.area}</span>
      </div>
      <Link to={`/edital/${edital.id}`}
        className="block w-full text-center py-2.5 bg-gray-50 text-gray-900 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-sm">
        Ver Detalhes
      </Link>
    </div>
  </motion.div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) => {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-10">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-bold ${p === page ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINAS PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [destaques, setDestaques] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      axios.get('/api/editais?limit=6'),
      axios.get('/api/editais/destaques'),
    ]).then(([r1, r2]) => {
      setEditais(r1.data.editais || r1.data);
      setDestaques(r2.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (id: number) => {
    if (!user) return navigate('/login');
    try {
      await axios.post(`/api/usuarios/salvar/${id}`);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-extrabold text-white mb-5 tracking-tight">
            Seu próximo<br /><span className="text-emerald-200">Concurso Público</span>
          </motion.h1>
          <p className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto">
            Rastreamos o DOU diariamente. Resumos com IA. Alertas personalizados.
          </p>
          <form onSubmit={e => { e.preventDefault(); navigate(`/busca?q=${q}`); }}
            className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Ex: Tribunal de Justiça, Polícia Federal, Educação..."
              className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-900" />
            <button type="submit"
              className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm">
              Buscar
            </button>
          </form>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Federal', 'Saúde', 'Educação', 'TI', 'Segurança'].map(tag => (
              <button key={tag} onClick={() => navigate(`/busca?area=${tag.toLowerCase()}`)}
                className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Destaques */}
      {destaques.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-16">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Em destaque</span>
              <h2 className="text-2xl font-extrabold text-gray-900">Mais Procurados</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {destaques.slice(0, 5).map(e => (
              <Link key={e.id} to={`/edital/${e.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all shadow-sm">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={e.imagem_capa || `https://picsum.photos/seed/${e.id}/100/100`}
                    className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 line-clamp-1">{e.orgao}</p>
                  <p className="text-[10px] text-gray-400">{e.vagas} vagas</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Editais Recentes</h2>
            <p className="text-gray-500 text-sm">As últimas publicações do Diário Oficial</p>
          </div>
          <Link to="/busca" className="text-emerald-600 font-bold text-sm hover:underline">Ver todos →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-96 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : editais.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Nenhum edital encontrado.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {editais.map(e => <EditalCard key={e.id} edital={e} onSave={handleSave} />)}
          </div>
        )}
      </div>

      {/* CTA cadastro */}
      {!useAuth().user && (
        <div className="bg-emerald-600 py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Bell className="w-10 h-10 text-emerald-200 mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold text-white mb-3">Não perca nenhum edital</h2>
            <p className="text-emerald-100 mb-8">Crie sua conta e receba alertas personalizados por e-mail e notificação push.</p>
            <Link to="/cadastro" className="px-8 py-4 bg-white text-emerald-700 font-extrabold rounded-2xl hover:bg-emerald-50 transition-all shadow-xl">
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Busca ────────────────────────────────────────────────────────────────────
const Busca = () => {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 12;

  // Filters
  const [q, setQ] = useState('');
  const [regiao, setRegiao] = useState('');
  const [estado, setEstado] = useState('');
  const [area, setArea] = useState('');
  const [escolaridade, setEscolaridade] = useState('');
  const [salarioMin, setSalarioMin] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const buscar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (regiao) params.set('regiao', regiao);
      if (estado) params.set('estado', estado);
      if (area) params.set('area', area);
      if (escolaridade) params.set('escolaridade', escolaridade);
      if (salarioMin) params.set('salario_min', salarioMin);
      params.set('page', String(p));
      params.set('limit', String(LIMIT));
      const res = await axios.get(`/api/editais?${params}`);
      const data = res.data;
      setEditais(Array.isArray(data) ? data : data.editais);
      setTotal(Array.isArray(data) ? data.length : (data.total || data.editais?.length || 0));
      setPage(p);
    } finally { setLoading(false); }
  }, [q, regiao, estado, area, escolaridade, salarioMin]);

  useEffect(() => { buscar(1); }, []);

  const handleSave = async (id: number) => {
    if (!user) return navigate('/login');
    await axios.post(`/api/usuarios/salvar/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40 py-4 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar(1)}
                placeholder="Buscar por órgão, cargo, área..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${showFilters ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Search className="w-4 h-4" /> Filtros
            </button>
            <button onClick={() => buscar(1)}
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm">Buscar</button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  {[
                    { label: 'Região', val: regiao, set: setRegiao, opts: REGIOES },
                    { label: 'Estado', val: estado, set: setEstado, opts: ESTADOS },
                    { label: 'Área', val: area, set: setArea, opts: AREAS },
                    { label: 'Escolaridade', val: escolaridade, set: setEscolaridade, opts: ESCOLARIDADES },
                  ].map(({ label, val, set, opts }) => (
                    <div key={label}>
                      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
                      <select value={val} onChange={e => set(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-white capitalize">
                        <option value="">Todos</option>
                        {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Salário mínimo</label>
                    <input type="number" value={salarioMin} onChange={e => setSalarioMin(e.target.value)}
                      placeholder="Ex: 3000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                  </div>
                </div>
                <button onClick={() => { setRegiao(''); setEstado(''); setArea(''); setEscolaridade(''); setSalarioMin(''); setQ(''); buscar(1); }}
                  className="mt-3 text-xs text-red-500 hover:underline font-medium">Limpar filtros</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500 mb-6">{total} edital(is) encontrado(s)</p>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : editais.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhum edital encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {editais.map(e => <EditalCard key={e.id} edital={e} onSave={handleSave} />)}
          </div>
        )}
        <Pagination page={page} total={total} limit={LIMIT} onChange={p => buscar(p)} />
      </div>
    </div>
  );
};

// ─── EditalPage ───────────────────────────────────────────────────────────────
const EditalPage = () => {
  const { id } = useParams();
  const [edital, setEdital] = useState<Edital | null>(null);
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/editais/${id}`).then(r => setEdital(r.data));
  }, [id]);

  const handleSave = async () => {
    if (!user) return navigate('/login');
    await axios.post(`/api/usuarios/salvar/${id}`);
    setSaved(true);
  };

  if (!edital) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link to="/" className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 mb-6">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Link>
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="h-72 relative">
          <img src={edital.imagem_capa || `https://picsum.photos/seed/${edital.id}/1200/400`}
            className="w-full h-full object-cover" referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/concurso${edital.id}/1200/400`; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{edital.nivel}</span>
              <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{edital.area}</span>
              {edital.escolaridade && (
                <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{edital.escolaridade}</span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">{edital.titulo}</h1>
          </div>
          <button onClick={handleSave}
            className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${saved ? 'bg-emerald-500' : 'bg-white/90 backdrop-blur hover:bg-emerald-50'}`}>
            <Heart className={`w-5 h-5 ${saved ? 'text-white fill-white' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'Órgão', value: edital.orgao },
              { label: 'Banca', value: edital.banca || '—' },
              { label: 'Prazo Inscrição', value: fmtData(edital.prazo_inscricao), highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`p-5 rounded-2xl ${highlight ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                <p className={`text-xs font-bold uppercase mb-1 ${highlight ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</p>
                <p className={`text-lg font-extrabold ${highlight ? 'text-emerald-900' : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { icon: <Briefcase className="w-4 h-4" />, label: 'Vagas', value: edital.vagas ?? '—' },
              { icon: <DollarSign className="w-4 h-4" />, label: 'Salário min.', value: fmtSalario(edital.salario_min) },
              { icon: <DollarSign className="w-4 h-4" />, label: 'Salário máx.', value: fmtSalario(edital.salario_max) },
              { icon: <MapPin className="w-4 h-4" />, label: 'Local', value: `${edital.municipio} / ${edital.estado}` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">{icon}</div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {edital.resumo_ia && (
            <>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3">Resumo pela IA</h2>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-2xl mb-8">
                <p className="text-emerald-900 leading-relaxed italic text-base">{edital.resumo_ia}</p>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            {edital.link_inscricao && (
              <a href={edital.link_inscricao} target="_blank" rel="noreferrer"
                className="flex-1 text-center py-4 bg-emerald-600 text-white font-extrabold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 text-sm">
                Ir para Inscrição →
              </a>
            )}
            {edital.link_edital && (
              <a href={edital.link_edital} target="_blank" rel="noreferrer"
                className="flex-1 text-center py-4 bg-gray-900 text-white font-extrabold rounded-2xl hover:bg-gray-800 transition-all text-sm">
                Baixar Edital Completo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Login ────────────────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const res = await axios.post('/api/usuarios/login', { email, senha });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/');
    } catch { setErr('E-mail ou senha incorretos.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-1 text-center">Bem-vindo de volta</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Acesse sua conta para ver seus alertas</p>
        {err && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm font-medium px-4 py-3 rounded-xl mb-6">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm"
              placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Senha</label>
            <input type="password" required value={senha} onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white font-extrabold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600 text-sm">
          Não tem conta? <Link to="/cadastro" className="text-emerald-600 font-bold hover:underline">Criar conta grátis</Link>
        </p>
      </motion.div>
    </div>
  );
};

// ─── Cadastro ─────────────────────────────────────────────────────────────────
const Cadastro = () => {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (form.senha !== form.confirmar) return setErr('As senhas não coincidem.');
    if (form.senha.length < 6) return setErr('Senha deve ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      await axios.post('/api/usuarios/cadastro', { nome: form.nome, email: form.email, senha: form.senha });
      navigate('/login');
    } catch (err: any) { setErr(err.response?.data?.error || 'Erro ao criar conta.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-1 text-center">Criar conta</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Grátis. Receba alertas de editais na hora.</p>
        {err && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm font-medium px-4 py-3 rounded-xl mb-6">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nome completo', key: 'nome', type: 'text', ph: 'João Silva' },
            { label: 'E-mail', key: 'email', type: 'email', ph: 'seu@email.com' },
            { label: 'Senha', key: 'senha', type: 'password', ph: '••••••••' },
            { label: 'Confirmar senha', key: 'confirmar', type: 'password', ph: '••••••••' },
          ].map(({ label, key, type, ph }) => (
            <div key={key}>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
              <input type={type} required value={(form as any)[key]} onChange={set(key)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm"
                placeholder={ph} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white font-extrabold rounded-xl hover:bg-emerald-700 transition-all mt-2 disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600 text-sm">
          Já tem conta? <Link to="/login" className="text-emerald-600 font-bold hover:underline">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
};

// ─── Perfil ───────────────────────────────────────────────────────────────────
const Perfil = () => {
  const { user } = useAuth();
  const [alerta, setAlerta] = useState<AlertaPerfil>({
    regioes: [], estados: [], areas: [], escolaridades: [],
    salario_minimo: 0, frequencia: 'imediato'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get('/api/usuarios/perfil').then(r => {
      if (r.data.alerta) setAlerta(r.data.alerta);
    });
  }, []);

  const toggle = (arr: string[], val: string, set: (a: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const save = async () => {
    await axios.put('/api/usuarios/perfil', { alerta });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Meu Perfil</h1>
      <p className="text-gray-500 mb-10">Configure seus alertas para receber editais compatíveis com seu perfil.</p>

      <div className="space-y-8">
        {/* Conta */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" /> Dados da conta
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-extrabold text-emerald-700">{user?.nome[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.nome}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" /> Configurar Alertas
          </h2>

          {[
            { label: 'Regiões', opts: REGIOES, arr: alerta.regioes, set: (v: string[]) => setAlerta(a => ({ ...a, regioes: v })) },
            { label: 'Estados', opts: ESTADOS, arr: alerta.estados, set: (v: string[]) => setAlerta(a => ({ ...a, estados: v })) },
            { label: 'Áreas', opts: AREAS, arr: alerta.areas, set: (v: string[]) => setAlerta(a => ({ ...a, areas: v })) },
            { label: 'Escolaridade', opts: ESCOLARIDADES, arr: alerta.escolaridades, set: (v: string[]) => setAlerta(a => ({ ...a, escolaridades: v })) },
          ].map(({ label, opts, arr, set }) => (
            <div key={label}>
              <p className="text-sm font-bold text-gray-700 mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {opts.map(o => (
                  <button key={o} onClick={() => toggle(arr, o, set)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border capitalize transition-colors ${arr.includes(o) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Salário mínimo (R$)</p>
              <input type="number" value={alerta.salario_minimo || ''} onChange={e => setAlerta(a => ({ ...a, salario_minimo: Number(e.target.value) }))}
                placeholder="Ex: 3000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Frequência de alertas</p>
              <select value={alerta.frequencia} onChange={e => setAlerta(a => ({ ...a, frequencia: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-white">
                {['imediato','diario','semanal'].map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
          </div>

          <button onClick={save}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : 'Salvar Alertas'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Salvos ───────────────────────────────────────────────────────────────────
const Salvos = () => {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/usuarios/salvos').then(r => setEditais(r.data)).finally(() => setLoading(false));
  }, []);

  const remover = async (id: number) => {
    await axios.delete(`/api/usuarios/salvar/${id}`);
    setEditais(e => e.filter(x => x.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Editais Salvos</h1>
      <p className="text-gray-500 mb-10">Seus favoritos para acompanhar.</p>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : editais.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Você ainda não salvou nenhum edital.</p>
          <Link to="/busca" className="text-emerald-600 font-bold mt-2 inline-block hover:underline">Explorar editais →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {editais.map(e => (
            <div key={e.id} className="relative">
              <EditalCard edital={e} />
              <button onClick={() => remover(e.id)}
                className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-10">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sobre ────────────────────────────────────────────────────────────────────
const Sobre = () => (
  <div className="max-w-3xl mx-auto px-4 py-16">
    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Como funciona</h1>
    <p className="text-gray-600 text-lg mb-12">O ConcursosBrasil automatiza a coleta e o processamento de editais para você não perder oportunidades.</p>
    {[
      { icon: <BookOpen />, title: 'Coleta Automática', desc: 'Todo dia às 6h coletamos o Diário Oficial da União e feeds RSS parceiros, filtrando apenas editais de concursos.' },
      { icon: <TrendingUp />, title: 'Processamento com IA', desc: 'Cada edital é processado pela IA Groq que extrai dados estruturados e gera um resumo em 3 linhas para facilitar a leitura.' },
      { icon: <Bell />, title: 'Alertas Personalizados', desc: 'Configure seu perfil com regiões, áreas e escolaridade desejadas. Receba e-mail ou push notification imediatamente quando um edital compatível aparecer.' },
      { icon: <Search />, title: 'Busca Avançada', desc: 'Filtre por estado, área, salário mínimo, escolaridade e banca organizadora para encontrar exatamente o que procura.' },
    ].map(({ icon, title, desc }) => (
      <div key={title} className="flex gap-6 mb-10">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-600">{icon}</div>
        <div>
          <h3 className="font-extrabold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINAS ADMIN
// ─────────────────────────────────────────────────────────────────────────────

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/dashboard'),
      axios.get('/api/admin/coletas/logs?limit=5'),
    ]).then(([r1, r2]) => { setStats(r1.data); setLogs(r2.data); });
  }, []);

  const forcarColeta = async () => {
    await axios.post('/api/admin/coletas/forcar');
    alert('Coleta iniciada em background.');
  };

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral do sistema</p>
        </div>
        <button onClick={forcarColeta}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm">
          <RefreshCw className="w-4 h-4" /> Forçar Coleta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total de Editais', value: stats.totalEditais, icon: <FileText />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Usuários Cadastrados', value: stats.totalUsuarios, icon: <Users />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Editais Hoje', value: stats.editaisHoje, icon: <TrendingUp />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Notif. Enviadas Hoje', value: stats.notificacoesHoje ?? 0, icon: <Bell />, color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
              {icon}
            </div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-extrabold text-gray-900 mb-4">Últimas Coletas</h2>
        {logs.length === 0 ? <p className="text-gray-400 text-sm">Nenhuma coleta registrada.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 text-xs uppercase">
              <th className="pb-3">Fonte</th><th className="pb-3">Novos</th><th className="pb-3">Duplicados</th><th className="pb-3">Erros</th><th className="pb-3">Data</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((l, i) => (
                <tr key={i} className="py-2">
                  <td className="py-2 font-medium text-gray-700">{l.fonte}</td>
                  <td className="py-2 text-emerald-600 font-bold">{l.editais_novos}</td>
                  <td className="py-2 text-gray-500">{l.editais_duplicados}</td>
                  <td className="py-2 text-red-500">{l.erros}</td>
                  <td className="py-2 text-gray-400">{fmtData(l.executado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Admin Editais ────────────────────────────────────────────────────────────
const AdminEditais = () => {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const res = await axios.get(`/api/admin/editais?q=${q}&limit=20`);
    setEditais(res.data.editais || res.data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const togglePublicado = async (id: number, pub: number) => {
    await axios.put(`/api/admin/editais/${id}`, { publicado: pub ? 0 : 1 });
    setEditais(e => e.map(x => x.id === id ? { ...x, publicado: pub ? 0 : 1 } : x));
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este edital?')) return;
    await axios.delete(`/api/admin/editais/${id}`);
    setEditais(e => e.filter(x => x.id !== id));
  };

  const reprocessar = async (id: number) => {
    await axios.post(`/api/admin/editais/${id}/reprocessar`);
    alert('Reprocessamento solicitado.');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Gerenciar Editais</h1>
      </div>
      <div className="flex gap-3 mb-6">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && carregar()}
          placeholder="Buscar edital..." className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
        <button onClick={carregar} className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700">Buscar</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-10 text-center text-gray-400">Carregando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vagas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {editais.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{e.titulo}</p>
                    <p className="text-xs text-gray-400">{e.orgao} · {e.banca}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.estado}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{e.vagas ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${e.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.publicado ? 'Publicado' : 'Oculto'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublicado(e.id, e.publicado)} title={e.publicado ? 'Ocultar' : 'Publicar'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        {e.publicado ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => reprocessar(e.id)} title="Reprocessar IA"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => excluir(e.id)} title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Admin Usuarios ───────────────────────────────────────────────────────────
const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => { axios.get('/api/admin/usuarios').then(r => setUsuarios(r.data)); }, []);

  const toggleAtivo = async (id: number, ativo: number) => {
    await axios.put(`/api/admin/usuarios/${id}/status`, { ativo: ativo ? 0 : 1 });
    setUsuarios(u => u.map(x => x.id === id ? { ...x, ativo: ativo ? 0 : 1 } : x));
  };

  const promover = async (id: number, role: string) => {
    const novoRole = role === 'admin' ? 'user' : 'admin';
    await axios.put(`/api/admin/usuarios/${id}/role`, { role: novoRole });
    setUsuarios(u => u.map(x => x.id === id ? { ...x, role: novoRole } : x));
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Gerenciar Usuários</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-gray-500 text-xs uppercase text-left">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtData(u.criado_em)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {u.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => toggleAtivo(u.id, u.ativo)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">
                      {u.ativo ? 'Bloquear' : 'Ativar'}
                    </button>
                    <button onClick={() => promover(u.id, u.role)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-purple-50 text-gray-600 hover:text-purple-700 font-medium">
                      {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Admin Coletas ────────────────────────────────────────────────────────────
const AdminColetas = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [cronAtivo, setCronAtivo] = useState(true);
  const [forcing, setForcing] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/coletas/logs').then(r => setLogs(r.data));
  }, []);

  const forcar = async () => {
    setForcing(true);
    await axios.post('/api/admin/coletas/forcar');
    setTimeout(async () => {
      const r = await axios.get('/api/admin/coletas/logs');
      setLogs(r.data); setForcing(false);
    }, 3000);
  };

  const toggleCron = async () => {
    await axios.put('/api/admin/coletas/status', { ativo: !cronAtivo });
    setCronAtivo(!cronAtivo);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Controle de Coletas</h1>
        <div className="flex gap-3">
          <button onClick={toggleCron}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors ${cronAtivo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
            {cronAtivo ? 'Pausar Cron' : 'Ativar Cron'}
          </button>
          <button onClick={forcar} disabled={forcing}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${forcing ? 'animate-spin' : ''}`} />
            {forcing ? 'Coletando...' : 'Forçar Agora'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Status do Cron</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${cronAtivo ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className={`font-extrabold ${cronAtivo ? 'text-emerald-600' : 'text-gray-400'}`}>
              {cronAtivo ? 'Ativo' : 'Pausado'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total de Execuções</p>
          <p className="text-3xl font-extrabold text-gray-900">{logs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Última Execução</p>
          <p className="font-bold text-gray-900">{logs[0] ? fmtData(logs[0].executado_em) : '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-extrabold text-gray-900">Log de Coletas</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-gray-500 text-xs uppercase text-left">
              <th className="px-4 py-3">Fonte</th>
              <th className="px-4 py-3">Novos</th>
              <th className="px-4 py-3">Duplicados</th>
              <th className="px-4 py-3">Erros</th>
              <th className="px-4 py-3">Executado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{l.fonte}</td>
                <td className="px-4 py-3 font-bold text-emerald-600">{l.editais_novos}</td>
                <td className="px-4 py-3 text-gray-500">{l.editais_duplicados}</td>
                <td className="px-4 py-3 text-red-500">{l.erros}</td>
                <td className="px-4 py-3 text-gray-400">{fmtData(l.executado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Admin Notificações ───────────────────────────────────────────────────────
const AdminNotificacoes = () => {
  const [historico, setHistorico] = useState<any[]>([]);
  const [comunicado, setComunicado] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { axios.get('/api/admin/notificacoes/historico').then(r => setHistorico(r.data)); }, []);

  const enviarComunicado = async () => {
    if (!comunicado.trim()) return;
    setSending(true);
    await axios.post('/api/admin/notificacoes/comunicado', { mensagem: comunicado });
    setSending(false); setSent(true); setComunicado('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Notificações</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-8">
        <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-600" /> Enviar Comunicado para Todos
        </h2>
        <textarea value={comunicado} onChange={e => setComunicado(e.target.value)}
          placeholder="Escreva o comunicado aqui..."
          rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none resize-none mb-3" />
        <button onClick={enviarComunicado} disabled={sending || sent}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${sent ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-60`}>
          {sent ? <><CheckCircle className="w-4 h-4" /> Enviado!</> : <><Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar'}</>}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-extrabold text-gray-900">Histórico de Notificações</h2>
        </div>
        {historico.length === 0 ? <p className="p-6 text-gray-400 text-sm">Nenhuma notificação enviada ainda.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-500 text-xs uppercase text-left">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Edital</th>
                <th className="px-4 py-3">Enviado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historico.map((n, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{n.usuario_nome || n.usuario_id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${n.canal === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {n.canal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{n.edital_titulo || n.edital_id}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtData(n.enviado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Admin Fontes RSS ─────────────────────────────────────────────────────────
const AdminFontes = () => {
  const [fontes, setFontes] = useState<any[]>([]);
  const [nova, setNova] = useState({ nome: '', url: '' });

  useEffect(() => { axios.get('/api/admin/fontes').then(r => setFontes(r.data)); }, []);

  const adicionar = async () => {
    if (!nova.nome || !nova.url) return;
    const res = await axios.post('/api/admin/fontes', nova);
    setFontes(f => [...f, res.data]);
    setNova({ nome: '', url: '' });
  };

  const toggleAtiva = async (id: number, ativa: number) => {
    await axios.put(`/api/admin/fontes/${id}`, { ativa: ativa ? 0 : 1 });
    setFontes(f => f.map(x => x.id === id ? { ...x, ativa: ativa ? 0 : 1 } : x));
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Fontes RSS</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        <h2 className="font-extrabold text-gray-900 mb-4">Adicionar nova fonte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input value={nova.nome} onChange={e => setNova(n => ({ ...n, nome: e.target.value }))}
            placeholder="Nome da fonte" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
          <input value={nova.url} onChange={e => setNova(n => ({ ...n, url: e.target.value }))}
            placeholder="https://..." type="url" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
        </div>
        <button onClick={adicionar} className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700">
          Adicionar Fonte
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-gray-500 text-xs uppercase text-left">
              <th className="px-4 py-3">Nome</th><th className="px-4 py-3">URL</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fontes.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{f.nome}</td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{f.url}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${f.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.ativa ? 'Ativa' : 'Pausada'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAtiva(f.id, f.ativa)}
                    className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">
                    {f.ativa ? 'Pausar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Admin Configurações ──────────────────────────────────────────────────────
const AdminConfiguracoes = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { axios.get('/api/admin/configuracoes').then(r => setConfigs(r.data)); }, []);

  const atualizar = async (chave: string, valor: string) => {
    setSaving(chave);
    await axios.put(`/api/admin/configuracoes/${chave}`, { valor });
    setSaving(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Configurações do Sistema</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {configs.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">Nenhuma configuração encontrada.</p>
        ) : configs.map(c => (
          <div key={c.chave} className="px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{c.chave}</p>
              <p className="text-xs text-gray-400">{c.descricao}</p>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input defaultValue={c.valor} id={`cfg_${c.chave}`}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
              <button onClick={() => {
                const el = document.getElementById(`cfg_${c.chave}`) as HTMLInputElement;
                atualizar(c.chave, el.value);
              }} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${saving === c.chave ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {saving === c.chave ? '✓' : 'Salvar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Admin — layout próprio, sem Navbar/Footer */}
        <Route path="/admin/*" element={
          <ProtectedRoute admin>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="editais" element={<AdminEditais />} />
                <Route path="usuarios" element={<AdminUsuarios />} />
                <Route path="coletas" element={<AdminColetas />} />
                <Route path="notificacoes" element={<AdminNotificacoes />} />
                <Route path="fontes" element={<AdminFontes />} />
                <Route path="configuracoes" element={<AdminConfiguracoes />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Público — com Navbar + Footer */}
        <Route path="*" element={
          <div className="min-h-screen flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/busca" element={<Busca />} />
                <Route path="/edital/:id" element={<EditalPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/sobre" element={<Sobre />} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/salvos" element={<ProtectedRoute><Salvos /></ProtectedRoute>} />
              </Routes>
            </main>
            <footer className="bg-white border-t border-gray-100 py-10">
              <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
                    <LayoutDashboard className="text-white w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-700 text-sm">Concursos<span className="text-emerald-600">Brasil</span></span>
                </div>
                <p className="text-gray-400 text-xs">© 2026 ConcursosBrasil. Todos os direitos reservados.</p>
                <div className="flex gap-6">
                  {['Privacidade','Termos','Contato','FAQ'].map(l => (
                    <a key={l} href="#" className="text-gray-400 hover:text-emerald-600 text-xs font-bold uppercase tracking-widest">{l}</a>
                  ))}
                </div>
              </div>
            </footer>
          </div>
        } />
      </Routes>
    </Router>
  );
}