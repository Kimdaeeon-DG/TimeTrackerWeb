-- Create work_schedules table
CREATE TABLE IF NOT EXISTS public.work_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    planned_hours NUMERIC(5,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, date)
);

-- Add RLS policies
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- Policy for select (read)
CREATE POLICY "Users can view their own work schedules" 
ON public.work_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for insert
CREATE POLICY "Users can create their own work schedules" 
ON public.work_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for update
CREATE POLICY "Users can update their own work schedules" 
ON public.work_schedules 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for delete
CREATE POLICY "Users can delete their own work schedules" 
ON public.work_schedules 
FOR DELETE 
USING (auth.uid() = user_id);
