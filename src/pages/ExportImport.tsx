import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExportCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import HelpButton from '@/components/HelpButton';
import GenerateDocumentModal from '@/components/GenerateDocumentModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileJson, FileText, FileType, Archive, Settings2, Layers, Sparkles, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { ControlItem, SourceTraceability, ThreatScenario } from '@/types';
import { exportToCSV, exportToPDF, exportToJSON } from '@/components/traceability/exportUtils';

interface ImportPreview {
  filename: string;
  controlCount: number;
  controls: any[];
  projectName?: string;
}

const ExportImport: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('json');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importTargetProject, setImportTargetProject] = useState<'new' | 'existing'>('new');
  const [importTargetProjectId, setImportTargetProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docControls, setDocControls] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['export-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, technology, control_count')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleExportBaseline = async () => {
    if (!user || !selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .order('control_id', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No controls found for this project');
        setExporting(false);
        return;
      }

      const controls: ControlItem[] = data.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        controlId: c.control_id,
        title: c.title,
        description: c.description || '',
        applicability: c.applicability || '',
        securityRisk: c.security_risk || '',
        criticality: (c.criticality as ControlItem['criticality']) || 'medium',
        defaultBehaviorLimitations: c.default_behavior_limitations || '',
        automation: c.automation || '',
        references: c.references || [],
        frameworkMappings: c.framework_mappings || [],
        threatScenarios: (c.threat_scenarios as unknown as ThreatScenario[]) || [],
        sourceTraceability: (c.source_traceability as unknown as SourceTraceability[]) || [],
        confidenceScore: Number(c.confidence_score) || 0,
        reviewStatus: (c.review_status as ControlItem['reviewStatus']) || 'pending',
        reviewerNotes: c.reviewer_notes || '',
        version: c.version || 1,
        category: c.category || '',
      }));

      const project = projects.find(p => p.id === selectedProjectId);
      const filename = `baseline-${project?.name?.replace(/\s+/g, '-').toLowerCase() || 'export'}`;

      if (exportFormat === 'csv') {
        exportToCSV(controls, filename);
      } else if (exportFormat === 'pdf') {
        exportToPDF(controls, null);
      } else {
        exportToJSON(controls, filename);
      }

      toast.success(`Baseline exported as ${exportFormat.toUpperCase()} (${controls.length} controls)`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export baseline');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    setImportError(null);
    setImportPreview(null);

    if (!file.name.endsWith('.json')) {
      setImportError('Only JSON files are supported. Please select a .json file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImportError('File is too large. Maximum size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        let controls: any[] = [];

        // Support both array format and object with controls array
        if (Array.isArray(content)) {
          controls = content;
        } else if (content.controls && Array.isArray(content.controls)) {
          controls = content.controls;
        } else {
          setImportError('Invalid JSON format. Expected an array of controls or an object with a "controls" array.');
          return;
        }

        if (controls.length === 0) {
          setImportError('The file contains no controls to import.');
          return;
        }

        // Validate that controls have minimum required fields
        const firstControl = controls[0];
        if (!firstControl.controlId && !firstControl.control_id) {
          setImportError('Invalid control format. Each control must have a "controlId" or "control_id" field.');
          return;
        }

        const projectName = content.projectName || file.name.replace('.json', '').replace(/[-_]/g, ' ');
        setNewProjectName(projectName);
        setNewProjectTech(content.technology || controls[0]?.category || 'General');

        setImportPreview({
          filename: file.name,
          controlCount: controls.length,
          controls,
          projectName,
        });
      } catch {
        setImportError('Failed to parse JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!user || !importPreview) return;

    setImporting(true);
    try {
      let projectId: string;

      if (importTargetProject === 'new') {
        if (!newProjectName.trim()) {
          toast.error('Please enter a project name');
          setImporting(false);
          return;
        }

        const { data: newProject, error: projError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: newProjectName.trim(),
            technology: newProjectTech.trim() || 'General',
            status: 'draft',
            control_count: importPreview.controlCount,
          })
          .select('id')
          .single();

        if (projError) throw projError;
        projectId = newProject.id;
      } else {
        if (!importTargetProjectId) {
          toast.error('Please select a target project');
          setImporting(false);
          return;
        }
        projectId = importTargetProjectId;
      }

      // Map controls to DB format
      const controlRows = importPreview.controls.map((c: any) => ({
        project_id: projectId,
        user_id: user.id,
        control_id: c.controlId || c.control_id,
        title: c.title || 'Untitled Control',
        description: c.description || '',
        applicability: c.applicability || '',
        security_risk: c.securityRisk || c.security_risk || '',
        criticality: c.criticality || 'medium',
        default_behavior_limitations: c.defaultBehaviorLimitations || c.default_behavior_limitations || '',
        automation: c.automation || '',
        references: c.references || [],
        framework_mappings: c.frameworkMappings || c.framework_mappings || [],
        threat_scenarios: c.threatScenarios || c.threat_scenarios || [],
        source_traceability: c.sourceTraceability || c.source_traceability || [],
        confidence_score: c.confidenceScore ?? c.confidence_score ?? 0,
        review_status: c.reviewStatus || c.review_status || 'pending',
        reviewer_notes: c.reviewerNotes || c.reviewer_notes || '',
        version: c.version || 1,
        category: c.category || '',
      }));

      const { error: insertError } = await supabase
        .from('controls')
        .insert(controlRows);

      if (insertError) throw insertError;

      // Update project control count if existing project
      if (importTargetProject === 'existing') {
        const { data: countData } = await supabase
          .from('controls')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('user_id', user.id);

        // We don't have exact count from head query, so just update with added
        await supabase
          .from('projects')
          .update({ control_count: (projects.find(p => p.id === projectId)?.control_count || 0) + importPreview.controlCount })
          .eq('id', projectId);
      }

      queryClient.invalidateQueries({ queryKey: ['export-projects'] });
      toast.success(`✅ Imported ${importPreview.controlCount} controls successfully!`);
      setImportPreview(null);
      setImportError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import controls. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!user || !selectedProjectId) return;
    const { data } = await supabase
      .from('controls')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', selectedProjectId)
      .order('control_id', { ascending: true });
    if (data && data.length > 0) {
      setDocControls(data.map((c: any) => ({
        id: c.id, projectId: c.project_id, controlId: c.control_id, title: c.title,
        description: c.description || '', applicability: c.applicability || '',
        securityRisk: c.security_risk || '', criticality: c.criticality || 'medium',
        defaultBehaviorLimitations: c.default_behavior_limitations || '',
        automation: c.automation || '', references: c.references || [],
        frameworkMappings: c.framework_mappings || [],
        threatScenarios: (c.threat_scenarios as any[]) || [],
        sourceTraceability: (c.source_traceability as any[]) || [],
        confidenceScore: Number(c.confidence_score) || 0,
        reviewStatus: c.review_status || 'pending', reviewerNotes: c.reviewer_notes || '',
        version: c.version || 1, category: c.category || '',
      })));
      setDocModalOpen(true);
    } else {
      toast.error('No controls found for this project');
    }
  };

  const exportItems = [
    {
      key: 'baseline',
      icon: FileText,
      titleKey: 'exportBaseline',
      description: 'Export the current baseline with all controls, metadata, and framework mappings',
      hasFormats: true,
    },
    {
      key: 'document',
      icon: BookOpen,
      titleKey: 'generateButton',
      description: 'Generate a standardized PDF/DOCX baseline document with cover, executive summary, and annexes',
      isDocument: true,
    },
    { key: 'project', icon: Archive, titleKey: 'exportProject', description: 'Complete project backup including sources, rules, versions, and configurations' },
    { key: 'config', icon: Settings2, titleKey: 'exportConfig', description: 'Export your workspace configuration, AI settings, and preferences' },
    { key: 'template', icon: Layers, titleKey: 'exportTemplate', description: 'Export templates and rule sets for reuse in other projects' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.exportImport.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.exportImport.subtitle}</p>
        </div>
        <HelpButton section="export-import" />
      </div>

      <Tabs defaultValue="export">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="export" className="data-[state=active]:bg-card"><Download className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.export}</TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-card"><Upload className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.import}</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <ExportCardSkeleton key={i} />)
            ) : (
              exportItems.map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {(item as any).isDocument
                          ? ((t as any).baselineDocument?.generateButton || 'Generate Document')
                          : (t.exportImport as Record<string, string>)[item.titleKey]}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {((item as any).isDocument || item.hasFormats) && (
                    <div className="mb-3">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">Project</label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span className="text-muted-foreground text-[10px]">({p.control_count || 0} controls)</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {item.hasFormats && (
                    <div className="mb-3">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">{t.exportImport.format}</label>
                      <Select value={exportFormat} onValueChange={setExportFormat}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json"><div className="flex items-center gap-1.5"><FileJson className="h-3 w-3" />{t.exportImport.json}</div></SelectItem>
                          <SelectItem value="csv"><div className="flex items-center gap-1.5"><FileSpreadsheet className="h-3 w-3" />CSV</div></SelectItem>
                          <SelectItem value="pdf"><div className="flex items-center gap-1.5"><FileType className="h-3 w-3" />{t.exportImport.pdf}</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                    onClick={(item as any).isDocument ? handleGenerateDocument : item.hasFormats ? handleExportBaseline : undefined}
                    disabled={((item as any).isDocument || item.hasFormats) ? (!selectedProjectId || exporting) : false}
                  >
                    {exporting && item.hasFormats ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Exporting...</>
                    ) : (item as any).isDocument ? (
                      <><BookOpen className="h-3.5 w-3.5 mr-1.5" />{(t as any).baselineDocument?.generateButton || 'Generate Document'}</>
                    ) : (
                      <><Download className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.download}</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">{t.exportImport.lastExport}: {t.exportImport.never}</p>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <ExportCardSkeleton key={i} />)
            ) : (
              <>
                {/* Import Project JSON card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-all md:col-span-2"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <FileJson className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{(t.exportImport as Record<string, string>)['importProject']}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Import a previously exported baseline JSON file with all controls, STRIDE data, and framework mappings</p>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {!importPreview && (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer mb-3"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">{t.exportImport.dragDropImport}</p>
                      <p className="text-[10px] text-muted-foreground/50">Supports .json files up to 10MB</p>
                    </div>
                  )}

                  {/* Error state */}
                  {importError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{importError}</p>
                    </div>
                  )}

                  {/* Preview state */}
                  {importPreview && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">{importPreview.filename}</p>
                          <p className="text-[10px] text-muted-foreground">{importPreview.controlCount} controls ready to import</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setImportPreview(null); setImportError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                          Change file
                        </Button>
                      </div>

                      {/* Target project selection */}
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block">Import destination</label>
                        <div className="flex gap-2">
                          <Button
                            variant={importTargetProject === 'new' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setImportTargetProject('new')}
                            className={importTargetProject === 'new' ? 'gold-gradient text-primary-foreground' : ''}
                          >
                            Create new project
                          </Button>
                          <Button
                            variant={importTargetProject === 'existing' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setImportTargetProject('existing')}
                            className={importTargetProject === 'existing' ? 'gold-gradient text-primary-foreground' : ''}
                          >
                            Add to existing project
                          </Button>
                        </div>

                        {importTargetProject === 'new' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1 block">Project name</label>
                              <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="w-full h-8 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="My Imported Project"
                                maxLength={100}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1 block">Technology</label>
                              <input
                                type="text"
                                value={newProjectTech}
                                onChange={(e) => setNewProjectTech(e.target.value)}
                                className="w-full h-8 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="AWS S3"
                                maxLength={100}
                              />
                            </div>
                          </div>
                        ) : (
                          <Select value={importTargetProjectId} onValueChange={setImportTargetProjectId}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select target project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} — {p.technology}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Control preview */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">Controls preview</label>
                        <div className="border border-border rounded-md max-h-40 overflow-y-auto divide-y divide-border">
                          {importPreview.controls.slice(0, 10).map((c: any, i: number) => (
                            <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                              <span className="font-mono text-muted-foreground w-16 shrink-0">{c.controlId || c.control_id}</span>
                              <span className="text-foreground truncate flex-1">{c.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c.criticality || 'medium'}</span>
                            </div>
                          ))}
                          {importPreview.controlCount > 10 && (
                            <div className="px-3 py-2 text-[10px] text-muted-foreground text-center">
                              + {importPreview.controlCount - 10} more controls
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        className="w-full gold-gradient text-primary-foreground hover:opacity-90"
                        onClick={handleImport}
                        disabled={importing}
                      >
                        {importing ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Importing...</>
                        ) : (
                          <><Upload className="h-3.5 w-3.5 mr-1.5" />Import {importPreview.controlCount} Controls</>
                        )}
                      </Button>
                    </div>
                  )}

                  {!importPreview && !importError && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.selectFile}
                    </Button>
                  )}
                </motion.div>

                {/* Other import cards (config, template) - placeholder */}
                {[
                  { icon: Settings2, titleKey: 'importConfig', description: 'Restore workspace configuration from a backup file' },
                  { icon: Layers, titleKey: 'importTemplate', description: 'Import templates and rule sets from other projects or team members' },
                ].map((item, i) => (
                  <motion.div
                    key={item.titleKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i + 1) * 0.08 }}
                    className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-all"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{(t.exportImport as Record<string, string>)[item.titleKey]}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer mb-3">
                      <Sparkles className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">{t.exportImport.dragDropImport}</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Upload className="h-3.5 w-3.5 mr-1.5" />{t.exportImport.selectFile}
                    </Button>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportImport;
