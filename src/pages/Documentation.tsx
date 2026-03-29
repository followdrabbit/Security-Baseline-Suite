import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import {
  BookOpen, LayoutDashboard, Plus, Library, Settings2, Cpu, FileEdit, GitBranch,
  History, ArrowUpDown, Brain, Users, Settings, Shield, Search, ChevronRight,
  ChevronDown, Zap, Target, Lock, FileText, Download, Eye, Filter, BarChart3,
  Bell, Palette, Globe, MessageCircle, ArrowRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

const SectionCard: React.FC<{ section: DocSection; isOpen: boolean; onToggle: () => void }> = ({ section, isOpen, onToggle }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-lg shadow-premium overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <section.icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{section.title}</span>
          {section.badge && <Badge variant="secondary" className="text-[10px]">{section.badge}</Badge>}
        </div>
      </div>
      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-5 pb-5 border-t border-border"
      >
        <div className="pt-4 prose-sm text-muted-foreground space-y-3 max-w-none text-sm leading-relaxed">
          {section.content}
        </div>
      </motion.div>
    )}
  </motion.div>
);

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-3">
    <div className="h-6 w-6 rounded-full gold-gradient flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-bold text-primary-foreground">{n}</span>
    </div>
    <div>
      <p className="text-foreground font-medium text-sm">{title}</p>
      <div className="text-muted-foreground text-xs mt-1">{children}</div>
    </div>
  </div>
);

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-start gap-2">
    <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
    <span className="text-xs text-foreground">{children}</span>
  </div>
);

