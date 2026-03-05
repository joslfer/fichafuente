-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fichas table
CREATE TABLE public.fichas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  data_date DATE,
  quote TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT UNIQUE,
  use_count INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  additional_links JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.fichas ADD CONSTRAINT fichas_content_length CHECK (length(content) <= 500);
ALTER TABLE public.fichas ADD CONSTRAINT fichas_title_length CHECK (length(title) <= 200);

-- Enable RLS
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own fichas"
  ON public.fichas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public fichas by slug"
  ON public.fichas FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own fichas"
  ON public.fichas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fichas"
  ON public.fichas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fichas"
  ON public.fichas FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_fichas_user_id ON public.fichas(user_id);
CREATE INDEX idx_fichas_tags ON public.fichas USING GIN(tags);
CREATE INDEX idx_fichas_public_slug ON public.fichas(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_fichas_updated_at ON public.fichas(updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment visit count (callable without auth for public fichas)
CREATE OR REPLACE FUNCTION public.increment_visit_count(ficha_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fichas
  SET visit_count = visit_count + 1
  WHERE public_slug = ficha_slug AND is_public = true;
END;
$$;

-- Function to increment use count
CREATE OR REPLACE FUNCTION public.increment_use_count(ficha_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.fichas
  SET use_count = use_count + 1
  WHERE id = ficha_id AND user_id = auth.uid()
  RETURNING use_count INTO new_count;
  RETURN new_count;
END;
$$;