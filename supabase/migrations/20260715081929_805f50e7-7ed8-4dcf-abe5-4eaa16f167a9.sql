
CREATE OR REPLACE FUNCTION public.bulk_upsert_galleries(_payload jsonb)
RETURNS TABLE(updated_count int, inserted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upd int := 0;
  ins int := 0;
BEGIN
  CREATE TEMP TABLE _incoming ON COMMIT DROP AS
  SELECT
    (r->>'name')::text AS name,
    NULLIF(r->>'city','')::text AS city,
    NULLIF(r->>'country','')::text AS country,
    NULLIF(r->>'established_year','')::int AS established_year,
    NULLIF(r->>'rank','')::int AS rank,
    NULLIF(r->>'email','')::text AS email,
    NULLIF(r->>'phone','')::text AS phone
  FROM jsonb_array_elements(_payload) AS r;

  WITH matched AS (
    UPDATE public.galleries g
    SET rank = i.rank,
        email = COALESCE(i.email, g.email),
        phone = COALESCE(i.phone, g.phone),
        country = COALESCE(g.country, i.country),
        established_year = COALESCE(g.established_year, i.established_year)
    FROM _incoming i
    WHERE lower(trim(g.name)) = lower(trim(i.name))
      AND lower(trim(coalesce(g.city,''))) = lower(trim(coalesce(i.city,'')))
    RETURNING i.name, i.city
  )
  SELECT count(*) INTO upd FROM matched;

  WITH matched AS (
    SELECT lower(trim(g.name)) AS n, lower(trim(coalesce(g.city,''))) AS c
    FROM public.galleries g
    JOIN _incoming i
      ON lower(trim(g.name)) = lower(trim(i.name))
     AND lower(trim(coalesce(g.city,''))) = lower(trim(coalesce(i.city,'')))
  ),
  new_rows AS (
    SELECT i.* FROM _incoming i
    WHERE NOT EXISTS (
      SELECT 1 FROM matched m
      WHERE m.n = lower(trim(i.name))
        AND m.c = lower(trim(coalesce(i.city,'')))
    )
  ),
  inserted AS (
    INSERT INTO public.galleries (name, city, country, established_year, rank, email, phone)
    SELECT name, city, country, established_year, rank, email, phone FROM new_rows
    RETURNING 1
  )
  SELECT count(*) INTO ins FROM inserted;

  RETURN QUERY SELECT upd, ins;
END $$;

REVOKE ALL ON FUNCTION public.bulk_upsert_galleries(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_galleries(jsonb) TO service_role;
