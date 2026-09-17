CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  industry text NOT NULL,
  size_band text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  edit_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  role_title text,
  function text NOT NULL DEFAULT 'Other',
  seniority text NOT NULL DEFAULT 'Individual contributor',
  tenure_band text NOT NULL DEFAULT 'Under 1 year',
  work_mode text NOT NULL DEFAULT 'Onsite',
  tools text[] NOT NULL DEFAULT '{}',
  rekey_pair text[],
  rekey_hours text,
  channel_routine text NOT NULL DEFAULT 'Email',
  channel_sameday text NOT NULL DEFAULT 'Email',
  channel_urgent text NOT NULL DEFAULT 'Phone call',
  hours_window text,
  hard_rule text,
  waits_on text,
  waited_on_by text,
  annoying_task text,
  scores jsonb NOT NULL DEFAULT '{"async":50,"collaborative":50,"improviser":50,"deliberate":50,"interrupt_averse":50,"process_skipper":50}'::jsonb,
  archetype text NOT NULL DEFAULT 'The Editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  company_name text,
  automate_first text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.companies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.respondents TO anon, authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.respondents TO service_role;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies are public" ON public.companies FOR SELECT USING (true);
CREATE POLICY "anyone can create a company" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update a company" ON public.companies FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "respondents are public" ON public.respondents FOR SELECT USING (true);
CREATE POLICY "anyone can create a respondent" ON public.respondents FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can update a respondent" ON public.respondents FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "anyone can submit a lead" ON public.leads FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER respondents_set_updated_at
BEFORE UPDATE ON public.respondents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.companies (id, code, name, industry, size_band)
VALUES ('11111111-1111-4111-8111-111111111111', 'HOLLIS', 'Hollis & Vance Law', 'Law', '6-12');

INSERT INTO public.respondents (company_id, first_name, role_title, function, seniority, tenure_band, work_mode, tools, rekey_pair, rekey_hours, channel_routine, channel_sameday, channel_urgent, hours_window, hard_rule, waits_on, waited_on_by, annoying_task, scores, archetype) VALUES
('11111111-1111-4111-8111-111111111111','Marguerite','Managing partner','Leadership','Founder or partner','7+ years','Hybrid',ARRAY['Outlook','Clio','QuickBooks','Google Calendar'],ARRAY['Clio','QuickBooks'],'1-2','Text message','Text message','Phone call','7am to 7pm ET','I don''t read email. Call or text.',NULL,'Dana','Signing off on invoices one at a time.','{"async":20,"collaborative":55,"improviser":70,"deliberate":25,"interrupt_averse":20,"process_skipper":75}','The Closer'),
('11111111-1111-4111-8111-111111111111','Dana','Partner','Leadership','Founder or partner','7+ years','Onsite',ARRAY['Outlook','Clio','Microsoft 365','SharePoint'],ARRAY['Clio','Microsoft 365'],'3-5','Email','Email','Phone call','9am to 6pm ET','No calls before 9am.','Marguerite','Tomas','Reformatting documents for filing.','{"async":80,"collaborative":25,"improviser":25,"deliberate":80,"interrupt_averse":80,"process_skipper":20}','The Anchor'),
('11111111-1111-4111-8111-111111111111','Luis','Associate attorney','Client service','Individual contributor','1-3 years','Hybrid',ARRAY['Outlook','Clio','Microsoft 365','Slack','Calendly'],ARRAY['Clio','Outlook'],'3-5','Slack or Teams','Slack or Teams','Text message','9am to 7pm ET','No meetings on Friday afternoons.','Marguerite','Aisha','Retyping intake notes into Clio.','{"async":75,"collaborative":35,"improviser":55,"deliberate":70,"interrupt_averse":60,"process_skipper":50}','The Editor'),
('11111111-1111-4111-8111-111111111111','Priya','Paralegal','Operations','Individual contributor','3-7 years','Onsite',ARRAY['Outlook','Clio','Microsoft 365','SharePoint','QuickBooks','Dropbox'],ARRAY['Clio','QuickBooks'],'6-10','Email','Slack or Teams','Phone call','8am to 5pm ET','Give me a day''s notice on filings.','Marguerite','Luis','Chasing signatures.','{"async":60,"collaborative":60,"improviser":15,"deliberate":80,"interrupt_averse":50,"process_skipper":10}','The Architect'),
('11111111-1111-4111-8111-111111111111','Tomas','Office manager','Finance & Admin','Lead or manager','3-7 years','Onsite',ARRAY['Outlook','QuickBooks','Google Calendar','Dropbox','Calendly'],ARRAY['QuickBooks','Outlook'],'3-5','In person','Phone call','Phone call','8am to 5pm ET','Come find me, don''t email twice.','Dana','Renee','Reconciling vendor receipts.','{"async":15,"collaborative":85,"improviser":50,"deliberate":40,"interrupt_averse":15,"process_skipper":50}','The Switchboard'),
('11111111-1111-4111-8111-111111111111','Aisha','Intake coordinator','Client service','Individual contributor','Under 1 year','Remote',ARRAY['Gmail','Slack','HubSpot','Calendly','Google Docs'],ARRAY['HubSpot','Clio'],'6-10','Slack or Teams','Slack or Teams','Phone call','9am to 6pm ET','No calls during intake blocks.','Luis',NULL,'Copying leads from HubSpot into Clio.','{"async":45,"collaborative":55,"improviser":80,"deliberate":20,"interrupt_averse":30,"process_skipper":80}','The Sprinter'),
('11111111-1111-4111-8111-111111111111','Ben','Marketing lead','Marketing','Lead or manager','1-3 years','Remote',ARRAY['Gmail','Slack','HubSpot','Google Docs','Notion','Google Drive'],ARRAY['HubSpot','Google Docs'],'1-2','Slack or Teams','Email','Text message','10am to 7pm ET','Keep mornings free for writing.','Dana',NULL,'Pulling the same campaign numbers every Monday.','{"async":85,"collaborative":30,"improviser":60,"deliberate":65,"interrupt_averse":65,"process_skipper":55}','The Editor'),
('11111111-1111-4111-8111-111111111111','Renee','Bookkeeper','Finance & Admin','Individual contributor','3-7 years','Remote',ARRAY['Gmail','QuickBooks','Xero','Google Drive','Dropbox'],ARRAY['Clio','QuickBooks'],'6-10','Email','Email','Phone call','8am to 4pm ET','Send questions in one batch, not five.','Tomas',NULL,'Re-entering matter costs into QuickBooks.','{"async":85,"collaborative":20,"improviser":25,"deliberate":75,"interrupt_averse":85,"process_skipper":25}','The Anchor');