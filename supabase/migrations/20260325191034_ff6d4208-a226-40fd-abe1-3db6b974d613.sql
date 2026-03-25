-- Create ai_provider_configs table to store provider settings per user
CREATE TABLE public.ai_provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  selected_model TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  connection_status TEXT NOT NULL DEFAULT 'idle',
  extra_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  technology TEXT NOT NULL,
  vendor TEXT DEFAULT '',
  version TEXT DEFAULT '',
  category TEXT DEFAULT '',
  output_language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  control_count INTEGER DEFAULT 0,
  source_count INTEGER DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sources table
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'url',
  name TEXT NOT NULL,
  url TEXT,
  file_name TEXT,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tags TEXT[] DEFAULT '{}',
  preview TEXT DEFAULT '',
  confidence NUMERIC DEFAULT 0,
  origin TEXT DEFAULT '',
  extracted_content TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create controls table
CREATE TABLE public.controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  control_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  applicability TEXT DEFAULT '',
  security_risk TEXT DEFAULT '',
  criticality TEXT NOT NULL DEFAULT 'medium',
  default_behavior_limitations TEXT DEFAULT '',
  automation TEXT DEFAULT '',
  "references" TEXT[] DEFAULT '{}',
  framework_mappings TEXT[] DEFAULT '{}',
  threat_scenarios JSONB DEFAULT '[]',
  source_traceability JSONB DEFAULT '[]',
  confidence_score NUMERIC DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT DEFAULT '',
  version INTEGER DEFAULT 1,
  category TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_provider_configs
CREATE POLICY "Users can view their own AI configs" ON public.ai_provider_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own AI configs" ON public.ai_provider_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AI configs" ON public.ai_provider_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AI configs" ON public.ai_provider_configs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for sources
CREATE POLICY "Users can view their own sources" ON public.sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sources" ON public.sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sources" ON public.sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sources" ON public.sources FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for controls
CREATE POLICY "Users can view their own controls" ON public.controls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own controls" ON public.controls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own controls" ON public.controls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own controls" ON public.controls FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at BEFORE UPDATE ON public.ai_provider_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON public.controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('source-documents', 'source-documents', false);
CREATE POLICY "Users can upload their own docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own docs" ON storage.objects FOR SELECT USING (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own docs" ON storage.objects FOR DELETE USING (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);