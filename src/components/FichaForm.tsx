import { useState, useEffect, useRef } from "react";
import { ClipboardPaste, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Ficha, useCreateFicha, useUpdateFicha } from "@/hooks/useFichas";
import TiptapEditor, { type TiptapEditorHandle } from "@/components/TiptapEditor";
import { isArchivedTag, normalizeTags, orderTagsForDisplay } from "@/lib/utils";

type FichaFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFicha?: Ficha | null;
  onCreated?: (fichaId: string) => void;
};

const DRAFT_KEY = "fichafuente_new_ficha_draft";

type FormDraft = {
  html: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  authorsText: string;
  showAuthorsField: boolean;
};

const hasMeaningfulHtml = (value: string) => {
  if (!value) return false;

  const container = document.createElement("div");
  container.innerHTML = value;
  const text = (container.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .trim();

  if (text.length > 0) return true;
  return Boolean(container.querySelector("img, video, iframe, table, hr, pre"));
};

const hasMeaningfulDraftContent = (draft: FormDraft) => {
  return Boolean(
    hasMeaningfulHtml(draft.html) ||
    draft.sourceName.trim() ||
    draft.sourceUrl.trim() ||
    draft.tags.length > 0 ||
    draft.authorsText.trim()
  );
};

const FichaForm = ({ open, onOpenChange, editingFicha, onCreated }: FichaFormProps) => {
  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha();

  const [html, setHtml] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [authorsText, setAuthorsText] = useState("");
  const [showAuthorsField, setShowAuthorsField] = useState(false);
  const [isPastingLink, setIsPastingLink] = useState(false);
  const [linkPasteFeedback, setLinkPasteFeedback] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [draftBanner, setDraftBanner] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const draftStatusTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const editorRef = useRef<TiptapEditorHandle>(null);
  const sourceNameRef = useRef<HTMLTextAreaElement>(null);
  const authorsRef = useRef<HTMLTextAreaElement>(null);
  const sourceUrlRef = useRef<HTMLTextAreaElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  // Mirror showAuthorsField to a ref so the keydown handler always sees the latest value.
  const showAuthorsFieldRef = useRef(showAuthorsField);
  useEffect(() => { showAuthorsFieldRef.current = showAuthorsField; }, [showAuthorsField]);

  // Auto-focus editor when opening a new ficha.
  useEffect(() => {
    if (!open || editingFicha) return;
    const timer = window.setTimeout(() => editorRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open, editingFicha]);

  // Cmd+Right / Cmd+Down → next field, Cmd+Left / Cmd+Up → previous field.
  useEffect(() => {
    if (!open) return;

    const handleNav = (e: KeyboardEvent) => {
      if (
        !e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)
      ) {
        return;
      }

      const active = document.activeElement as Element | null;

      type FieldEntry = { focus: () => void; contains: (el: Element | null) => boolean };
      const fields: FieldEntry[] = [
        {
          focus: () => editorRef.current?.focus(),
          contains: (el) => Boolean(el?.closest('[data-field="editor"]')),
        },
        {
          focus: () => sourceNameRef.current?.focus(),
          contains: (el) => el === sourceNameRef.current,
        },
        ...(showAuthorsFieldRef.current
          ? [{
              focus: () => authorsRef.current?.focus(),
              contains: (el: Element | null) => el === authorsRef.current,
            }]
          : []),
        {
          focus: () => sourceUrlRef.current?.focus(),
          contains: (el) => el === sourceUrlRef.current,
        },
        {
          focus: () => tagsInputRef.current?.focus(),
          contains: (el) => el === tagsInputRef.current,
        },
      ];

      const currentIndex = fields.findIndex((f) => f.contains(active));
      if (currentIndex === -1) return;

      e.preventDefault();
      const shouldAdvance = e.key === "ArrowRight" || e.key === "ArrowDown";
      const nextIndex = shouldAdvance
        ? Math.min(currentIndex + 1, fields.length - 1)
        : Math.max(currentIndex - 1, 0);
      fields[nextIndex].focus();
    };

    document.addEventListener("keydown", handleNav, true);
    return () => document.removeEventListener("keydown", handleNav, true);
  }, [open]);

  // Prevent background grid scroll on mobile while the form dialog is open.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (!isMobile) return;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = documentElement.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (editingFicha) {
      const fullHtml = editingFicha.content
        ? `<p><strong>${editingFicha.title}</strong></p>${editingFicha.content}`
        : `<p><strong>${editingFicha.title}</strong></p>`;
      setHtml(fullHtml);
      setSourceName(editingFicha.source_name);
      setSourceUrl(editingFicha.source_url || "");
      setTags(normalizeTags(editingFicha.tags));
      setAuthorsText((editingFicha.authors || []).join(", "));
      const hasAuthors = (editingFicha.authors || []).length > 0;
      setShowAuthorsField(hasAuthors);
    } else if (open) {
      // Try to restore a saved draft.
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft: FormDraft = JSON.parse(saved);
          if (!hasMeaningfulDraftContent(draft)) {
            localStorage.removeItem(DRAFT_KEY);
            resetForm();
            return;
          }
          setHtml(draft.html ?? "");
          setSourceName(draft.sourceName ?? "");
          setSourceUrl(draft.sourceUrl ?? "");
          setTags(draft.tags ?? []);
          setAuthorsText(draft.authorsText ?? "");
          setShowAuthorsField(draft.showAuthorsField ?? false);
          setDraftBanner(true);
          return;
        }
      } catch {
        // corrupted draft — ignore
      }
      resetForm();
    }
  }, [editingFicha, open]);

  const resetForm = () => {
    setHtml("");
    setSourceName("");
    setSourceUrl("");
    setTags([]);
    setTagsInput("");
    setAuthorsText("");
    setShowAuthorsField(false);
    setDraftBanner(false);
    setDraftStatus("idle");
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    resetForm();
  };

  const handleCloseWithReset = () => {
    if (!editingFicha) {
      discardDraft();
    }
    onOpenChange(false);
  };

  // Debounced auto-save draft (new fichas only).
  useEffect(() => {
    if (editingFicha || !open) return;

    const draft: FormDraft = { html, sourceName, sourceUrl, tags, authorsText, showAuthorsField };

    if (!hasMeaningfulDraftContent(draft)) {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
      if (draftStatusTimerRef.current) window.clearTimeout(draftStatusTimerRef.current);
      localStorage.removeItem(DRAFT_KEY);
      setDraftStatus("idle");
      setDraftBanner(false);
      return;
    }

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    setDraftStatus("saving");
    draftTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch { /* quota exceeded — ignore */ }
      if (draftStatusTimerRef.current) window.clearTimeout(draftStatusTimerRef.current);
      setDraftStatus("saved");
      draftStatusTimerRef.current = window.setTimeout(() => setDraftStatus("idle"), 2500);
    }, 2000);
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
      if (draftStatusTimerRef.current) window.clearTimeout(draftStatusTimerRef.current);
    };
  }, [html, sourceName, sourceUrl, tags, authorsText, showAuthorsField, editingFicha, open]);

  const handleAddTag = () => {
    const nextTags = normalizeTags([...tags, tagsInput]);
    if (nextTags.length !== tags.length) {
      setTags(nextTags);
    }
    setTagsInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const normalizeAuthors = (input: string) => {
    const uniqueAuthors = new Set<string>();

    input
      .split(/[\n,;]+/)
      .map((author) => author.trim())
      .filter(Boolean)
      .forEach((author) => uniqueAuthors.add(author));

    return Array.from(uniqueAuthors);
  };

  const areStringArraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  };

  const handlePasteSourceUrl = async () => {
    if (!navigator.clipboard) {
      sourceUrlRef.current?.focus();
      setLinkPasteFeedback("Pega manualmente en el campo");
      return;
    }

    setIsPastingLink(true);
    try {
      const rawText = await navigator.clipboard.readText();
      if (!rawText.trim()) {
        setLinkPasteFeedback("El portapapeles está vacío");
        return;
      }
      setSourceUrl(rawText.trim());
      setLinkPasteFeedback(null);
    } catch {
      sourceUrlRef.current?.focus();
      setLinkPasteFeedback("Pega manualmente en el campo");
    } finally {
      setIsPastingLink(false);
      window.setTimeout(() => setLinkPasteFeedback(null), 1800);
    }
  };

  const parseHtml = (rawHtml: string) => {
    // The first block-level element's text is the title, the rest is content
    const div = document.createElement("div");
    div.innerHTML = rawHtml;
    const children = Array.from(div.children);
    const firstBlock = children[0];
    const title = firstBlock?.textContent?.trim() || "";
    // Content is everything after the first block
    const remainingBlocks = children.slice(1);
    const contentDiv = document.createElement("div");
    remainingBlocks.forEach(b => contentDiv.appendChild(b.cloneNode(true)));
    const content = contentDiv.innerHTML || "";
    return { title, content };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, content } = parseHtml(html);
    if (!title) return;

    const slug = editingFicha?.public_slug ||
      (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36));

    const fichaData = {
      title,
      content,
      source_name: sourceName.trim(),
      source_url: sourceUrl.trim() || null,
      authors: showAuthorsField ? normalizeAuthors(authorsText) : [],
      tags: normalizeTags(tags),
      is_public: true,
      public_slug: slug,
    };

    if (editingFicha) {
      const existingTags = normalizeTags(editingFicha.tags);
      const existingAuthors = editingFicha.authors || [];
      const nextTags = fichaData.tags;
      const nextAuthors = fichaData.authors;

      const hasChanges =
        editingFicha.title !== fichaData.title ||
        (editingFicha.content || "") !== fichaData.content ||
        editingFicha.source_name !== fichaData.source_name ||
        (editingFicha.source_url || null) !== fichaData.source_url ||
        editingFicha.is_public !== fichaData.is_public ||
        editingFicha.public_slug !== fichaData.public_slug ||
        !areStringArraysEqual(existingTags, nextTags) ||
        !areStringArraysEqual(existingAuthors, nextAuthors);

      if (!hasChanges) {
        onOpenChange(false);
        resetForm();
        return;
      }

      await updateFicha.mutateAsync({ id: editingFicha.id, ...fichaData });
    } else {
      const createdFicha = await createFicha.mutateAsync(fichaData);
      if (createdFicha?.id) {
        onCreated?.(createdFicha.id);
      }
      localStorage.removeItem(DRAFT_KEY);
    }

    onOpenChange(false);
    resetForm();
  };

  const { title } = parseHtml(html);

  useEffect(() => {
    if (!open) return;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === "textarea" || tag === "select";
    };

    const handleEnterToSubmit = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;

      const hasShortcutModifier = event.metaKey || event.ctrlKey;

      if (hasShortcutModifier) {
        if (event.altKey || event.shiftKey) return;
        if (!title || createFicha.isPending || updateFicha.isPending) return;

        event.preventDefault();
        const form = document.querySelector('form[data-ficha-form="true"]') as HTMLFormElement | null;
        form?.requestSubmit();
        return;
      }

      if (event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;

      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement &&
        activeElement.type !== "button" &&
        activeElement.type !== "submit";

      if (isTextInput) return;

      if (!title || createFicha.isPending || updateFicha.isPending) return;

      event.preventDefault();
      const form = document.querySelector('form[data-ficha-form="true"]') as HTMLFormElement | null;
      form?.requestSubmit();
    };

    document.addEventListener("keydown", handleEnterToSubmit, true);
    return () => document.removeEventListener("keydown", handleEnterToSubmit, true);
  }, [open, title, createFicha.isPending, updateFicha.isPending]);

  const hasContent = Boolean(html || sourceName || sourceUrl || tags.length || authorsText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 left-0 top-0 h-[100dvh] max-h-[100dvh] max-w-none translate-x-0 translate-y-0 overflow-y-auto overscroll-contain rounded-none border-0 p-3 sm:left-[50%] sm:top-[50%] sm:h-[min(42rem,calc(100dvh-2rem))] sm:max-h-[min(42rem,calc(100dvh-2rem))] sm:max-w-[40rem] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:overflow-hidden sm:rounded-lg sm:border sm:border-border/70 sm:p-5"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => { if (hasContent) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (hasContent) e.preventDefault(); }}
      >
        <DialogClose
          className="absolute right-4 top-4 z-30 hidden rounded-sm text-destructive/85 opacity-90 ring-offset-background transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:ring-offset-2 disabled:pointer-events-none sm:inline-flex"
          onClick={handleCloseWithReset}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>

        <DialogTitle className="sr-only">
          {editingFicha ? "Editar ficha" : "Nueva ficha"}
        </DialogTitle>

        <form onSubmit={handleSubmit} className="space-y-3 sm:flex sm:h-full sm:flex-col sm:space-y-3" data-ficha-form="true">
          <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Contenido (la primera línea será el título)
              </Label>
              {/* Draft status — right-aligned, very subtle */}
              {!editingFicha && draftStatus !== "idle" && (
                <span
                  className="ml-auto mr-6 flex items-center text-[10px] text-muted-foreground/40 transition-opacity duration-500"
                  title={draftStatus === "saving" ? "Guardando" : "Guardado"}
                  aria-live="polite"
                >
                  <Save className="w-2.5 h-2.5" />
                  <span className="sr-only">{draftStatus === "saving" ? "Guardando" : "Guardado"}</span>
                </span>
              )}
            </div>
            <div className="relative mt-1 sm:min-h-0 sm:flex-1">
              <DialogClose
                className="absolute right-0.5 top-0.5 z-30 inline-flex h-8 w-8 items-center justify-center rounded-sm text-destructive/85 opacity-90 ring-offset-background transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:ring-offset-2 disabled:pointer-events-none sm:hidden"
                onClick={handleCloseWithReset}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </DialogClose>
              <TiptapEditor
                ref={editorRef}
                content={html}
                onChange={setHtml}
                placeholder="Título en la primera línea… Luego desarrolla el contenido"
                className="h-full"
              />
            </div>
          </div>

          <div>
            <div className="hidden items-center gap-2 sm:flex">
              <Label htmlFor="sourceName" className="text-xs font-medium text-muted-foreground">Fuente</Label>
              <Button
                type="button"
                variant="ghost"
                className="h-6 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowAuthorsField((prev) => !prev)}
                title="Mostrar campo autores"
              >
                {showAuthorsField ? "Ocultar autores" : "(+ añadir autores)"}
              </Button>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2 z-10 text-xs font-medium text-muted-foreground sm:hidden">
                Fuente
              </span>
            <textarea
              id="sourceName"
              ref={sourceNameRef}
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Nombre de la fuente"
              rows={2}
              className="mt-1 flex w-full rounded-sm border border-input bg-background px-3 py-2 pt-6 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none sm:h-[72px] sm:pt-2 sm:text-sm"
            />
            </div>
          </div>

          {showAuthorsField && (
            <div>
              <Label className="hidden text-xs font-medium text-muted-foreground sm:block">Autores</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2 z-10 text-xs font-medium text-muted-foreground sm:hidden">
                  Autores
                </span>
              <textarea
                ref={authorsRef}
                value={authorsText}
                onChange={(e) => setAuthorsText(e.target.value)}
                rows={2}
                className="mt-1 flex w-full rounded-sm border border-input bg-background px-3 py-2 pt-6 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none sm:h-10 sm:pt-2"
              />
              </div>
            </div>
          )}

          <div>
            <div className="hidden items-center justify-between gap-2 sm:flex">
              <Label htmlFor="sourceUrl" className="text-xs font-medium text-muted-foreground">Link de la fuente</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePasteSourceUrl}
                disabled={isPastingLink}
                className="h-5 px-1.5 text-[11px] font-medium leading-none text-muted-foreground hover:text-foreground"
                title="Pegar link del portapapeles"
              >
                <ClipboardPaste className="mr-1 h-3 w-3" />
                {isPastingLink ? "Pegando..." : "Pegar link"}
              </Button>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2 z-10 text-xs font-medium text-muted-foreground sm:hidden">
                Link de la fuente
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePasteSourceUrl}
                disabled={isPastingLink}
                className="absolute right-2 top-1.5 h-5 px-1.5 text-[11px] font-medium leading-none text-muted-foreground hover:text-foreground sm:hidden"
                title="Pegar link del portapapeles"
              >
                <ClipboardPaste className="mr-1 h-3 w-3" />
                {isPastingLink ? "Pegando..." : "Pegar"}
              </Button>
            {linkPasteFeedback && <p className="mt-1 text-[11px] text-muted-foreground">{linkPasteFeedback}</p>}
            <textarea
              id="sourceUrl"
              ref={sourceUrlRef}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              rows={2}
              className="mt-1 flex w-full rounded-sm border border-input bg-background px-3 py-2 pt-6 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none sm:h-[72px] sm:pt-2 sm:text-sm"
            />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="hidden text-xs font-medium text-muted-foreground sm:block">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {orderTagsForDisplay(tags).map((tag) => (
                <span
                  key={tag}
                  className={`tag-hop inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all duration-100 hover:-translate-y-px ${
                    isArchivedTag(tag)
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-badge text-badge-foreground"
                  }`}
                >
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              ref={tagsInputRef}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder="Añadir tag"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              name="manual-tags"
              className="rounded-sm text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="pt-2">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <Button type="submit" disabled={!title} className="h-11 w-full sm:h-9 sm:w-auto">
                {editingFicha ? "Guardar" : "Crear ficha"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleCloseWithReset} className="h-11 w-full sm:h-9 sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FichaForm;
