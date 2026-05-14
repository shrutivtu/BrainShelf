import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import { getEditorExtensions } from '../utils/editorExtensions.js';

function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`ne-toolbar__btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }) {
  if (!editor) return null;
  return (
    <div className="ne-toolbar">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>

      <span className="ne-toolbar__sep" />

      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        H3
      </ToolbarButton>

      <span className="ne-toolbar__sep" />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Checklist"
      >
        ☑
      </ToolbarButton>

      <span className="ne-toolbar__sep ne-toolbar__sep--extra" />

      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <span className="ne-toolbar__extra">"</span>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        <span className="ne-toolbar__extra">{'</>'}</span>
      </ToolbarButton>
      <ToolbarButton
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <span className="ne-toolbar__extra">—</span>
      </ToolbarButton>
    </div>
  );
}

export default function NoteEditor({ note, onUpdateTitle, onUpdateContent, onBack }) {
  const [titleDraft, setTitleDraft] = useState(note?.title || '');
  const noteIdRef = useRef(note?.id);

  useEffect(() => {
    setTitleDraft(note?.title || '');
  }, [note?.id, note?.title]);

  const editor = useEditor({
    extensions: [
      ...getEditorExtensions(),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      if (noteIdRef.current) {
        onUpdateContent(noteIdRef.current, ed.getJSON());
      }
    },
    editorProps: {
      attributes: { class: 'ne-body' },
    },
  });

  useEffect(() => {
    noteIdRef.current = note?.id;
    if (!editor) return;
    if (!note) {
      editor.commands.setContent('');
      return;
    }
    // content can be HTML string (from imports) or Tiptap JSON object
    const content = note.content || '';
    editor.commands.setContent(content);
  }, [editor, note?.id]);

  const commitTitle = useCallback(() => {
    if (note && titleDraft !== note.title) {
      onUpdateTitle(note.id, titleDraft);
    }
  }, [note, titleDraft, onUpdateTitle]);

  if (!note) {
    return (
      <div className="ne-empty">
        <p className="ne-empty__text">Select a note or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="ne-editor">
      {onBack && (
        <button type="button" className="ne-back" onClick={onBack}>
          ← Back
        </button>
      )}
      <input
        className="ne-title"
        type="text"
        value={titleDraft}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            editor?.commands.focus();
          }
        }}
        placeholder="Untitled"
      />
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="ne-content" />
      <div className="ne-meta">
        <time className="ne-meta__time">
          {note.updatedAt
            ? `Updated ${new Date(note.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            : ''}
        </time>
      </div>
    </div>
  );
}
