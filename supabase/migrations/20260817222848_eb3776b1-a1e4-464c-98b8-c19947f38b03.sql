DELETE FROM public.correspondence_messages
WHERE subject IS NULL AND from_email IS NULL AND sent_at IS NULL
  AND coalesce(btrim(body_text), '') = '';

UPDATE public.correspondence_imports i
SET ingested_count = (SELECT count(*) FROM public.correspondence_messages m WHERE m.import_id = i.id),
    status = CASE WHEN (SELECT count(*) FROM public.correspondence_messages m WHERE m.import_id = i.id) = 0 THEN 'parsed' ELSE i.status END;