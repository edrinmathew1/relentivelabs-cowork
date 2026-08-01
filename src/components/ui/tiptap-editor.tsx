'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Code, Heading2 } from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Write task description or add notes...',
  readOnly = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-[#262626] rounded-lg bg-[#0A0A0A] overflow-hidden focus-within:border-[#E10600] transition">
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-[#262626] bg-[#141414]">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('bold') ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('italic') ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('heading', { level: 2 }) ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('bulletList') ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('orderedList') ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-[#262626] ${editor.isActive('codeBlock') ? 'text-[#E10600] bg-[#262626]' : 'text-[#737373]'}`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
