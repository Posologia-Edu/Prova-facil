import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuestionImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  compact?: boolean;
}

export default function QuestionImageUploader({
  images,
  onChange,
  maxImages = 5,
  compact = false,
}: QuestionImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Faça login para enviar imagens.");
      return;
    }

    setUploading(true);
    const newImages = [...images];

    for (const file of Array.from(files)) {
      if (newImages.length >= maxImages) {
        toast.warning(`Máximo de ${maxImages} imagens atingido.`);
        break;
      }

      const ext = file.name.split(".").pop() || "png";
      const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("question-images")
        .upload(path, file, { contentType: file.type });

      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("question-images")
        .getPublicUrl(path);

      newImages.push(urlData.publicUrl);
    }

    onChange(newImages);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt="" className="h-10 w-10 rounded border object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt={`Imagem ${i + 1}`}
                className="h-24 w-auto rounded-lg border object-contain max-w-[200px]"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length < maxImages && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Adicionar Imagem"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      )}
    </div>
  );
}
