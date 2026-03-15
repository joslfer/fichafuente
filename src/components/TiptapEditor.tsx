import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type TiptapEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export type TiptapEditorHandle = {
  focus: () => void;
};

const runSlashCommand = (editor: Editor, rawCommand: string) => {
  const command = rawCommand.toLowerCase();

  if (["bold", "b", "negrita"].includes(command)) {
    return editor.chain().focus().toggleBold().run();
  }

  if (["italic", "i", "cursiva"].includes(command)) {
    return editor.chain().focus().toggleItalic().run();
  }

  if (["underline", "u", "subrayado"].includes(command)) {
    return editor.chain().focus().toggleUnderline().run();
  }

  if (["strike", "strikethrough", "tachado"].includes(command)) {
    return editor.chain().focus().toggleStrike().run();
  }

  if (["code", "codigo", "inlinecode"].includes(command)) {
    return editor.chain().focus().toggleCode().run();
  }

  if (["quote", "blockquote", "cita"].includes(command)) {
    return editor.chain().focus().toggleBlockquote().run();
  }

  if (["bullet", "bulletlist", "ul", "lista"].includes(command)) {
    return editor.chain().focus().toggleBulletList().run();
  }

  if (["ordered", "orderedlist", "ol", "numero", "numerada"].includes(command)) {
    return editor.chain().focus().toggleOrderedList().run();
  }

  return false;
};

const applySlashCommandAtCursor = (editor: Editor, requireTrailingSpace: boolean) => {
  const { selection } = editor.state;
  if (!selection.empty) return false;

  const { $from } = selection;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\0", "\0");
  const pattern = requireTrailingSpace
    ? /(^|\s)\/([a-zA-Z0-9_-]+)[\s\u00a0]$/
    : /(^|\s)\/([a-zA-Z0-9_-]+)$/;

  const match = pattern.exec(textBefore);
  if (!match) return false;

  const command = match[2];
  const prefixLength = match[1].length;
  const tokenStartOffset = (match.index ?? 0) + prefixLength;
  const from = $from.start() + tokenStartOffset;
  const to = selection.from;

  // Delete slash token first so mark toggles (e.g. /bold) persist for next input.
  editor.chain().focus().deleteRange({ from, to }).run();

  return runSlashCommand(editor, command);
};

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(({ content, onChange }, ref) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarState, setToolbarState] = useState({
    visible: false,
    x: 0,
    y: 0,
    placement: "above" as "above" | "below",
  });

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
      // Mobile keyboards often skip predictable keydown timing for space.
      // Processing here makes slash commands reliable after typing '/command '.
      applySlashCommandAtCursor(editor, true);
      onChange(editor.getHTML());
    },
    editorProps: {
      handleTextInput: (view, _from, _to, text) => {
        if (text !== " ") return false;

        const didApply = applySlashCommandAtCursor(editor, false);
        if (!didApply) return false;

        return true;
      },
      handleKeyDown: (view, event) => {
        if (event.key !== " " && event.key !== "Enter") return false;

        if (event.key === "Enter") {
          // Double-Enter escape: if the cursor is in a blockquote or list and
          // the current paragraph/item is empty, exit the block to a plain paragraph.
          if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
            const { state } = view;
            const { $from } = state.selection;

            const isInBlockquote = $from.depth >= 1 && $from.node($from.depth - 1).type.name === "blockquote";
            const isInList = $from.depth >= 2 && (
              $from.node($from.depth - 2).type.name === "bulletList" ||
              $from.node($from.depth - 2).type.name === "orderedList"
            );

            if (isInBlockquote || isInList) {
              const isEmpty = $from.parent.textContent === "";
              if (isEmpty) {
                event.preventDefault();
                if (isInBlockquote) {
                  editor?.chain().focus().lift("blockquote").setParagraph().run();
                } else {
                  editor?.chain().focus().liftListItem("listItem").run();
                }
                return true;
              }
            }
          }

          const didApply = applySlashCommandAtCursor(editor, false);
          if (!didApply) return false;
          event.preventDefault();
          return true;
        }

        return false;
      },
      attributes: {
        class: "ficha-editor-content min-h-[200px] w-full px-3 py-2 text-sm focus:outline-none",
        "data-field": "editor",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useImperativeHandle(ref, () => ({
    focus: () => { editor?.chain().focus('end').run(); },
  }), [editor]);

  const updateFloatingToolbar = useCallback(() => {
    if (!editor || !editor.isEditable) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }

    const { selection } = editor.state;

    if (selection.empty) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }

    if (!editor.view.hasFocus()) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Use the native Selection API for pixel-accurate rects that account for
    // scrolled containers, zoom, and multi-line selections.
    const nativeSel = window.getSelection();
    if (!nativeSel || nativeSel.rangeCount === 0) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }
    const rect = nativeSel.getRangeAt(0).getBoundingClientRect();
    if (!rect || rect.width === 0 && rect.height === 0) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }

    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 290;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 46;
    const gap = 8;
    const pad = 8;

    // Center above the selection, then clamp to viewport.
    const rawLeft = rect.left + rect.width / 2 - toolbarWidth / 2;
    const left = Math.max(pad, Math.min(rawLeft, window.innerWidth - toolbarWidth - pad));

    // Flip below if not enough room above.
    const wouldOverflowTop = rect.top - toolbarHeight - gap < pad;
    const placement: "above" | "below" = wouldOverflowTop ? "below" : "above";
    const top = placement === "above" ? rect.top - toolbarHeight - gap : rect.bottom + gap;

    setToolbarState({
      visible: true,
      x: left + toolbarWidth / 2, // keep x as the centre so the CSS transform still works
      y: top,
      placement,
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => updateFloatingToolbar();
    const handleTransaction = () => updateFloatingToolbar();
    const handleBlur = () => {
      window.setTimeout(() => updateFloatingToolbar(), 0);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("transaction", handleTransaction);
    editor.on("blur", handleBlur);
    editor.on("focus", handleSelectionUpdate);

    const handleWindowChange = () => updateFloatingToolbar();
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (toolbarRef.current?.contains(target)) return;
      if (editor.view.dom.contains(target)) return;
      setToolbarState((prev) => ({ ...prev, visible: false }));
    };

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("transaction", handleTransaction);
      editor.off("blur", handleBlur);
      editor.off("focus", handleSelectionUpdate);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [editor, updateFloatingToolbar]);

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
      onPointerDown={(event) => {
        // Keep editor selection active while tapping toolbar buttons (covers both mouse and touch).
        event.preventDefault();
      }}
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
    <div className="rounded-2xl border border-input bg-card overflow-visible">
      <div
        ref={toolbarRef}
        style={{ left: `${toolbarState.x}px`, top: `${toolbarState.y}px` }}
        className={cn(
          "fixed z-[70] -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-1.5 shadow-lg backdrop-blur-sm transition-all duration-150 ease-out",
          toolbarState.placement === "above" ? "-translate-y-full" : "translate-y-0",
          toolbarState.visible ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="inline-flex items-center gap-0.5">
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
        <ToolBtn title="Código" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolBtn title="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;