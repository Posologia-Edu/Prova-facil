import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, TestTube, ImageIcon, File } from "lucide-react";

interface Material {
  id: string;
  title: string;
  type: string;
  content: string | null;
  file_url: string | null;
}

interface Props {
  materials: Material[];
}

const ICONS: Record<string, any> = {
  prescription: FileText,
  lab_result: TestTube,
  imaging: ImageIcon,
  other: File,
};

const TYPE_COLORS: Record<string, string> = {
  prescription: "bg-blue-100 text-blue-700 border-blue-200",
  lab_result: "bg-green-100 text-green-700 border-green-200",
  imaging: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-muted text-muted-foreground border-border",
};

export function OsceMaterialViewer({ materials }: Props) {
  const [selected, setSelected] = useState<Material | null>(null);

  if (!materials || materials.length === 0) return null;

  return (
    <>
      {/* Floating icons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-40">
        {materials.map(mat => {
          const Icon = ICONS[mat.type] || File;
          const colorClass = TYPE_COLORS[mat.type] || TYPE_COLORS.other;
          return (
            <button
              key={mat.id}
              onClick={() => setSelected(mat)}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${colorClass}`}
              title={mat.title}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      {/* Expanded view */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const Icon = ICONS[selected.type] || File;
                return <Icon className="h-5 w-5" />;
              })()}
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.content && (
              <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg border">
                {selected.content}
              </div>
            )}
            {selected?.file_url && (
              <div>
                {selected.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={selected.file_url} alt={selected.title} className="w-full rounded-lg" />
                ) : (
                  <iframe src={selected.file_url} className="w-full h-96 rounded-lg border" title={selected.title} />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
