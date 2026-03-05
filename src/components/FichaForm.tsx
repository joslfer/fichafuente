import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ficha, useCreateFicha, useUpdateFicha } from "@/hooks/useFichas";
import TiptapEditor from "@/components/TiptapEditor";

type FichaFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFicha?: Ficha | null;
};

const FichaForm = ({ open, onOpenChange, editingFicha }: FichaFormProps) => {
  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha();

  const [html, setHtml] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (editingFicha) {
      const fullHtml = editingFicha.content
        ? `<p><strong>${editingFicha.title}</strong></p>${editingFicha.content}`
        : `<p><strong>${editingFicha.title}</strong></p>`;
      setHtml(fullHtml);
      setSourceName(editingFicha.source_name);
      setSourceUrl(editingFicha.source_url || "");
      setTags(editingFicha.tags || []);
    } else {
      resetForm();
    }
  }, [editingFicha, open]);

  const resetForm = () => {
    setHtml("");
    setSourceName("");
    setSourceUrl("");
    setTags([]);
    setTagsInput("");
  };

  const handleAddTag = () => {
    const tag = tagsInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
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
      tags,
      is_public: true,
      public_slug: slug,
    };

    if (editingFicha) {
      await updateFicha.mutateAsync({ id: editingFicha.id, ...fichaData });
    } else {
      await createFicha.mutateAsync(fichaData);
    }

    onOpenChange(false);
    resetForm();
  };

  const { title } = parseHtml(html);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {editingFicha ? "Editar ficha" : "Nueva ficha"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              Contenido (la primera línea será el título)
            </Label>
            <div className="mt-1">
              <TiptapEditor content={html} onChange={setHtml} />
            </div>
          </div>

          <div>
            <Label htmlFor="sourceName" className="text-xs font-medium text-muted-foreground">Fuente</Label>
            <textarea
              id="sourceName"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Nombre de la fuente"
              rows={2}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div>
            <Label htmlFor="sourceUrl" className="text-xs font-medium text-muted-foreground">Link de la fuente</Label>
            <textarea
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              rows={2}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-badge text-badge-foreground"
                >
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder="Añadir tag y pulsar Enter"
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title}>
              {editingFicha ? "Guardar" : "Crear ficha"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FichaForm;
