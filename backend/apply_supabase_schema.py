import os
from pathlib import Path
from urllib.parse import quote

import re

import psycopg


def load_database_url() -> str:
    env_path = Path(__file__).with_name('.env')
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8').splitlines():
            if line.startswith('DATABASE_URL='):
                return line.split('=', 1)[1].strip()
    return os.getenv('DATABASE_URL', '').strip()


def main() -> None:
    db_url = load_database_url()
    if not db_url:
        raise RuntimeError('DATABASE_URL is missing in backend/.env')

    schema_path = Path(__file__).with_name('supabase_schema.sql')
    schema_sql = schema_path.read_text(encoding='utf-8')

    candidate_urls = [db_url]
    password_match = re.match(r"^postgresql://([^:]+):([^@]+)@(.+)$", db_url)
    if password_match:
        user = password_match.group(1)
        password = password_match.group(2)
        rest = password_match.group(3)
        if password.startswith("[") and password.endswith("]"):
            fixed_password = quote(password[1:-1], safe="")
            candidate_urls.append(f"postgresql://{user}:{fixed_password}@{rest}")

    last_error: Exception | None = None
    tables: list[str] = []
    for url in candidate_urls:
        try:
            with psycopg.connect(url) as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(schema_sql)
                    cur.execute(
                        """
                        select table_name
                        from information_schema.tables
                        where table_schema = 'public'
                        order by table_name
                        """
                    )
                    tables = [row[0] for row in cur.fetchall()]
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    if last_error and not tables:
        raise last_error

    print('Schema applied successfully.')
    print('Public tables:')
    for name in tables:
        print(f'- {name}')


if __name__ == '__main__':
    main()
