import psycopg
import apply_supabase_schema

def run():
    db_url = apply_supabase_schema.load_database_url()
    candidate_urls = [db_url]
    import re
    from urllib.parse import quote
    m = re.match(r"^postgresql://([^:]+):([^@]+)@(.+)$", db_url)
    if m:
        u, p, r = m.groups()
        if p.startswith("[") and p.endswith("]"):
            candidate_urls.append(f"postgresql://{u}:{quote(p[1:-1], safe='')}@{r}")
    
    for url in candidate_urls:
        try:
            with psycopg.connect(url) as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute("alter table public.profiles drop constraint if exists profiles_role_check;")
                    cur.execute("alter table public.oauth_login_profiles drop constraint if exists oauth_login_profiles_role_check;")
            print("Dropped constraints.")
            break
        except Exception as e:
            pass

if __name__ == "__main__":
    run()
