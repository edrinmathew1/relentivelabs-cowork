'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Doc, DocCategory, Project, Profile } from '@/types';
import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { FileText, Plus, Filter, Zap, FolderKanban, CheckCircle2, Upload, Paperclip, Download, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Category filter
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Selected Doc for View / Edit
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DocCategory>('general');
  const [projectId, setProjectId] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Convert Action Item to Task state
  const [taskCreatedMsg, setTaskCreatedMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDocsAndProjects();
  }, []);

  const fetchDocsAndProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      let { data: docsData, error: docsErr } = await supabase
        .from('docs')
        .select('*, project:projects(*), author:profiles(*)')
        .order('updated_at', { ascending: false });

      if (docsErr || !docsData) {
        const { data: fallbackDocs } = await supabase.from('docs').select('*').order('updated_at', { ascending: false });
        docsData = fallbackDocs;
      }

      if (docsData) setDocs(docsData as any);

      const { data: projectsData } = await supabase.from('projects').select('*');
      if (projectsData) setProjects(projectsData as any);
    } catch (err) {
      console.error('Fetch docs error:', err);
    }
  };

  // Direct Document File Import (.pdf, .docx, .md, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();

    // Auto-fill title if empty
    if (!title) {
      setTitle(fileName.replace(/\.[^/.]+$/, ''));
    }

    setAttachmentName(fileName);

    if (ext === 'txt' || ext === 'md') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const htmlFormatted = `<pre style="font-family: inherit; whitespace: pre-wrap;">${text}</pre>`;
        setContent((prev) => (prev ? `${prev}<br/>${htmlFormatted}` : htmlFormatted));
        setUploadingFile(false);
      };
      reader.readAsText(file);
    } else {
      // For .pdf, .docx, read as Data URL attachment
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachmentUrl(dataUrl);

        const attachmentHtml = `<div style="padding: 10px; background: #0A0A0A; border: 1px solid #262626; border-radius: 8px; margin-top: 10px;">
          <strong>📄 Attached File: ${fileName}</strong>
        </div>`;
        setContent((prev) => (prev ? `${prev}<br/>${attachmentHtml}` : attachmentHtml));
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: newDoc, error } = await supabase
        .from('docs')
        .insert({
          title,
          content,
          category,
          project_id: projectId || null,
          author_id: currentUserId || null,
        })
        .select('*')
        .single();

      if (!error && newDoc) {
        setTitle('');
        setContent('');
        setAttachmentName(null);
        setAttachmentUrl(null);
        setIsModalOpen(false);
        fetchDocsAndProjects();
      }
    } catch (err) {
      console.error('Create doc error:', err);
    }
    setSaving(false);
  };

  // Feature 9: Convert Bullet/Line to Task Handler
  const handleConvertToTask = async (actionText: string, docProjectId?: string) => {
    if (!actionText.trim()) return;

    try {
      let targetProj = docProjectId || (projects.length > 0 ? projects[0].id : null);

      if (!targetProj) {
        const { data: autoProj } = await supabase
          .from('projects')
          .insert({ name: 'General Agency Board', status: 'active', owner_id: currentUserId || null })
          .select()
          .single();
        if (autoProj) targetProj = autoProj.id;
      }

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: actionText.trim(),
          status: 'todo',
          project_id: targetProj,
          created_by: currentUserId || null,
          priority: 'medium',
        })
        .select()
        .single();

      if (!error && newTask) {
        setTaskCreatedMsg(`Created Task: "${actionText.trim()}" on Kanban board!`);
        setTimeout(() => setTaskCreatedMsg(null), 4000);
      }
    } catch (err) {
      console.error('Convert action item to task error:', err);
    }
  };

  const filteredDocs = docs.filter((d) => {
    if (activeCategory !== 'all' && d.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#E10600]" />
            Agency Docs & Knowledge Base
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Internal SOPs, client brand guidelines, API specs, PDF/DOCX attachments & 1-click Action Item task conversion.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
        >
          <Plus className="w-4 h-4" /> Create / Upload Document
        </button>
      </div>

      {taskCreatedMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{taskCreatedMsg}</span>
        </div>
      )}

      {/* Category Tabs Header */}
      <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-xl text-xs w-fit flex-wrap gap-1">
        {[
          { id: 'all', label: 'All Docs' },
          { id: 'sop', label: 'SOPs & Standards' },
          { id: 'brand', label: 'Brand Guidelines' },
          { id: 'api_spec', label: 'API Specs' },
          { id: 'meeting_notes', label: 'Meeting Notes' },
          { id: 'general', label: 'General' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeCategory === tab.id
                ? 'bg-[#E10600] text-white shadow-sm font-bold'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className="bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#E10600]/50 rounded-xl p-5 cursor-pointer transition flex flex-col justify-between space-y-3 group shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-[#E10600]">
                  {doc.category.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-[#737373]">{formatDate(doc.updated_at)}</span>
              </div>

              <h2 className="text-base font-bold text-white group-hover:text-[#FF3B3B] transition flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>{doc.title}</span>
              </h2>
            </div>

            {doc.project && (
              <div className="p-2 bg-[#0A0A0A] border border-[#262626] rounded-lg text-xs text-[#A3A3A3] flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#E10600]" />
                <span className="truncate">Project: <strong className="text-white">{doc.project.name}</strong></span>
              </div>
            )}
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#141414] border border-[#262626] rounded-xl">
            <FileText className="w-10 h-10 text-[#737373] mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No documents found in this category</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Click &quot;Create / Upload Document&quot; to add agency SOPs, PDF, DOCX, or meeting notes.</p>
          </div>
        )}
      </div>

      {/* Selected Doc Viewer & Meeting Action Item Converter Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#E10600] uppercase font-bold">
                  {selectedDoc.category.replace('_', ' ')}
                </span>
                <h2 className="text-lg font-bold text-white">{selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            {/* Document Content View */}
            <div className="prose prose-invert max-w-none text-xs text-[#E5E5E5] space-y-2 p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl min-h-[150px]">
              <div dangerouslySetInnerHTML={{ __html: selectedDoc.content || '<p>No content written.</p>' }} />
            </div>

            {/* Feature 9: 1-Click Action Item to Task Converter */}
            <div className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#E10600]" />
                Meeting Action Item Converter
              </h4>
              <p className="text-[11px] text-[#A3A3A3]">
                Type any action item from this note to instantly create a task on your project board.
              </p>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  id="action-item-input"
                  placeholder="e.g. Set up Resend transactional email template for signup"
                  className="flex-1 bg-[#141414] border border-[#262626] focus:border-[#E10600] rounded-lg p-2 text-xs text-white outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConvertToTask((e.target as HTMLInputElement).value, selectedDoc.project_id);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('action-item-input') as HTMLInputElement;
                    if (input && input.value) {
                      handleConvertToTask(input.value, selectedDoc.project_id);
                      input.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg transition shrink-0"
                >
                  ⚡ Convert to Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Upload Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E10600]" />
                Create or Upload Agency Document
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            {/* Upload File Banner (.pdf, .docx, .md, .txt) */}
            <div className="p-4 bg-[#0A0A0A] border-2 border-dashed border-[#262626] hover:border-[#E10600]/60 rounded-xl transition text-center space-y-2">
              <Upload className="w-6 h-6 text-[#E10600] mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">Import File from PC (.PDF, .DOCX, .MD, .TXT)</p>
                <p className="text-[10px] text-[#A3A3A3] mt-0.5">
                  Select any document file to automatically parse its contents and attach it to your workspace.
                </p>
              </div>

              <label className="inline-block px-4 py-1.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-md shadow-[#E10600]/20">
                {uploadingFile ? 'Parsing File...' : 'Choose PDF, DOCX, MD, or TXT File'}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {attachmentName && (
                <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> File Selected: {attachmentName}
                </div>
              )}
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js 14 System Architecture SOP or Q3 Client Meeting Notes"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DocCategory)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                  >
                    <option value="general">General</option>
                    <option value="sop">SOP & Standard</option>
                    <option value="brand">Brand Guidelines</option>
                    <option value="api_spec">API Spec</option>
                    <option value="meeting_notes">Meeting Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Link to Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  >
                    <option value="">No Project Link</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Content Editor</label>
                <TiptapEditor content={content} onChange={(html) => setContent(html)} />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#262626] text-[#A3A3A3] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E10600] hover:bg-[#FF3B3B] text-white shadow-md shadow-[#E10600]/20"
                >
                  {saving ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
