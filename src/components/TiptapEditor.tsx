import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type TiptapEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const TiptapEditor = ({ content, onChange }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: {
          HTMLAttributes: { class: "list-decimal pl-5" },
        },
        bulletList: {
          HTMLAttributes: { class: "list-disc pl-5" },
        },
        blockquote: {
          HTMLAttributes: { class: "border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2" },
        },
        heading: false,
      }),
      Underline,
      Highlight.configure({
        HTMLAttributes: { class: "bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5" },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "ficha-editor-content min-h-[200px] w-full px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-2xl border border-input bg-card overflow-hidden">
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-muted/20 flex-wrap">
        <ToolBtn title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn title="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Cursiva" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Subrayado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Resaltar" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;