
create extension if not exists pgcrypto;

-- =========================================================
-- 1. INSTITUTIONS
-- =========================================================

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  institution_type text not null check (
    institution_type in (
      'university',
      'polytechnic',
      'college_of_education',
      'federal_college_of_education',
      'monotechnic',
      'other'
    )
  ),
  ownership text not null check (
    ownership in ('federal', 'state', 'private', 'other')
  ),
  state text not null,
  local_government_area text,
  town text,
  address text,
  campuses jsonb not null default '[]'::jsonb,
  official_website text,
  admissions_url text,
  jamb_recognition_status text not null default 'unverified'
    check (
      jamb_recognition_status in (
        'unverified', 'verified', 'not_verified', 'discontinued'
      )
    ),
  verification_source_url text,
  last_verified_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutions_state_idx
  on public.institutions (state);

create index if not exists institutions_type_idx
  on public.institutions (institution_type);

create index if not exists institutions_published_idx
  on public.institutions (is_published);

create index if not exists institutions_name_idx
  on public.institutions using gin (to_tsvector('english', name));


-- =========================================================
-- 2. ADMISSION PROGRAMMES / COURSES
-- =========================================================

create table if not exists public.admission_programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null
    references public.institutions(id) on delete cascade,
  course_name text not null,
  course_slug text not null,
  faculty_or_school text,
  department text,
  award_type text,
  study_mode text,
  duration_years numeric(3,1),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, course_slug)
);

create index if not exists admission_programmes_course_idx
  on public.admission_programmes (course_name);

create index if not exists admission_programmes_institution_idx
  on public.admission_programmes (institution_id);


-- =========================================================
-- 3. UTME SUBJECT COMBINATIONS AND O'LEVEL REQUIREMENTS
-- =========================================================

create table if not exists public.admission_subject_requirements (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null
    references public.admission_programmes(id) on delete cascade,
  admission_year integer not null,
  utme_subjects jsonb not null default '[]'::jsonb,
  olevel_requirements jsonb not null default '[]'::jsonb,
  accepted_sittings text,
  additional_requirements text,
  source_url text,
  verification_status text not null default 'unverified'
    check (
      verification_status in ('unverified', 'verified', 'needs_review')
    ),
  last_verified_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (programme_id, admission_year)
);

create index if not exists admission_subject_requirements_year_idx
  on public.admission_subject_requirements (admission_year);

create index if not exists admission_subject_requirements_status_idx
  on public.admission_subject_requirements (verification_status);


-- =========================================================
-- 4. CUT-OFF MARKS
-- =========================================================

create table if not exists public.admission_cutoff_marks (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null
    references public.admission_programmes(id) on delete cascade,
  admission_year integer not null,
  cutoff_type text not null check (
    cutoff_type in (
      'general',
      'departmental',
      'merit',
      'catchment',
      'other'
    )
  ),
  score numeric(6,2),
  category text,
  notes text,
  source_url text,
  verification_status text not null default 'unverified'
    check (
      verification_status in ('unverified', 'verified', 'needs_review')
    ),
  last_verified_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    programme_id,
    admission_year,
    cutoff_type,
    category
  )
);

create index if not exists admission_cutoff_marks_year_idx
  on public.admission_cutoff_marks (admission_year);

create index if not exists admission_cutoff_marks_score_idx
  on public.admission_cutoff_marks (score);


-- =========================================================
-- 5. ADMISSION ELIGIBILITY AND SCREENING RULES
-- =========================================================

create table if not exists public.admission_eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null
    references public.admission_programmes(id) on delete cascade,
  admission_year integer not null,
  entry_route text not null default 'UTME'
    check (entry_route in ('UTME', 'Direct Entry', 'other')),
  screening_method text,
  minimum_age integer,
  minimum_utme_score integer,
  additional_rules jsonb not null default '[]'::jsonb,
  notes text,
  source_url text,
  verification_status text not null default 'unverified'
    check (
      verification_status in ('unverified', 'verified', 'needs_review')
    ),
  last_verified_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (programme_id, admission_year, entry_route)
);

