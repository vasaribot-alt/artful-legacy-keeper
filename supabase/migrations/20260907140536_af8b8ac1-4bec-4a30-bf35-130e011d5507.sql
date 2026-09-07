DROP FUNCTION IF EXISTS public.get_shared_portfolio(text);
CREATE FUNCTION public.get_shared_portfolio(_token text)
RETURNS TABLE(
  portfolio_id uuid,
  portfolio_name text,
  artwork_id uuid,
  title text,
  year integer,
  medium text,
  height numeric,
  width numeric,
  depth numeric,
  display_order integer,
  image_path text,
  image_paths text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    a.id,
    a.title,
    a.year,
    a.medium,
    a.height,
    a.width,
    a.depth,
    pa.display_order,
    (SELECT ai.storage_path FROM public.artwork_images ai
       WHERE ai.artwork_id = a.id
       ORDER BY ai.display_order
       LIMIT 1) AS image_path,
    (SELECT array_agg(ai.storage_path ORDER BY ai.display_order)
       FROM public.artwork_images ai
       WHERE ai.artwork_id = a.id) AS image_paths
  FROM public.portfolios p
  JOIN public.portfolio_artworks pa ON pa.portfolio_id = p.id
  JOIN public.artworks a ON a.id = pa.artwork_id
  WHERE p.share_token = _token
  ORDER BY pa.display_order;
$$;
REVOKE EXECUTE ON FUNCTION public.get_shared_portfolio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_portfolio(text) TO anon, authenticated;