const Documentation: React.FC = () => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['overview']));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sections: DocSection[] = [
    {
      id: 'overview',
      icon: Shield,
      title: 'Visão Geral do Aureum Baseline Studio',
      content: (
        <>
          <p>O <strong className="text-foreground">Aureum Baseline Studio</strong> é uma plataforma de geração e governança de baselines de segurança com IA. Ele automatiza a criação de controles de segurança a partir de fontes diversas (documentos, URLs, frameworks), garantindo rastreabilidade, versionamento e conformidade.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              { icon: Target, label: 'Pipeline de IA', desc: 'Extração e normalização automatizada de controles' },
              { icon: GitBranch, label: 'Rastreabilidade', desc: 'Mapeamento completo fonte → controle → framework' },
              { icon: Lock, label: 'Governança', desc: 'Versionamento, auditoria e restauração de baselines' },
            ].map(f => (
              <div key={f.label} className="bg-muted/50 rounded-md p-3 text-center">
                <f.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'getting-started',
      icon: Zap,
      title: 'Primeiros Passos',
      badge: 'Início Rápido',
      content: (
        <div className="space-y-4">
          <Step n={1} title="Crie sua conta">
            Acesse a tela de login e registre-se com e-mail/senha ou via Google. Após o cadastro, confirme seu e-mail para ativar a conta.
          </Step>
          <Step n={2} title="Crie seu primeiro projeto">
            No <strong>Dashboard</strong>, clique em <strong>"Create New Baseline"</strong> ou acesse <strong>New Project</strong> no menu lateral. Preencha nome, tecnologia, vendor, versão e categoria.
          </Step>
          <Step n={3} title="Adicione fontes de evidência">
            Na <strong>Source Library</strong>, adicione URLs de documentação oficial ou faça upload de documentos (PDF, DOCX). O sistema extrairá automaticamente o conteúdo relevante.
          </Step>
          <Step n={4} title="Configure regras e templates">
            Em <strong>Rules & Templates</strong>, selecione ou personalize o template que define a estrutura dos controles, regras de escrita, criticidade e mapeamento de frameworks.
          </Step>
          <Step n={5} title="Execute o pipeline de IA">
            No <strong>AI Workspace</strong>, inicie o pipeline de geração. O sistema processará as fontes em etapas: ingestão, extração, normalização, agrupamento, deduplicação e composição do baseline.
          </Step>
          <Step n={6} title="Revise e aprove controles">
            No <strong>Baseline Editor</strong>, revise cada controle gerado. Ajuste títulos, descrições, criticidade e status de revisão (Approved, Rejected, Adjusted).
          </Step>
          <Tip>Use a conta de demonstração (test@aureum.com / test1234) para explorar todas as funcionalidades com dados pré-configurados.</Tip>
        </div>
      ),
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: 'Dashboard',
      content: (
        <>
          <p>O Dashboard é o centro de comando. Exibe métricas consolidadas, projetos recentes e ações rápidas.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Métricas principais:</strong> Total de projetos, baselines ativos, controles gerados, confiança média e ameaças ativas.</li>
            <li><strong className="text-foreground">Projetos recentes:</strong> Lista com status, tecnologia, número de controles e data de atualização.</li>
            <li><strong className="text-foreground">Atividade recente:</strong> Feed em tempo real de ações realizadas (aprovações, revisões, criações).</li>
            <li><strong className="text-foreground">Gráficos de tendência:</strong> Evolução de controles, confiança e projetos nos últimos 7 dias.</li>
            <li><strong className="text-foreground">Ações rápidas:</strong> Criar novo baseline, importar projeto ou visualizar todos os projetos.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'new-project',
      icon: Plus,
      title: 'Novo Projeto',
      content: (
        <>
          <p>Crie um novo projeto de baseline preenchendo os campos:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Nome:</strong> Nome descritivo do projeto (ex: "AWS S3 Baseline 2025").</li>
            <li><strong className="text-foreground">Tecnologia:</strong> Tipo da tecnologia alvo (ex: AWS, Azure, Kubernetes).</li>
            <li><strong className="text-foreground">Vendor:</strong> Fornecedor ou fabricante da solução.</li>
            <li><strong className="text-foreground">Versão:</strong> Versão específica da tecnologia.</li>
            <li><strong className="text-foreground">Categoria:</strong> Classificação do projeto (Cloud, Network, Application, etc.).</li>
            <li><strong className="text-foreground">Idioma de saída:</strong> Idioma em que os controles serão gerados.</li>
            <li><strong className="text-foreground">Tags e notas:</strong> Metadados opcionais para organização.</li>
          </ul>
          <Tip>O projeto será salvo automaticamente e aparecerá no Dashboard. Você poderá editá-lo a qualquer momento.</Tip>
        </>
      ),
    },
    {
      id: 'sources',
      icon: Library,
      title: 'Source Library (Biblioteca de Fontes)',
      content: (
        <>
          <p>A biblioteca gerencia todas as fontes de evidência usadas para gerar controles de segurança.</p>
          <p className="font-medium text-foreground mt-2">Tipos de fonte suportados:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">URL:</strong> Links para documentação oficial, hardening guides, benchmarks (CIS, NIST, etc.). O sistema faz parsing automático do conteúdo.</li>
            <li><strong className="text-foreground">Documento:</strong> Upload de arquivos PDF, DOCX e outros. O conteúdo é extraído e normalizado automaticamente.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Status de processamento:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Pending:</strong> Aguardando processamento.</li>
            <li><strong className="text-foreground">Extracting:</strong> Conteúdo sendo extraído.</li>
            <li><strong className="text-foreground">Normalized:</strong> Conteúdo normalizado e pronto para análise.</li>
            <li><strong className="text-foreground">Processed:</strong> Totalmente processado e indexado.</li>
            <li><strong className="text-foreground">Failed:</strong> Erro no processamento — verifique o formato ou URL.</li>
          </ul>
          <Tip>Cada fonte exibe uma prévia do conteúdo extraído e um score de confiança. Fontes com baixa confiança podem precisar de revisão manual.</Tip>
        </>
      ),
    },
    {
      id: 'rules',
      icon: Settings2,
      title: 'Rules & Templates (Regras e Templates)',
      content: (
        <>
          <p>Os templates definem como os controles de segurança serão gerados, estruturados e validados pela IA.</p>
          <p className="font-medium text-foreground mt-2">Campos configuráveis:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Estrutura de controle:</strong> Define os campos obrigatórios de cada controle (título, descrição, criticidade, etc.).</li>
            <li><strong className="text-foreground">Regras de escrita:</strong> Tom, estilo e formato do texto dos controles.</li>
            <li><strong className="text-foreground">Regras de risco:</strong> Critérios para classificação de risco de segurança.</li>
            <li><strong className="text-foreground">Regras de criticidade:</strong> Escala de criticidade (Critical, High, Medium, Low, Informational).</li>
            <li><strong className="text-foreground">Regras de deduplicação:</strong> Critérios para identificar e fundir controles duplicados.</li>
            <li><strong className="text-foreground">Regras de mapeamento:</strong> Como os controles serão mapeados para frameworks (NIST, ISO 27001, CIS, etc.).</li>
            <li><strong className="text-foreground">Modelagem de ameaças:</strong> Configuração STRIDE para geração de cenários de ameaça.</li>
          </ul>
          <Tip>Você pode criar templates específicos por tecnologia ou padrão regulatório. O template padrão é pré-configurado com boas práticas.</Tip>
        </>
      ),
    },
    {
      id: 'workspace',
      icon: Cpu,
      title: 'AI Workspace (Pipeline de IA)',
      content: (
        <>
          <p>O AI Workspace é onde o pipeline de geração de controles é executado. O processo é dividido em etapas sequenciais:</p>
          <div className="space-y-2 mt-2">
            {[
              ['Source Ingestion', 'Importação e validação das fontes selecionadas.'],
              ['Content Extraction', 'Extração de texto e metadados dos documentos e URLs.'],
              ['Normalization', 'Padronização do conteúdo extraído em formato uniforme.'],
              ['Evidence Grouping', 'Agrupamento de evidências por tema ou área de segurança.'],
              ['Control Extraction', 'Geração de controles de segurança a partir das evidências.'],
              ['Deduplication', 'Identificação e fusão de controles duplicados ou sobrepostos.'],
              ['Baseline Composition', 'Montagem do baseline final com todos os controles.'],
              ['Technical Review', 'Validação técnica automatizada dos controles gerados.'],
              ['Final Proposal', 'Proposta final do baseline para revisão humana.'],
            ].map(([stage, desc], i) => (
              <div key={stage} className="flex items-start gap-2">
                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{i + 1}</span>
                <div>
                  <span className="text-xs font-semibold text-foreground">{stage}</span>
                  <span className="text-xs text-muted-foreground ml-1">— {desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Tip>Cada etapa mostra progresso em tempo real com indicadores visuais. Em caso de falha, você pode reiniciar a etapa específica sem perder o progresso das anteriores.</Tip>
        </>
      ),
    },
    {
      id: 'editor',
      icon: FileEdit,
      title: 'Baseline Editor (Editor de Baseline)',
      content: (
        <>
          <p>O editor permite revisão detalhada de cada controle gerado. Funcionalidades incluem:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Visualização completa:</strong> Título, descrição, aplicabilidade, risco, criticidade, automação, referências e mapeamentos.</li>
            <li><strong className="text-foreground">Cenários de ameaça (STRIDE):</strong> Cada controle inclui cenários de ameaça com vetores de ataque, agentes, pré-condições, impacto e mitigações.</li>
            <li><strong className="text-foreground">Score de confiança:</strong> Indicador visual (0-100%) da confiança da IA no controle gerado.</li>
            <li><strong className="text-foreground">Status de revisão:</strong> Pending → Reviewed → Approved / Rejected / Adjusted.</li>
            <li><strong className="text-foreground">Notas do revisor:</strong> Campo para comentários e justificativas.</li>
            <li><strong className="text-foreground">Mind Map:</strong> Visualização em mapa mental dos controles por categoria, com filtros por criticidade e status.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Filtros disponíveis:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Por categoria STRIDE (Spoofing, Tampering, etc.)</li>
            <li>Por criticidade (Critical → Informational)</li>
            <li>Por status de revisão</li>
            <li>Busca textual em título e descrição</li>
          </ul>
        </>
      ),
    },
    {
      id: 'traceability',
      icon: GitBranch,
      title: 'Traceability (Rastreabilidade)',
      content: (
        <>
          <p>A tela de rastreabilidade mapeia a origem de cada controle até sua fonte de evidência e framework de conformidade.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Mapeamento de frameworks:</strong> Visualize quais controles cobrem cada framework (NIST, ISO 27001, CIS, OWASP, etc.).</li>
            <li><strong className="text-foreground">Radar Chart:</strong> Gráfico radar mostrando a cobertura percentual por framework.</li>
            <li><strong className="text-foreground">Cards de controle:</strong> Cada controle mostra suas fontes originais, excerpts e score de confiança da rastreabilidade.</li>
            <li><strong className="text-foreground">Filtros por framework:</strong> Filtre controles por framework específico para análise de cobertura.</li>
            <li><strong className="text-foreground">Exportação:</strong> Exporte a matriz de rastreabilidade em CSV ou PDF.</li>
          </ul>
          <Tip>A rastreabilidade é fundamental para auditorias. Cada controle mantém referência à fonte original e ao trecho exato que o originou.</Tip>
        </>
      ),
    },
    {
      id: 'history',
      icon: History,
      title: 'History (Histórico de Versões)',
      content: (
        <>
          <p>O sistema mantém snapshots imutáveis de cada versão do baseline, permitindo auditoria e restauração completas.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Lista de versões:</strong> Todas as versões com data, autor, status e resumo de mudanças.</li>
            <li><strong className="text-foreground">Comparação Side-by-Side:</strong> Compare duas versões lado a lado com diff detalhado de controles adicionados, removidos e modificados.</li>
            <li><strong className="text-foreground">Estatísticas visuais:</strong> Gráfico donut com resumo de mudanças entre versões.</li>
            <li><strong className="text-foreground">Filtros na comparação:</strong> Filtre por tipo de mudança (Added, Removed, Modified), criticidade e busca textual.</li>
            <li><strong className="text-foreground">Exportação do diff:</strong> Exporte a comparação em CSV (respeita filtros aplicados) ou PDF.</li>
            <li><strong className="text-foreground">Restauração:</strong> Restaure qualquer versão anterior com um clique. O sistema cria automaticamente uma nova versão com o snapshot restaurado.</li>
          </ul>
          <Tip>A comparação Side-by-Side destaca campos modificados com tooltips mostrando o valor anterior, facilitando a revisão de mudanças.</Tip>
        </>
      ),
    },
    {
      id: 'export-import',
      icon: ArrowUpDown,
      title: 'Export / Import',
      content: (
        <>
          <p>Exporte e importe baselines em diferentes formatos para compartilhamento e integração com outras ferramentas.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">JSON:</strong> Formato estruturado completo, ideal para backup e integração programática.</li>
            <li><strong className="text-foreground">Markdown:</strong> Formato legível para documentação e wikis.</li>
            <li><strong className="text-foreground">PDF:</strong> Relatório formatado para apresentações e auditorias.</li>
            <li><strong className="text-foreground">CSV:</strong> Formato tabular para análise em planilhas.</li>
          </ul>
          <Tip>O formato de exportação padrão pode ser configurado em Settings.</Tip>
        </>
      ),
    },
    {
      id: 'ai-integrations',
      icon: Brain,
      title: 'AI Integrations (Integrações de IA)',
      content: (
        <>
          <p>Configure os provedores de IA utilizados pelo pipeline de geração de controles.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Provedores suportados:</strong> OpenAI (GPT-4, GPT-5), Google (Gemini), Anthropic (Claude) e modelos locais.</li>
            <li><strong className="text-foreground">Seleção de modelo:</strong> Escolha o modelo específico para cada provedor.</li>
            <li><strong className="text-foreground">Teste de conexão:</strong> Valide a conexão e chave de API antes de usar.</li>
            <li><strong className="text-foreground">Provedor padrão:</strong> Defina qual provedor será usado por padrão no pipeline.</li>
          </ul>
          <Tip>Os modelos Lovable AI estão disponíveis sem necessidade de chave API própria, com uso gratuito limitado.</Tip>
        </>
      ),
    },
    {
      id: 'teams',
      icon: Users,
      title: 'Teams (Equipes)',
      content: (
        <>
          <p>Gerencie equipes para colaboração em projetos de baseline.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Criar equipe:</strong> Crie equipes e convide membros por e-mail.</li>
            <li><strong className="text-foreground">Papéis:</strong> Owner (proprietário) e Member (membro) com permissões diferenciadas.</li>
            <li><strong className="text-foreground">Projetos compartilhados:</strong> Projetos associados a uma equipe são visíveis para todos os membros.</li>
            <li><strong className="text-foreground">Notificações:</strong> Membros recebem notificações de atividades em projetos compartilhados.</li>
          </ul>
          <Tip>Políticas de segurança (RLS) garantem que cada membro só veja projetos de suas equipes e projetos pessoais.</Tip>
        </>
      ),
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notificações',
      content: (
        <>
          <p>O sistema de notificações mantém todos os membros informados sobre atividades relevantes.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Tipos:</strong> Aprovações, rejeições, revisões, criações de projetos, restaurações de versão e exportações.</li>
            <li><strong className="text-foreground">Badge no sino:</strong> Indicador visual de notificações não lidas.</li>
            <li><strong className="text-foreground">Marcar como lida:</strong> Clique na notificação para marcá-la como lida, ou use "Marcar todas como lidas".</li>
          </ul>
        </>
      ),
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Settings (Configurações)',
      content: (
        <>
          <p>Personalize a experiência de uso do sistema:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Idioma da interface:</strong> English, Português (BR) ou Español (ES).</li>
            <li><strong className="text-foreground">Idioma de saída:</strong> Idioma em que os controles serão gerados pela IA.</li>
            <li><strong className="text-foreground">Tema:</strong> Light, Dark ou Auto (segue o sistema).</li>
            <li><strong className="text-foreground">Tooltips:</strong> All (todos), Minimal (apenas essenciais) ou Off (desativados).</li>
            <li><strong className="text-foreground">Formato de exportação padrão:</strong> JSON, Markdown ou PDF.</li>
            <li><strong className="text-foreground">Rigor da IA:</strong> Conservative (mais preciso), Balanced (equilíbrio) ou Aggressive (mais cobertura).</li>
            <li><strong className="text-foreground">Backup:</strong> Crie e restaure backups completos do sistema.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'mindmap',
      icon: Eye,
      title: 'Mind Map (Mapa Mental)',
      content: (
        <>
          <p>O mapa mental oferece uma visualização hierárquica dos controles por categoria, acessível pelo Baseline Editor.</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Nó central:</strong> Nome do projeto com contagem total de controles.</li>
            <li><strong className="text-foreground">Nós de categoria:</strong> Agrupamento por categorias (Access Control, Encryption, Logging, etc.).</li>
            <li><strong className="text-foreground">Nós de controle:</strong> Cada controle mostra criticidade (cor), score de confiança e status de revisão.</li>
            <li><strong className="text-foreground">Interatividade:</strong> Zoom, pan, expand/collapse de nós e painel de detalhes ao clicar.</li>
            <li><strong className="text-foreground">Filtros:</strong> Barra de filtros para criticidade, status de revisão e busca textual.</li>
            <li><strong className="text-foreground">Toolbar:</strong> Expand/collapse all, zoom controls e minimap.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'security',
      icon: Lock,
      title: 'Segurança e Acesso',
      content: (
        <>
          <p>O Aureum implementa múltiplas camadas de segurança:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Autenticação:</strong> Email/senha com confirmação por e-mail, ou login social via Google OAuth.</li>
            <li><strong className="text-foreground">Row Level Security (RLS):</strong> Políticas de acesso no banco de dados garantem que cada usuário veja apenas seus dados e os de suas equipes.</li>
            <li><strong className="text-foreground">Isolamento por equipe:</strong> Projetos, controles e fontes são isolados por usuário/equipe.</li>
            <li><strong className="text-foreground">Snapshots imutáveis:</strong> Versões de baseline são imutáveis após criação, garantindo integridade da auditoria.</li>
            <li><strong className="text-foreground">Chaves API criptografadas:</strong> Chaves de provedores de IA são armazenadas com criptografia.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'shortcuts',
      icon: Zap,
      title: 'Dicas e Boas Práticas',
      content: (
        <>
          <div className="space-y-2">
            <Tip>Comece com poucas fontes de alta qualidade (hardening guides oficiais) para obter controles mais precisos.</Tip>
            <Tip>Use o template "Balanced" para a maioria dos projetos. Ajuste para "Conservative" quando precisão for crítica (auditorias).</Tip>
            <Tip>Revise primeiro os controles com score de confiança abaixo de 70% — eles provavelmente precisam de ajuste manual.</Tip>
            <Tip>Crie versões (snapshots) antes de fazer mudanças significativas no baseline. Você sempre poderá restaurar.</Tip>
            <Tip>Use a comparação Side-by-Side para revisar o que mudou entre versões antes de aprovar.</Tip>
            <Tip>Organize projetos com tags consistentes para fácil localização e filtragem no Dashboard.</Tip>
            <Tip>Configure equipes para projetos colaborativos — todos os membros receberão notificações de atividades.</Tip>
            <Tip>Exporte em CSV quando precisar análise em planilha; use PDF para apresentações e auditorias formais.</Tip>
          </div>
        </>
      ),
    },
  ];

  const filtered = sections.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    (typeof s.content === 'string' && s.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-lg gold-gradient flex items-center justify-center">
            <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">Documentação</h1>
            <p className="text-sm text-muted-foreground">Guia completo de uso e configuração do Aureum Baseline Studio</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na documentação..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setOpenSections(new Set(sections.map(s => s.id)))}
          className="text-xs text-primary hover:underline"
        >
          Expandir tudo
        </button>
        <span className="text-muted-foreground text-xs">•</span>
        <button
          onClick={() => setOpenSections(new Set())}
          className="text-xs text-primary hover:underline"
        >
          Recolher tudo
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum resultado encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
};

export default Documentation;