create index if not exists admission_eligibility_rules_year_idx
  on public.admission_eligibility_rules (admission_year);


-- =========================================================
-- 6. SOURCE VERIFICATION HISTORY
-- =========================================================

create table if not exists public.admission_source_checks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid
    references public.institutions(id) on delete set null,
  programme_id uuid
    references public.admission_programmes(id) on delete set null,
  source_url text not null,
  source_name text,
  checked_at timestamptz not null default now(),
  checked_by text,
  check_result text not null default 'pending'
    check (
      check_result in ('pending', 'verified', 'changed', 'unavailable')
    ),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists admission_source_checks_checked_at_idx
  on public.admission_source_checks (checked_at desc);


-- =========================================================
-- 7. BLOG CATEGORIES
-- =========================================================

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);


-- =========================================================
-- 8. BLOG POSTS
-- =========================================================

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid
    references public.blog_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  cover_image_url text,
  author_name text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx
  on public.blog_posts (status);

create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc);


-- =========================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.institutions enable row level security;
alter table public.admission_programmes enable row level security;
alter table public.admission_subject_requirements enable row level security;
alter table public.admission_cutoff_marks enable row level security;
alter table public.admission_eligibility_rules enable row level security;
alter table public.admission_source_checks enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;


-- =========================================================
-- 10. PUBLIC READ POLICIES
-- Create each policy only if it does not already exist.
-- No public INSERT, UPDATE or DELETE policies are added.
-- =========================================================

do $$
begin

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'institutions'
      and policyname = 'Public read published institutions'
  ) then
    create policy "Public read published institutions"
      on public.institutions for select
      to anon, authenticated
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admission_programmes'
      and policyname = 'Public read published programmes'
  ) then
    create policy "Public read published programmes"
      on public.admission_programmes for select
      to anon, authenticated
      using (
        is_published = true
        and exists (
          select 1
          from public.institutions i
          where i.id = institution_id
            and i.is_published = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admission_subject_requirements'
      and policyname = 'Public read published subject requirements'
  ) then
    create policy "Public read published subject requirements"
      on public.admission_subject_requirements for select
      to anon, authenticated
      using (
        is_published = true
        and verification_status = 'verified'
        and exists (
          select 1
          from public.admission_programmes p
          join public.institutions i on i.id = p.institution_id
          where p.id = programme_id
            and p.is_published = true
            and i.is_published = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admission_cutoff_marks'
      and policyname = 'Public read published cutoff marks'
  ) then
    create policy "Public read published cutoff marks"
      on public.admission_cutoff_marks for select
      to anon, authenticated
      using (
        is_published = true
        and verification_status = 'verified'
        and exists (
          select 1
          from public.admission_programmes p
          join public.institutions i on i.id = p.institution_id
          where p.id = programme_id
            and p.is_published = true
            and i.is_published = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admission_eligibility_rules'
      and policyname = 'Public read published eligibility rules'
  ) then
    create policy "Public read published eligibility rules"
      on public.admission_eligibility_rules for select
      to anon, authenticated
      using (
        is_published = true
        and verification_status = 'verified'
        and exists (
          select 1
          from public.admission_programmes p
          join public.institutions i on i.id = p.institution_id
          where p.id = programme_id
            and p.is_published = true
            and i.is_published = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_categories'
      and policyname = 'Public read blog categories'
  ) then
    create policy "Public read blog categories"
      on public.blog_categories for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.blog_posts bp
          where bp.category_id = id
            and bp.status = 'published'
            and bp.published_at is not null
            and bp.published_at <= now()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Public read published blog posts'
  ) then
    create policy "Public read published blog posts"
      on public.blog_posts for select
      to anon, authenticated
      using (
        status = 'published'
        and published_at is not null
        and published_at <= now()
      );
  end if;

end
$$;

